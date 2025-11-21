<?php
include_once __DIR__ . '/includes/functions.php';
?>

<!DOCTYPE html>
<html lang="en">

<head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Bugscribe – Modern Screenshot & Capture Library</title>
      <meta
            name="description"
            content="Embeddable screenshot & capture UI: full-page, visible, selection, hotkeys, and more." />
      <link rel="stylesheet" href="<?php echo asset('main.css'); ?>" />
      <link rel="stylesheet" href="<?php echo asset('bugscribe.css'); ?>" />
</head>

<body>
      <img src="src/assets/images/image1.jpg" alt="">

      <!-- <div class='bug-wrapper'>
            <button class='bug-btn bug-main' type='button'>1</button>
            <div class='bug-actions'>
                  <button class='bug-btn bug-screenshot' type='button'>2</button>
                  <button class='bug-btn bug-record' type='button'>3</button>
                  <button class='bug-btn bug-settings' type='button'>4</button>
            </div>
      </div> -->

      <script type="module" src="<?= asset('bugscribe.js') ?>"></script>
      <script nomodule src="<?= asset('bugscribe.js', 'nomodule') ?>"></script>

      <script type="module" src="<?= asset('main.js') ?>"></script>
      <script nomodule src="<?php echo asset('main.js', 'nomodule'); ?>"></script>

</body>

</html>