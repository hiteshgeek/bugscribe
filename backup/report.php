<?php
// report.php - receives bug report JSON and stores into MySQL using .env credentials
header('Content-Type: application/json');

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
      http_response_code(500);
      echo json_encode(['ok' => false, 'error' => 'Database credentials not configured in .env']);
      exit;
}

// Connect to DB
$dsn = "mysql:host={$host};dbname={$db};charset=utf8mb4";
try {
      $pdo = new PDO($dsn, $user, $pass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
} catch (PDOException $e) {
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
            for ($i = 0; $i < count($files['name']); $i++) {
                  if ($files['error'][$i] !== UPLOAD_ERR_OK) continue;
                  $origName = basename($files['name'][$i]);
                  $tmp = $files['tmp_name'][$i];
                  $mime = $files['type'][$i];
                  $size = intval($files['size'][$i]);

                  $ext = pathinfo($origName, PATHINFO_EXTENSION);
                  $safeBase = preg_replace('/[^A-Za-z0-9_\-]/', '_', pathinfo($origName, PATHINFO_FILENAME));
                  if (function_exists('random_bytes')) {
                        $rand = bin2hex(random_bytes(6));
                  } else {
                        $rand = bin2hex(openssl_random_pseudo_bytes(6));
                  }
                  $newName = time() . '_' . $rand . ($ext ? '.' . $ext : '');
                  $dest = $uploadDir . DIRECTORY_SEPARATOR . $newName;

                  if (move_uploaded_file($tmp, $dest)) {
                        // Insert attachment metadata
                        $sql2 = "INSERT INTO attachments (report_id, original_name, saved_path, mime, size) VALUES (:report_id, :original_name, :saved_path, :mime, :size)";
                        $stmt2 = $pdo->prepare($sql2);
                        $stmt2->execute([
                              ':report_id' => $reportId,
                              ':original_name' => $origName,
                              ':saved_path' => 'uploads/' . $newName,
                              ':mime' => $mime,
                              ':size' => $size,
                        ]);
                  }
            }

            $pdo->commit();
            echo json_encode(['ok' => true, 'id' => $reportId]);
            exit;
      } catch (Exception $e) {
            try {
                  $pdo->rollBack();
            } catch (Exception $ex) {
            }
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => 'Upload failed: ' . $e->getMessage()]);
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
