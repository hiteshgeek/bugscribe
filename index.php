<?php
require_once __DIR__ . '/includes/functions.php';
?>
<!doctype html>
<html lang="en">

<head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>BugScribe — Visual Bug Reporting</title>
      <link rel="stylesheet" href="<?= asset('bugscribe.css') ?>">
      <link rel="stylesheet" href="<?= asset('main.css') ?>">
</head>

<body>
      <header class="site-header">
            <div class="container header-inner">
                  <a class="logo" href="/">BugScribe</a>
                  <nav class="site-nav" id="siteNav">
                        <a href="#product">Product</a>
                        <a href="#demo">Demo</a>
                        <a href="#features">Features</a>
                  </nav>
                  <div class="header-actions">
                        <button id="startTrialHeader" class="btn primary nav-cta">Start Free Trial</button>
                        <button id="navToggle" class="nav-toggle" aria-label="Toggle menu">☰</button>
                  </div>
            </div>
      </header>

      <main>
            <section class="hero">
                  <div class="container hero-inner">
                        <div class="hero-left">
                              <span class="badge">Beta · Free Trial</span>
                              <h1 class="hero-title">Visual bug reporting built for fast triage</h1>
                              <p class="lead">Capture screenshots, record your screen, annotate, and upload rich bug reports with thumbnails — embed anywhere.</p>
                              <div class="cta-row">
                                    <button class="btn primary" id="startTrial">Start Free Trial</button>
                                    <button class="btn outline" id="watchDemo">Watch Demo</button>
                              </div>
                        </div>
                        <div class="hero-right">
                              <div class="device">
                                    <img src="https://picsum.photos/seed/product/900/540" alt="Product screenshot">
                              </div>
                        </div>
                  </div>
            </section>

            <section id="features" class="section container">
                  <h2 class="section-title">What you get</h2>
                  <div class="grid features-grid">
                        <article class="card">
                              <h3>Instant Screenshots</h3>
                              <p>Full page, viewport or area capture with one click. Auto-generated thumbnails for quick triage.</p>
                        </article>
                        <article class="card">
                              <h3>Screen Recording</h3>
                              <p>Record short sessions using MediaRecorder and extract preview thumbnails automatically.</p>
                        </article>
                        <article class="card">
                              <h3>Upload & Progress</h3>
                              <p>AJAX uploads with progress, multiple attachments and server-side mapping.</p>
                        </article>
                  </div>
            </section>

            <section id="demo" class="section alt-bg">
                  <div class="container demo-inner">
                        <div class="demo-video card">
                              <video id="promoVideo" controls poster="https://picsum.photos/seed/video/900/500">
                                    <source src="https://samplelib.com/lib/preview/mp4/sample-5s.mp4" type="video/mp4">
                              </video>
                              <p class="small">Watch a short demo showing screenshot and report flows.</p>
                        </div>

                        <aside class="card specs">
                              <h4>Try it</h4>
                              <p>Use the testing controls to exercise screenshots, recordings, and report upload. Thumbnails appear below.</p>
                        </aside>
                  </div>
            </section>

            <section id="testing" class="section container">
                  <h2 class="section-title">Interactive Testing Area</h2>
                  <div class="panel card">
                        <div class="controls">
                              <button id="takeScreenshotBtn" class="btn">Take Full Screenshot</button>
                              <button id="screenshotVisibleBtn" class="btn outline">Take Visible Screenshot</button>
                              <button id="startRecordBtn" class="btn">Start/Stop Recording</button>
                              <button id="openReportBtn" class="btn outline">Open Report Modal</button>
                        </div>
                        <div id="screenshotPreviewContainer" class="previews"></div>
                  </div>
            </section>

            <!-- Pricing section removed per request -->
      </main>

      <footer class="site-footer">
            <div class="container">© <?= date('Y') ?> BugScribe — Visual bug reporting for teams and developers.</div>
      </footer>

      <!-- Persistent bug button is created by the Bugscribe library -->

      <!-- Report modal -->
      <div id="reportModal" class="modal hidden">
            <div class="modal-dialog card">
                  <button id="closeReportModal" class="modal-close">&times;</button>
                  <h3>Report a bug</h3>
                  <input id="reportUrl" class="form-control" placeholder="Page URL">
                  <textarea id="reportMessage" class="form-control" rows="4" placeholder="Describe the issue..."></textarea>
                  <div id="reportMediaList" class="previews"></div>
                  <div class="modal-actions">
                        <button id="submitReportBtn" class="btn primary">Submit</button>
                        <button id="cancelReportBtn" class="btn outline">Cancel</button>
                  </div>
            </div>
      </div>

      <script type="module" src="<?= asset('bugscribe.js') ?>"></script>
      <script nomodule src="<?= asset('bugscribe.js', 'nomodule') ?>"></script>
      <script src="<?= asset('main.js') ?>"></script>
</body>

</html>