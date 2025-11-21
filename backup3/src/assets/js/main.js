// Initialize Bugscribe library
const bugscribe = new window.Bugscribe({
  buttons: {
    bgColor: "#2563eb",
    position: { vertical: "bottom", horizontal: "right" },
  },
});
// ============================================
// Theme Management
// ============================================

class ThemeManager {
  constructor() {
    this.themeToggle = document.getElementById("themeToggle");
    this.currentTheme = localStorage.getItem("theme") || "system";
    this.init();
  }

  init() {
    this.applyTheme(this.currentTheme);
    this.themeToggle.addEventListener("click", () => this.toggleTheme());

    // Listen for system theme changes
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", (e) => {
        if (this.currentTheme === "system") {
          this.applySystemTheme();
        }
      });
  }

  toggleTheme() {
    const themes = ["light", "dark", "system"];
    const currentIndex = themes.indexOf(this.currentTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    this.currentTheme = themes[nextIndex];

    this.applyTheme(this.currentTheme);
    localStorage.setItem("theme", this.currentTheme);
  }

  applyTheme(theme) {
    const icon = this.themeToggle.querySelector("i");

    if (theme === "system") {
      this.applySystemTheme();
      icon.className = "fas fa-desktop"; //"fas fa-circle-half-stroke";
    } else if (theme === "dark") {
      document.documentElement.setAttribute("data-bs-theme", "dark");
      icon.className = "fas fa-moon";
    } else {
      document.documentElement.setAttribute("data-bs-theme", "light");
      icon.className = "fas fa-sun";
    }
  }

  applySystemTheme() {
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.setAttribute(
      "data-bs-theme",
      isDark ? "dark" : "light"
    );
  }
}

// ============================================
// Smooth Scroll
// ============================================

class SmoothScroll {
  constructor() {
    this.init();
  }

  init() {
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener("click", (e) => {
        const href = anchor.getAttribute("href");

        // Skip empty hash links
        if (href === "#" || href === "#!") return;

        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          const offsetTop = target.offsetTop - 80; // Account for fixed navbar

          window.scrollTo({
            top: offsetTop,
            behavior: "smooth",
          });

          // Close mobile menu if open
          const navbarCollapse = document.querySelector(".navbar-collapse");
          if (navbarCollapse.classList.contains("show")) {
            bootstrap.Collapse.getInstance(navbarCollapse)?.hide();
          }
        }
      });
    });
  }
}

// ============================================
// Navbar Scroll Effect
// ============================================

class NavbarScrollEffect {
  constructor() {
    this.navbar = document.querySelector(".navbar");
    this.init();
  }

  init() {
    window.addEventListener("scroll", () => {
      if (window.scrollY > 50) {
        this.navbar.classList.add("scrolled");
      } else {
        this.navbar.classList.remove("scrolled");
      }
    });
  }
}

// ============================================
// Code Copy Functionality
// ============================================

class CodeCopy {
  constructor() {
    this.init();
  }

  init() {
    document.querySelectorAll(".code-copy-btn").forEach((btn) => {
      btn.addEventListener("click", () => this.copyCode(btn));
    });
  }

  copyCode(btn) {
    const codeBlock = btn.closest(".code-block");
    const code = codeBlock.querySelector("code").textContent;

    navigator.clipboard
      .writeText(code)
      .then(() => {
        const originalIcon = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i>';
        btn.classList.add("copied");

        setTimeout(() => {
          btn.innerHTML = originalIcon;
          btn.classList.remove("copied");
        }, 2000);
      })
      .catch((err) => {
        console.error("Failed to copy code:", err);
      });
  }
}

// ============================================
// Scroll Animations
// ============================================

class ScrollAnimations {
  constructor() {
    this.init();
  }

  init() {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px",
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("animate-in");
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    // Observe feature cards
    document.querySelectorAll(".feature-card").forEach((card, index) => {
      card.style.opacity = "0";
      card.style.transform = "translateY(30px)";
      card.style.transition = `all 0.6s ease ${index * 0.1}s`;
      observer.observe(card);
    });

    // Observe pricing cards
    document.querySelectorAll(".pricing-card").forEach((card, index) => {
      card.style.opacity = "0";
      card.style.transform = "translateY(30px)";
      card.style.transition = `all 0.6s ease ${index * 0.15}s`;
      observer.observe(card);
    });
  }
}

// Add animation class styles
const style = document.createElement("style");
style.textContent = `
  .animate-in {
    opacity: 1 !important;
    transform: translateY(0) !important;
  }
`;
document.head.appendChild(style);

// ============================================
// Demo Capture Handler
// ============================================

class DemoHandler {
  constructor() {
    this.demoBtn = document.getElementById("demoCapture");
    this.init();
  }

  init() {
    if (this.demoBtn) {
      this.demoBtn.addEventListener("click", () => this.triggerDemo());
    }
  }

  triggerDemo() {
    // Check if Bugscribe library is loaded
    if (typeof Bugscribe !== "undefined") {
      // Initialize and trigger Bugscribe
      const bugscribe = new Bugscribe({
        captureMode: "selection",
        theme: "auto",
      });
      bugscribe.capture();
    } else {
      // Show demo message if library not loaded
      this.showDemoMessage();
    }
  }

