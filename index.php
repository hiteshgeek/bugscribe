<?php
include_once __DIR__ . '/includes/functions.php';
?>

<!DOCTYPE html>
<html lang="en">

<head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Bugscribe – Modern Screenshot & Capture Library</title>
      <link rel="icon" href="/bugscribe/src/assets/images/bug.svg" />
      <meta
            name="description"
            content="Embeddable screenshot & capture UI: full-page, visible, selection, hotkeys, and more." />
      <link rel="stylesheet" href="<?php echo asset('main.css'); ?>" />
      <link rel="stylesheet" href="<?php echo asset('bugscribe.css'); ?>" />
      <script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js" defer></script>
</head>

<body>
      <img src="src/assets/images/image2.jpg" alt="" class='main_image'>

      <script type="module" src="<?= asset('bugscribe.js') ?>"></script>
      <script nomodule src="<?= asset('bugscribe.js', 'nomodule') ?>"></script>

      <script type="module" src="<?= asset('main.js') ?>"></script>
      <script nomodule src="<?php echo asset('main.js', 'nomodule'); ?>"></script>

</body>

</html>