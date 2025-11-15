<?php
// report.php - receives bug report JSON and stores into MySQL using .env credentials
header('Content-Type: application/json');

// Enable verbose errors for debugging (remove or restrict in production)
ini_set('display_errors', '1');
ini_set('display_startup_errors', '1');
error_reporting(E_ALL);

// simple logger to project file for debugging 500s
function report_log($msg)
{
      $logFile = __DIR__ . '/report_debug.log';
      $ts = date('Y-m-d H:i:s');
      @file_put_contents($logFile, "[$ts] " . $msg . "\n", FILE_APPEND | LOCK_EX);
}

// Secure hex generator with fallbacks for older PHP versions
function secure_random_hex($bytes = 6)
{
      if (is_int($bytes) && $bytes > 0) {
            if (function_exists('random_bytes')) {
                  return bin2hex(random_bytes($bytes));
            }
            if (function_exists('openssl_random_pseudo_bytes')) {
                  return bin2hex(openssl_random_pseudo_bytes($bytes));
            }
            // final fallback: pseudo-random using mt_rand
            $str = '';
            for ($i = 0; $i < $bytes; $i++) {
                  $str .= chr(mt_rand(0, 255));
            }
            return bin2hex($str);
      }
      return bin2hex(time() . rand());
}

// Map PHP upload error codes to human messages
function upload_error_message($code)
{
      switch ($code) {
            case UPLOAD_ERR_OK:
                  return 'No error.';
            case UPLOAD_ERR_INI_SIZE:
                  return 'The uploaded file exceeds the upload_max_filesize directive in php.ini.';
            case UPLOAD_ERR_FORM_SIZE:
                  return 'The uploaded file exceeds the MAX_FILE_SIZE directive specified in the HTML form.';
            case UPLOAD_ERR_PARTIAL:
                  return 'The uploaded file was only partially uploaded.';
            case UPLOAD_ERR_NO_FILE:
                  return 'No file was uploaded.';
            case UPLOAD_ERR_NO_TMP_DIR:
                  return 'Missing a temporary folder.';
            case UPLOAD_ERR_CANT_WRITE:
                  return 'Failed to write file to disk.';
            case UPLOAD_ERR_EXTENSION:
                  return 'A PHP extension stopped the file upload.';
            default:
                  return 'Unknown upload error code: ' . (int)$code;
      }
}

// Convert php.ini size like "2M" to bytes
function ini_size_to_bytes($val)
{
      $val = trim($val);
      $last = strtolower($val[strlen($val) - 1]);
      $num = (int)$val;
      switch ($last) {
            case 'g':
                  return $num * 1024 * 1024 * 1024;
            case 'm':
                  return $num * 1024 * 1024;
            case 'k':
                  return $num * 1024;
            default:
                  return (int)$val;
      }
}

// Read php.ini limits
$php_post_max = ini_get('post_max_size');
$php_upload_max = ini_get('upload_max_filesize');
$php_post_max_bytes = ini_size_to_bytes($php_post_max);
$php_upload_max_bytes = ini_size_to_bytes($php_upload_max);

// Optional MAX_UPLOAD_BYTES from .env (falls back to PHP upload_max_filesize)
$envMax = getenv('MAX_UPLOAD_BYTES');
$env_max_bytes = $envMax ? (int)preg_replace('/[^0-9]/', '', $envMax) : 0;
if ($env_max_bytes <= 0) {
      $env_max_bytes = $php_upload_max_bytes;
}

// Pre-check Content-Length against post_max_size to fail fast
if (isset($_SERVER['CONTENT_LENGTH'])) {
      $contentLen = (int) $_SERVER['CONTENT_LENGTH'];
      if ($contentLen > $php_post_max_bytes) {
            report_log('Request CONTENT_LENGTH ' . $contentLen . ' exceeds post_max_size ' . $php_post_max . ' (' . $php_post_max_bytes . ')');
            http_response_code(413);
            echo json_encode(['ok' => false, 'error' => 'Request body too large. post_max_size = ' . $php_post_max]);
            exit;
      }
}

// Simple .env loader (project root .env)
$envFile = __DIR__ . '/.env';
if (file_exists($envFile)) {
      $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
      foreach ($lines as $line) {
            if (strpos(trim($line), '#') === 0) continue;
            if (!strpos($line, '=')) continue;
            list($k, $v) = explode('=', $line, 2);
            $k = trim($k);
            $v = trim($v);
            if ($v && ($v[0] === '"' || $v[0] === "'")) {
                  $v = substr($v, 1, -1);
            }
            putenv("$k=$v");
            $_ENV[$k] = $v;
      }
}