  showDemoMessage() {
    const placeholder = document.querySelector(".demo-placeholder");
    const originalContent = placeholder.innerHTML;

    placeholder.innerHTML = `
      <div class="text-center p-4">
        <i class="fas fa-camera fa-3x mb-3 text-primary"></i>
        <h5 class="mb-3">Demo Mode</h5>
        <p class="text-muted mb-0">This would trigger the Bugscribe capture interface.<br>
        Integrate the library to see it in action!</p>
      </div>
    `;

    setTimeout(() => {
      placeholder.innerHTML = originalContent;
    }, 3000);
  }
}

// ============================================
// Pricing Toggle (Optional: Monthly/Yearly)
// ============================================

class PricingToggle {
  constructor() {
    this.createToggle();
  }

  createToggle() {
    const pricingSection = document.querySelector(
      ".pricing-section .text-center"
    );
    if (!pricingSection) return;

    const toggleHTML = `
      <div class="d-flex justify-content-center align-items-center gap-3 mt-3 mb-4">
        <span class="text-muted">Monthly</span>
        <div class="form-check form-switch">
          <input class="form-check-input" type="checkbox" id="pricingToggle" style="cursor: pointer;">
        </div>
        <span class="text-muted">Yearly <span class="badge bg-success">Save 20%</span></span>
      </div>
    `;

    pricingSection.insertAdjacentHTML("beforeend", toggleHTML);

    const toggle = document.getElementById("pricingToggle");
    if (toggle) {
      toggle.addEventListener("change", (e) => {
        // Add pricing toggle logic here
        console.log(
          "Pricing period changed:",
          e.target.checked ? "yearly" : "monthly"
        );
      });
    }
  }
}

// ============================================
// Stats Counter Animation
// ============================================

class StatsCounter {
  constructor() {
    this.addStatsSection();
  }

  addStatsSection() {
    const featuresSection = document.querySelector(".features-section");
    if (!featuresSection) return;

    const statsHTML = `
      <div class="row text-center mt-5 pt-5 border-top">
        <div class="col-md-3 col-6 mb-4">
          <div class="stat-item">
            <h3 class="display-4 fw-bold text-primary mb-2" data-count="10000">0</h3>
            <p class="text-muted mb-0">Active Users</p>
          </div>
        </div>
        <div class="col-md-3 col-6 mb-4">
          <div class="stat-item">
            <h3 class="display-4 fw-bold text-primary mb-2" data-count="50000">0</h3>
            <p class="text-muted mb-0">Screenshots Captured</p>
          </div>
        </div>
        <div class="col-md-3 col-6 mb-4">
          <div class="stat-item">
            <h3 class="display-4 fw-bold text-primary mb-2" data-count="99">0</h3>
            <p class="text-muted mb-0">% Uptime</p>
          </div>
        </div>
        <div class="col-md-3 col-6 mb-4">
          <div class="stat-item">
            <h3 class="display-4 fw-bold text-primary mb-2" data-count="24">0</h3>
            <p class="text-muted mb-0">Support Response</p>
          </div>
        </div>
      </div>
    `;

    featuresSection
      .querySelector(".container")
      .insertAdjacentHTML("beforeend", statsHTML);
    this.animateCounters();
  }

  animateCounters() {
    const counters = document.querySelectorAll("[data-count]");

    const observerOptions = {
      threshold: 0.5,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          this.animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    counters.forEach((counter) => observer.observe(counter));
  }

  animateCounter(element) {
    const target = parseInt(element.getAttribute("data-count"));
    const duration = 2000;
    const step = target / (duration / 16);
    let current = 0;

    const updateCounter = () => {
      current += step;
      if (current < target) {
        element.textContent = Math.floor(current).toLocaleString();
        requestAnimationFrame(updateCounter);
      } else {
        element.textContent =
          target.toLocaleString() + (target === 99 ? ".9" : "+");
      }
    };

    updateCounter();
  }
}

// ============================================
// Initialize Everything
// ============================================

document.addEventListener("DOMContentLoaded", () => {
  // Initialize all components
  new ThemeManager();
  new SmoothScroll();
  new NavbarScrollEffect();
  new CodeCopy();
  new ScrollAnimations();
  new DemoHandler();
  new PricingToggle();
  new StatsCounter();

  // Add active state to navbar links based on scroll position
  const sections = document.querySelectorAll("section[id]");
  const navLinks = document.querySelectorAll('.nav-link[href^="#"]');

  window.addEventListener("scroll", () => {
    let current = "";
    sections.forEach((section) => {
      const sectionTop = section.offsetTop - 100;
      const sectionHeight = section.clientHeight;
      if (
        window.scrollY >= sectionTop &&
        window.scrollY < sectionTop + sectionHeight
      ) {
        current = section.getAttribute("id");
      }
    });

    navLinks.forEach((link) => {
      link.classList.remove("active");
      if (link.getAttribute("href") === `#${current}`) {
        link.classList.add("active");
      }
    });
  });

  // Add loading animation
  document.body.style.opacity = "0";
  setTimeout(() => {
    document.body.style.transition = "opacity 0.5s ease";
    document.body.style.opacity = "1";
  }, 100);
});

// ============================================
// Handle External Links
// ============================================

document.addEventListener("click", (e) => {
  const link = e.target.closest('a[href^="http"]');
  if (link && !link.hasAttribute("target")) {
    link.setAttribute("target", "_blank");
    link.setAttribute("rel", "noopener noreferrer");
  }
});
