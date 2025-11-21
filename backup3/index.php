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
      <!-- Bootstrap 5 CSS -->
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet" />
      <!-- Font Awesome 7 -->
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@7.0.0/css/all.min.css">
      <!-- Custom compiled CSS -->
      <link rel="stylesheet" href="<?php echo asset('main.css'); ?>" />
      <link rel="stylesheet" href="<?php echo asset('bugscribe.css'); ?>" />
</head>

<body>
      <!-- Navigation -->
      <nav class="navbar navbar-expand-lg navbar-dark fixed-top">
            <div class="container">
                  <a class="navbar-brand d-flex align-items-center" href="#">
                        <i class="fas fa-bug me-2"></i>
                        <span class="fw-bold">Bugscribe</span>
                  </a>
                  <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                        <span class="navbar-toggler-icon"></span>
                  </button>
                  <div class="collapse navbar-collapse" id="navbarNav">
                        <ul class="navbar-nav ms-auto align-items-center">
                              <li class="nav-item">
                                    <a class="nav-link" href="#features">Features</a>
                              </li>
                              <li class="nav-item">
                                    <a class="nav-link" href="#demo">Demo</a>
                              </li>
                              <li class="nav-item">
                                    <a class="nav-link" href="#integration">Integration</a>
                              </li>
                              <li class="nav-item">
                                    <a class="nav-link" href="#pricing">Pricing</a>
                              </li>
                              <li class="nav-item ms-lg-3">
                                    <button class="btn btn-sm btn-outline-primary" id="themeToggle">
                                          <i class="fas fa-moon"></i>
                                    </button>
                              </li>
                        </ul>
                  </div>
            </div>
      </nav>

      <!-- Hero Section -->
      <section class="hero-section">
            <div class="container">
                  <div class="row align-items-center">
                        <div class="col-lg-6 mb-5 mb-lg-0">
                              <h1 class="display-3 fw-bold mb-4">
                                    Capture Bugs<br />
                                    <span class="gradient-text">The Smart Way</span>
                              </h1>
                              <p class="lead mb-4">
                                    Embeddable screenshot & bug reporting library with powerful capture modes,
                                    annotation tools, and seamless integration.
                              </p>
                              <div class="d-flex flex-wrap gap-3">
                                    <a href="#demo" class="btn btn-primary btn-lg">
                                          <i class="fas fa-play me-2"></i>Try Demo
                                    </a>
                                    <a href="#integration" class="btn btn-outline-primary btn-lg">
                                          <i class="fas fa-code me-2"></i>Get Started
                                    </a>
                              </div>
                              <div class="mt-4">
                                    <small class="text-muted">
                                          <i class="fas fa-check-circle text-success me-2"></i>No credit card required
                                          <span class="mx-2">•</span>
                                          <i class="fas fa-check-circle text-success me-2"></i>Free plan available
                                    </small>
                              </div>
                        </div>
                        <div class="col-lg-6">
                              <div class="hero-image-wrapper">
                                    <div class="hero-demo-placeholder">
                                          <svg viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg">
                                                <rect width="600" height="400" fill="#6366f1" rx="16" />
                                                <g opacity="0.1">
                                                      <circle cx="150" cy="100" r="40" fill="white" />
                                                      <circle cx="450" cy="300" r="60" fill="white" />
                                                      <circle cx="500" cy="100" r="30" fill="white" />
                                                </g>
                                                <foreignObject x="0" y="0" width="600" height="400">
                                                      <div xmlns="http://www.w3.org/1999/xhtml" style="height: 100%; display: flex; align-items: center; justify-content: center; flex-direction: column; padding: 40px;">
                                                            <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); max-width: 80%;">
                                                                  <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 20px;">
                                                                        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2">
                                                                              <path d="M12 2L2 7l10 5 10-5-10-5z" />
                                                                              <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
                                                                        </svg>
                                                                  </div>
                                                                  <h3 style="color: #6366f1; text-align: center; font-weight: bold; margin: 0; font-size: 24px;">Bugscribe Demo</h3>
                                                                  <p style="color: #64748b; text-align: center; margin: 10px 0 0 0; font-size: 14px;">Interactive Screenshot Tool</p>
                                                                  <div style="margin-top: 20px; display: flex; gap: 8px; justify-content: center;">
                                                                        <div style="width: 40px; height: 40px; background: #e0e7ff; border-radius: 8px;"></div>
                                                                        <div style="width: 40px; height: 40px; background: #ddd6fe; border-radius: 8px;"></div>
                                                                        <div style="width: 40px; height: 40px; background: #fce7f3; border-radius: 8px;"></div>
                                                                  </div>
                                                            </div>
                                                      </div>
                                                </foreignObject>
                                          </svg>
                                    </div>
                              </div>
                        </div>
                  </div>
            </div>
      </section>

      <!-- Features Section -->
      <section id="features" class="features-section py-5">
            <div class="container">
                  <div class="text-center mb-5">
                        <h2 class="display-5 fw-bold mb-3">Powerful Features</h2>
                        <p class="lead text-muted">Everything you need for effective bug reporting</p>
                  </div>
                  <div class="row g-4">
                        <div class="col-md-6 col-lg-4">
                              <div class="feature-card">
                                    <div class="feature-icon">
                                          <i class="fas fa-camera"></i>
                                    </div>
                                    <h3 class="h5 mb-3">Multiple Capture Modes</h3>
                                    <p class="text-muted">
                                          Full page, visible area, or custom selection.
                                          Capture exactly what you need with intuitive controls.
                                    </p>
                              </div>
                        </div>
                        <div class="col-md-6 col-lg-4">
                              <div class="feature-card">
                                    <div class="feature-icon">
                                          <i class="fas fa-pen"></i>
                                    </div>
                                    <h3 class="h5 mb-3">Annotation Tools</h3>
                                    <p class="text-muted">
                                          Draw, highlight, add text, arrows, and shapes.
                                          Make your bug reports crystal clear.
                                    </p>
                              </div>
                        </div>
                        <div class="col-md-6 col-lg-4">
                              <div class="feature-card">
                                    <div class="feature-icon">
                                          <i class="fas fa-keyboard"></i>
                                    </div>
                                    <h3 class="h5 mb-3">Keyboard Shortcuts</h3>
                                    <p class="text-muted">
                                          Customizable hotkeys for power users.
                                          Trigger captures without leaving the keyboard.
                                    </p>
                              </div>
                        </div>
                        <div class="col-md-6 col-lg-4">
                              <div class="feature-card">
                                    <div class="feature-icon">
                                          <i class="fas fa-mobile-alt"></i>
                                    </div>
                                    <h3 class="h5 mb-3">Fully Responsive</h3>
                                    <p class="text-muted">
                                          Works seamlessly on desktop, tablet, and mobile.
                                          Touch-optimized interface for all devices.
                                    </p>
                              </div>
                        </div>
                        <div class="col-md-6 col-lg-4">
                              <div class="feature-card">
                                    <div class="feature-icon">
                                          <i class="fas fa-palette"></i>
                                    </div>
                                    <h3 class="h5 mb-3">Theme Support</h3>
                                    <p class="text-muted">
                                          Light, dark, and system modes.
                                          Automatically adapts to user preferences.
                                    </p>
                              </div>
                        </div>
                        <div class="col-md-6 col-lg-4">
                              <div class="feature-card">
                                    <div class="feature-icon">
                                          <i class="fas fa-plug"></i>
                                    </div>
                                    <h3 class="h5 mb-3">Easy Integration</h3>
                                    <p class="text-muted">
                                          Drop-in solution with minimal configuration.
                                          Framework agnostic and dependency-free.
                                    </p>
                              </div>
                        </div>
                  </div>
            </div>
      </section>

      <!-- Demo Section -->
      <section id="demo" class="demo-section py-5">
            <div class="container">
                  <div class="text-center mb-5">
                        <h2 class="display-5 fw-bold mb-3">See It In Action</h2>
                        <p class="lead text-muted">Try Bugscribe right here, right now</p>
                  </div>
                  <div class="demo-wrapper">
                        <div class="demo-controls text-center mb-4">
                              <button class="btn btn-primary btn-lg me-2" id="demoCapture">
                                    <i class="fas fa-camera me-2"></i>Start Capture
                              </button>
                              <button class="btn btn-outline-secondary btn-lg">
                                    <i class="fas fa-info-circle me-2"></i>View Guide
                              </button>
                        </div>
                        <div class="demo-preview">
                              <div class="ratio ratio-16x9">
                                    <div class="demo-placeholder d-flex align-items-center justify-content-center">
                                          <div class="text-center">
                                                <i class="fas fa-desktop fa-4x mb-3 opacity-50"></i>
                                                <p class="text-muted">Click "Start Capture" to test the library</p>
                                          </div>
                                    </div>
                              </div>
                        </div>
                  </div>
            </div>
      </section>

      <!-- Integration Section -->
      <section id="integration" class="integration-section py-5">
            <div class="container">
                  <div class="text-center mb-5">
                        <h2 class="display-5 fw-bold mb-3">Quick Integration</h2>
                        <p class="lead text-muted">Get started in minutes, not hours</p>
                  </div>
                  <div class="row">
                        <div class="col-lg-8 mx-auto">
                              <ul class="nav nav-tabs justify-content-center mb-4" role="tablist">
                                    <li class="nav-item" role="presentation">
                                          <button class="nav-link active" data-bs-toggle="tab" data-bs-target="#cdn">
                                                <i class="fas fa-link me-2"></i>CDN
                                          </button>
                                    </li>
                                    <li class="nav-item" role="presentation">
                                          <button class="nav-link" data-bs-toggle="tab" data-bs-target="#npm">
                                                <i class="fab fa-npm me-2"></i>NPM
                                          </button>
                                    </li>
                                    <li class="nav-item" role="presentation">
                                          <button class="nav-link" data-bs-toggle="tab" data-bs-target="#usage">
                                                <i class="fas fa-code me-2"></i>Usage
                                          </button>
                                    </li>
                              </ul>
                              <div class="tab-content">
                                    <div class="tab-pane fade show active" id="cdn">
                                          <div class="code-block">
                                                <pre><code>&lt;!-- Add Bugscribe CSS --&gt;