$host = getenv('DB_HOST') ?: getenv('MYSQL_HOST');
$db   = getenv('DB_NAME') ?: getenv('MYSQL_DB');
$user = getenv('DB_USER') ?: getenv('MYSQL_USER');
$pass = getenv('DB_PASS') ?: getenv('MYSQL_PASS');

if (!$host || !$db || !$user) {
      report_log('Missing DB credentials: host=' . var_export($host, true) . ' db=' . var_export($db, true) . ' user=' . var_export($user, true));
      http_response_code(500);
      echo json_encode(['ok' => false, 'error' => 'Database credentials not configured in .env']);
      exit;
}

// Connect to DB
$dsn = "mysql:host={$host};dbname={$db};charset=utf8mb4";
try {
      $pdo = new PDO($dsn, $user, $pass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
} catch (PDOException $e) {
      report_log('DB connection failed: ' . $e->getMessage());
      http_response_code(500);
      echo json_encode(['ok' => false, 'error' => 'DB connection failed: ' . $e->getMessage()]);
      exit;
}

// If attachments are uploaded via multipart/form-data, handle file uploads
if (!empty($_FILES) && isset($_FILES['attachments'])) {
      $page_url = isset($_POST['page_url']) ? $_POST['page_url'] : '';
      $message = isset($_POST['message']) ? $_POST['message'] : '';

      // create uploads directory if missing
      $uploadDir = __DIR__ . '/uploads';
      if (!is_dir($uploadDir)) {
            @mkdir($uploadDir, 0755, true);
      }

      try {
            $pdo->beginTransaction();
            $sql = "INSERT INTO bug_reports (page_url, message) VALUES (:page_url, :message)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([':page_url' => $page_url, ':message' => $message]);
            $reportId = $pdo->lastInsertId();

            $files = $_FILES['attachments'];
            $thumbs = isset($_FILES['attachments_thumb']) ? $_FILES['attachments_thumb'] : null;
            $fileResults = [];
            // ensure thumbs directory exists
            $thumbDir = $uploadDir . DIRECTORY_SEPARATOR . 'thumbs';
            if (!is_dir($thumbDir)) {
                  @mkdir($thumbDir, 0755, true);
            }
            for ($i = 0; $i < count($files['name']); $i++) {
                  $fileResult = ['index' => $i, 'name' => $files['name'][$i], 'error' => $files['error'][$i]];
                  if ($files['error'][$i] !== UPLOAD_ERR_OK) {
                        // attach a readable message and optional hint for size issues
                        $errCode = $files['error'][$i];
                        $fileResult['error_code'] = $errCode;
                        $fileResult['error_msg'] = upload_error_message($errCode);
                        if ($errCode === UPLOAD_ERR_INI_SIZE || $errCode === UPLOAD_ERR_FORM_SIZE) {
                              $fileResult['hint'] = 'Check PHP settings: upload_max_filesize and post_max_size, and client-side limits.';
                              report_log('Upload size error for index ' . $i . ' name=' . $files['name'][$i] . ' POST_SIZE=' . (isset($_SERVER['CONTENT_LENGTH']) ? $_SERVER['CONTENT_LENGTH'] : 'n/a'));
                        } else {
                              report_log('Upload error for index ' . $i . ' name=' . $files['name'][$i] . ' code=' . $errCode);
                        }
                        $fileResults[] = $fileResult;
                        continue;
                  }
                  $origName = basename($files['name'][$i]);
                  $tmp = $files['tmp_name'][$i];
                  $mime = $files['type'][$i];
                  $size = intval($files['size'][$i]);

                  // Per-file size validation: check against PHP and env limits
                  if ($size > $php_upload_max_bytes) {
                        $fileResult['error_code'] = UPLOAD_ERR_INI_SIZE;
                        $fileResult['error_msg'] = 'File size ' . $size . ' bytes exceeds server upload_max_filesize (' . $php_upload_max . ')';
                        $fileResult['hint'] = 'Increase upload_max_filesize/post_max_size in php.ini or reduce file size.';
                        report_log('File too large for PHP limit: name=' . $files['name'][$i] . ' size=' . $size . ' php_upload_max=' . $php_upload_max);
                        $fileResults[] = $fileResult;
                        continue;
                  }
                  if ($env_max_bytes > 0 && $size > $env_max_bytes) {
                        $fileResult['error_code'] = 413;
                        $fileResult['error_msg'] = 'File size ' . $size . ' bytes exceeds configured MAX_UPLOAD_BYTES (' . $env_max_bytes . ')';
                        $fileResult['hint'] = 'Adjust server .env MAX_UPLOAD_BYTES or reduce file size.';
                        report_log('File too large for env limit: name=' . $files['name'][$i] . ' size=' . $size . ' env_max=' . $env_max_bytes);
                        $fileResults[] = $fileResult;
                        continue;
                  }

                  $ext = pathinfo($origName, PATHINFO_EXTENSION);
                  $safeBase = preg_replace('/[^A-Za-z0-9_\-]/', '_', pathinfo($origName, PATHINFO_FILENAME));
                  $rand = secure_random_hex(6);
                  $newName = time() . '_' . $rand . ($ext ? '.' . $ext : '');
                  $dest = $uploadDir . DIRECTORY_SEPARATOR . $newName;

                  $savedThumbPath = null;
                  // move main file
                  if (move_uploaded_file($tmp, $dest)) {
                        $fileResult['saved_path'] = 'uploads/' . $newName;
                        // handle thumbnail if provided at same index
                        if ($thumbs && isset($thumbs['name'][$i]) && isset($thumbs['error'][$i]) && $thumbs['error'][$i] === UPLOAD_ERR_OK) {
                              $origThumbName = basename($thumbs['name'][$i]);
                              $thumbTmp = $thumbs['tmp_name'][$i];
                              $thumbExt = pathinfo($origThumbName, PATHINFO_EXTENSION);
                              $thumbName = pathinfo($newName, PATHINFO_FILENAME) . '_thumb' . ($thumbExt ? '.' . $thumbExt : '.jpg');
                              $thumbDest = $thumbDir . DIRECTORY_SEPARATOR . $thumbName;
                              if (move_uploaded_file($thumbTmp, $thumbDest)) {
                                    $savedThumbPath = 'uploads/thumbs/' . $thumbName;
                                    $fileResult['saved_thumb_path'] = $savedThumbPath;
                              } else {
                                    $fileResult['thumb_move_error'] = true;
                              }
                        }
                        // Insert attachment metadata (include thumb path if available)
                        $sql2 = "INSERT INTO attachments (report_id, original_name, saved_path, saved_thumb_path, mime, size) VALUES (:report_id, :original_name, :saved_path, :saved_thumb_path, :mime, :size)";
                        $stmt2 = $pdo->prepare($sql2);
                        $stmt2->execute([
                              ':report_id' => $reportId,
                              ':original_name' => $origName,
                              ':saved_path' => 'uploads/' . $newName,
                              ':saved_thumb_path' => $savedThumbPath,
                              ':mime' => $mime,
                              ':size' => $size,
                        ]);
                        $fileResult['inserted'] = true;
                  } else {
                        $fileResult['move_error'] = true;
                  }
                  $fileResults[] = $fileResult;
            }

            $pdo->commit();
            // check for any file-level problems
            $hadErrors = false;
            foreach ($fileResults as $fr) {
                  if (!isset($fr['inserted']) || $fr['inserted'] !== true) {
                        $hadErrors = true;
                        break;
                  }
            }
            if ($hadErrors) {
                  report_log('One or more attachments failed to save: ' . var_export($fileResults, true));
                  http_response_code(500);
                  echo json_encode(['ok' => false, 'error' => 'Some files failed to save', 'files' => $fileResults]);
                  exit;
            }
            echo json_encode(['ok' => true, 'id' => $reportId, 'files' => $fileResults]);
            exit;
      } catch (Exception $e) {
            try {
                  $pdo->rollBack();
            } catch (Exception $ex) {
            }
            report_log('Exception during multipart handling: ' . $e->getMessage() . ' FILES: ' . var_export($_FILES, true) . ' POST: ' . var_export($_POST, true));
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => 'Upload failed: ' . $e->getMessage(), 'files' => isset($fileResults) ? $fileResults : null]);
            exit;
      }
}

// Fallback: accept JSON payload (legacy)
$raw = file_get_contents('php://input');
if (!$raw) {
      http_response_code(400);
      echo json_encode(['ok' => false, 'error' => 'Empty request']);
      exit;
}
$data = json_decode($raw, true);
if (!$data) {
      http_response_code(400);
      echo json_encode(['ok' => false, 'error' => 'Invalid JSON']);
      exit;
}

$page_url = isset($data['page_url']) ? $data['page_url'] : '';
$message = isset($data['message']) ? $data['message'] : '';
$media = isset($data['media']) ? $data['media'] : [];

// Store media JSON as text (use JSON type if MySQL supports it)
$mediaJson = json_encode($media);

try {
      $sql = "INSERT INTO bug_reports (page_url, message, media) VALUES (:page_url, :message, :media)";
      $stmt = $pdo->prepare($sql);
      $stmt->execute([':page_url' => $page_url, ':message' => $message, ':media' => $mediaJson]);
      $id = $pdo->lastInsertId();
      echo json_encode(['ok' => true, 'id' => $id]);
      exit;
} catch (PDOException $e) {
      http_response_code(500);
      echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
      exit;
}
