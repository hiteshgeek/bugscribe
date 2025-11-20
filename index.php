<?php
require_once __DIR__ . '/includes/functions.php';
?>

<!doctype html>
<html lang="en">

<head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <title>Bugscribe — Screenshot & Capture Library</title>
      <meta name="description" content="Embeddable screenshot UI: full-page, visible, selection — hotkeys and fallbacks." />
      <link rel="icon" href="/favicon.ico" />
      <!-- Font Awesome for icons (CDN for demo) -->
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
      <!-- Built CSS (your build should produce these files) -->
      <link rel="stylesheet" href="<?= asset('bugscribe.css') ?>">
      <link rel="stylesheet" href="<?= asset('main.css') ?>">
</head>

<body>
      <header class="site-header">
            <div class="container header-inner">
                  <div class="brand-row">
                        <a class="brand" href="/">Bugscribe</a>
                        <p class="tag">Embeddable screenshot & capture UI</p>
                  </div>

                  <div class="controls">
                        <button id="theme-toggle" class="theme-toggle" aria-pressed="false" title="Toggle theme">
                              <i class="fa-solid fa-circle-half-stroke"></i>
                              <span class="sr-only">Toggle theme</span>
                        </button>
                        <nav class="nav-actions">
                              <a class="btn btn-ghost" href="#features">Features</a>
                              <a class="btn btn-ghost" href="#embed">Embed</a>
                        </nav>
                  </div>
            </div>
      </header>

      <main class="container">
            <section class="hero">
                  <h1 class="hero-title">Capture, annotate, and share</h1>
                  <p class="hero-lead">Fast, embeddable screenshot capture with video-friendly snapshots, hotkeys, and graceful fallbacks.</p>

                  <div class="hero-actions">
                        <button id="btn-demo-full" class="btn btn-primary">Try Full Capture</button>
                        <button id="btn-demo-select" class="btn btn-outline">Try Selection</button>
                  </div>
            </section>

            <section id="features" class="cards">
                  <article class="card">
                        <h3>Flexible Capture Modes</h3>
                        <p>Full page, visible viewport, or selected area. Use keyboard shortcuts or UI buttons.</p>
                  </article>
                  <article class="card">
                        <h3>Video-Friendly</h3>
                        <p>Non-invasive video snapshots preserve playback and capture the current frame without pausing.</p>
                  </article>
                  <article class="card">
                        <h3>Robust Fallbacks</h3>
                        <p>Prefers <code>html2canvas</code> rendering with an interactive screen-share fallback for cross-origin content.</p>
                  </article>
            </section>

            <section id="embed" class="docs">
                  <h2>How to embed</h2>
                  <p>Include the built assets and initialize a single instance on your page.</p>
                  <pre><code>&lt;link rel="stylesheet" href="/bugscribe/dist/css/main-<hash>.css"&gt;
&lt;script type="module" src="/bugscribe/dist/js/bugscribe-<hash>.js"&gt;&lt;/script&gt;

&lt;script&gt;
  const inst = new Bugscribe();
  // programmatic capture
  // inst.captureFullPage();
&lt;/script&gt;
</code></pre>
            </section>

            <section id="pricing" class="pricing">
                  <h2>Pricing</h2>
                  <div class="pricing-grid">
                        <div class="price-card">
                              <h4>Free</h4>
                              <p>Open-source core - local preview and basic capture</p>
                        </div>
                        <div class="price-card highlight">
                              <h4>Pro</h4>
                              <p>$9 / month - cloud uploads, priority support</p>
                        </div>
                        <div class="price-card">
                              <h4>Enterprise</h4>
                              <p>Custom - on-premise, SSO, SLAs, integrations</p>
                        </div>
                  </div>
            </section>
      </main>

      <footer class="site-footer">
            <div class="container">© Bugscribe — Embeddable captures for the web</div>
      </footer>

      <!-- Library bundles -->
      <script type="module" src="<?= asset('bugscribe.js') ?>"></script>
      <script nomodule src="<?= asset('bugscribe.js', 'nomodule') ?>"></script>
      <!-- App script (classic) -->
      <script src="<?= asset('main.js') ?>"></script>
</body>

</html>