&lt;link rel="stylesheet" href="https://cdn.bugscribe.com/v1/bugscribe.min.css"&gt;

&lt;!-- Add Bugscribe JS --&gt;
&lt;script src="https://cdn.bugscribe.com/v1/bugscribe.min.js"&gt;&lt;/script&gt;</code></pre>
                                                <button class="code-copy-btn" data-copy="cdn">
                                                      <i class="fas fa-copy"></i>
                                                </button>
                                          </div>
                                    </div>
                                    <div class="tab-pane fade" id="npm">
                                          <div class="code-block">
                                                <pre><code># Install via NPM
npm install bugscribe

# Or via Yarn
yarn add bugscribe</code></pre>
                                                <button class="code-copy-btn" data-copy="npm">
                                                      <i class="fas fa-copy"></i>
                                                </button>
                                          </div>
                                    </div>
                                    <div class="tab-pane fade" id="usage">
                                          <div class="code-block">
                                                <pre><code>// Initialize Bugscribe
const bugscribe = new Bugscribe({
  apiKey: 'your-api-key',
  captureMode: 'selection',
  theme: 'auto',
  hotkey: 'ctrl+shift+b'
});

// Trigger capture programmatically
bugscribe.capture();</code></pre>
                                                <button class="code-copy-btn" data-copy="usage">
                                                      <i class="fas fa-copy"></i>
                                                </button>
                                          </div>
                                    </div>
                              </div>
                        </div>
                  </div>
            </div>
      </section>

      <!-- Pricing Section -->
      <section id="pricing" class="pricing-section py-5">
            <div class="container">
                  <div class="text-center mb-5">
                        <h2 class="display-5 fw-bold mb-3">Simple, Transparent Pricing</h2>
                        <p class="lead text-muted">Choose the plan that fits your needs</p>
                  </div>
                  <div class="row g-4">
                        <div class="col-lg-4">
                              <div class="pricing-card">
                                    <div class="pricing-header">
                                          <h3 class="h5 mb-3">Free</h3>
                                          <div class="pricing-price">
                                                <span class="h2 fw-bold">$0</span>
                                                <span class="text-muted">/month</span>
                                          </div>
                                    </div>
                                    <ul class="pricing-features">
                                          <li><i class="fas fa-check text-success me-2"></i>Up to 100 captures/month</li>
                                          <li><i class="fas fa-check text-success me-2"></i>Basic annotation tools</li>
                                          <li><i class="fas fa-check text-success me-2"></i>Single project</li>
                                          <li><i class="fas fa-check text-success me-2"></i>Community support</li>
                                          <li class="text-muted"><i class="fas fa-times me-2"></i>Custom branding</li>
                                          <li class="text-muted"><i class="fas fa-times me-2"></i>API access</li>
                                    </ul>
                                    <button class="btn btn-outline-primary w-100">Get Started</button>
                              </div>
                        </div>
                        <div class="col-lg-4">
                              <div class="pricing-card featured">
                                    <div class="pricing-badge">Most Popular</div>
                                    <div class="pricing-header">
                                          <h3 class="h5 mb-3">Pro</h3>
                                          <div class="pricing-price">
                                                <span class="h2 fw-bold">$29</span>
                                                <span class="text-muted">/month</span>
                                          </div>
                                    </div>
                                    <ul class="pricing-features">
                                          <li><i class="fas fa-check text-success me-2"></i>Unlimited captures</li>
                                          <li><i class="fas fa-check text-success me-2"></i>Advanced annotation tools</li>
                                          <li><i class="fas fa-check text-success me-2"></i>Up to 10 projects</li>
                                          <li><i class="fas fa-check text-success me-2"></i>Priority support</li>
                                          <li><i class="fas fa-check text-success me-2"></i>Custom branding</li>
                                          <li><i class="fas fa-check text-success me-2"></i>Full API access</li>
                                    </ul>
                                    <button class="btn btn-primary w-100">Start Free Trial</button>
                              </div>
                        </div>
                        <div class="col-lg-4">
                              <div class="pricing-card">
                                    <div class="pricing-header">
                                          <h3 class="h5 mb-3">Enterprise</h3>
                                          <div class="pricing-price">
                                                <span class="h2 fw-bold">Custom</span>
                                          </div>
                                    </div>
                                    <ul class="pricing-features">
                                          <li><i class="fas fa-check text-success me-2"></i>Everything in Pro</li>
                                          <li><i class="fas fa-check text-success me-2"></i>Unlimited projects</li>
                                          <li><i class="fas fa-check text-success me-2"></i>Dedicated support</li>
                                          <li><i class="fas fa-check text-success me-2"></i>SLA guarantee</li>
                                          <li><i class="fas fa-check text-success me-2"></i>On-premise deployment</li>
                                          <li><i class="fas fa-check text-success me-2"></i>Custom integrations</li>
                                    </ul>
                                    <button class="btn btn-outline-primary w-100">Contact Sales</button>
                              </div>
                        </div>
                  </div>
            </div>
      </section>

      <!-- Footer -->
      <footer class="footer py-5">
            <div class="container">
                  <div class="row">
                        <div class="col-lg-4 mb-4 mb-lg-0">
                              <div class="d-flex align-items-center mb-3">
                                    <i class="fas fa-bug me-2 text-primary"></i>
                                    <span class="h5 mb-0 fw-bold">Bugscribe</span>
                              </div>
                              <p class="text-muted">
                                    Modern screenshot and bug reporting library for web applications.
                              </p>
                              <div class="social-links">
                                    <a href="#" class="btn btn-sm btn-outline-secondary me-2">
                                          <i class="fab fa-github"></i>
                                    </a>
                                    <a href="#" class="btn btn-sm btn-outline-secondary me-2">
                                          <i class="fab fa-twitter"></i>
                                    </a>
                                    <a href="#" class="btn btn-sm btn-outline-secondary">
                                          <i class="fab fa-linkedin"></i>
                                    </a>
                              </div>
                        </div>
                        <div class="col-lg-2 col-md-3 mb-4 mb-lg-0">
                              <h6 class="fw-bold mb-3">Product</h6>
                              <ul class="list-unstyled">
                                    <li><a href="#features" class="text-muted text-decoration-none">Features</a></li>
                                    <li><a href="#pricing" class="text-muted text-decoration-none">Pricing</a></li>
                                    <li><a href="#" class="text-muted text-decoration-none">Changelog</a></li>
                              </ul>
                        </div>
                        <div class="col-lg-2 col-md-3 mb-4 mb-lg-0">
                              <h6 class="fw-bold mb-3">Resources</h6>
                              <ul class="list-unstyled">
                                    <li><a href="#" class="text-muted text-decoration-none">Documentation</a></li>
                                    <li><a href="#" class="text-muted text-decoration-none">API Reference</a></li>
                                    <li><a href="#" class="text-muted text-decoration-none">Examples</a></li>
                              </ul>
                        </div>
                        <div class="col-lg-2 col-md-3 mb-4 mb-lg-0">
                              <h6 class="fw-bold mb-3">Company</h6>
                              <ul class="list-unstyled">
                                    <li><a href="#" class="text-muted text-decoration-none">About</a></li>
                                    <li><a href="#" class="text-muted text-decoration-none">Blog</a></li>
                                    <li><a href="#" class="text-muted text-decoration-none">Contact</a></li>
                              </ul>
                        </div>
                        <div class="col-lg-2 col-md-3">
                              <h6 class="fw-bold mb-3">Legal</h6>
                              <ul class="list-unstyled">
                                    <li><a href="#" class="text-muted text-decoration-none">Privacy</a></li>
                                    <li><a href="#" class="text-muted text-decoration-none">Terms</a></li>
                                    <li><a href="#" class="text-muted text-decoration-none">License</a></li>
                              </ul>
                        </div>
                  </div>
                  <hr class="my-4">
                  <div class="text-center text-muted">
                        <small>&copy; 2024 Bugscribe. All rights reserved.</small>
                  </div>
            </div>
      </footer>

      <!-- Bootstrap 5 JS Bundle (with Popper) -->
      <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
      <!-- Custom compiled JS -->
      <script src="<?php echo asset('bugscribe.js'); ?>"></script>
      <script src="<?php echo asset('main.js'); ?>"></script>
</body>

</html>