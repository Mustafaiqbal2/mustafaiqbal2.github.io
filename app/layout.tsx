import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import { GlobalContact } from "@/components/GlobalContact";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { StatusDeck } from "@/components/StatusDeck";
import { CommandConsole } from "@/components/CommandConsole";
import { featuredProjects, navigation, profile, siteUrl } from "@/data/portfolio";
import "@xyflow/react/dist/style.css";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap"
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap"
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap"
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Mustafa Iqbal — AI Automation & Full-Stack Engineer",
    template: "%s | Mustafa Iqbal"
  },
  description:
    "Mustafa Iqbal builds AI automation and full-stack products — LLM workflows, RAG systems, and integrations. One project cut review workflows 6–10x.",
  alternates: {
    canonical: "/"
  },
  keywords: [
    "Mustafa Iqbal",
    "AI automation engineer",
    "Full-stack software engineer",
    "LLM engineer",
    "RAG engineer",
    "FastAPI",
    "Next.js",
    "Gmail automation",
    "Google Business Profile automation",
    "vector search"
  ],
  authors: [{ name: profile.name, url: siteUrl }],
  creator: profile.name,
  publisher: profile.name,
  openGraph: {
    type: "website",
    url: siteUrl,
    title: "Mustafa Iqbal — AI Automation & Full-Stack Engineer",
    description:
      "Real products with measured outcomes: AI automation, RAG retrieval, and full-stack systems. Built on Next.js, FastAPI, and a stack that reaches down to CUDA.",
    siteName: "Mustafa Iqbal",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Mustafa Iqbal software engineering preview"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Mustafa Iqbal — AI Automation & Full-Stack Engineer",
    description: "Real products with measured outcomes: AI automation, RAG retrieval, and full-stack systems on Next.js, FastAPI, and CUDA.",
    images: ["/og-image.png"]
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico" }
    ],
    shortcut: "/favicon.svg",
    apple: "/icon.svg"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F8FA" },
    { media: "(prefers-color-scheme: dark)", color: "#090A0F" }
  ]
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeScript = `
    (function () {
      function resolveTheme(preference) {
        var systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        return preference === "system" ? (systemDark ? "dark" : "light") : preference;
      }

      function updateThemeControls(preference) {
        var buttons = document.querySelectorAll("[data-theme-choice]");
        for (var i = 0; i < buttons.length; i += 1) {
          var button = buttons[i];
          button.setAttribute("aria-pressed", button.getAttribute("data-theme-choice") === preference ? "true" : "false");
        }
      }

      function applyTheme(preference, persist) {
        var theme = resolveTheme(preference);
        document.documentElement.dataset.theme = theme;
        document.documentElement.dataset.themePreference = preference;
        document.documentElement.style.colorScheme = theme;
        if (persist) {
          localStorage.setItem("theme-preference", preference);
        }
        updateThemeControls(preference);
        window.dispatchEvent(new Event("site-theme-change"));
      }

      try {
        applyTheme(localStorage.getItem("theme-preference") || "system", false);
      } catch (error) {}

      document.addEventListener("DOMContentLoaded", function () {
        var preference = localStorage.getItem("theme-preference") || "system";
        updateThemeControls(preference);
        updateActiveNav();
        setupMobileMenu();
        setupReveals();
        setupCarousels();
        setupCarouselRails();
        setupHeaderState();
        setupDecodes();
        setupSpotlights();
        setupWorkflowTrace();
        setupStatusDeck();
        setupConsole();
        setupPipelineMonitor();
        setupKineticMasthead();
        setupGauges();
        setupProjectStories();
        updateScrollProgress();
        window.addEventListener("scroll", updateScrollProgress, { passive: true });
        window.addEventListener("resize", updateScrollProgress);
        var media = window.matchMedia("(prefers-color-scheme: dark)");
        media.addEventListener("change", function () {
          if ((localStorage.getItem("theme-preference") || "system") === "system") {
            applyTheme("system", false);
          }
        });
      });

      document.addEventListener("click", function (event) {
        var target = event.target;
        var themeButton = target && target.closest ? target.closest("[data-theme-choice]") : null;
        if (themeButton) {
          applyTheme(themeButton.getAttribute("data-theme-choice") || "system", true);
          return;
        }

        var copyButton = target && target.closest ? target.closest("[data-copy-email]") : null;
        if (copyButton) {
          var email = copyButton.getAttribute("data-copy-email");
          var label = copyButton.querySelector("[data-copy-label]");
          var reset = function () {
            copyButton.removeAttribute("data-copied");
            if (label) {
              label.textContent = "Copy email";
            }
          };

          if (!email) {
            return;
          }

          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(email).then(function () {
              copyButton.setAttribute("data-copied", "true");
              if (label) {
                label.textContent = "Copied";
              }
              showToast("Email copied", "success");
              window.setTimeout(reset, 1800);
            }).catch(function () {
              window.location.href = "mailto:" + email;
            });
          } else {
            window.location.href = "mailto:" + email;
          }
          return;
        }

        var imageButton = target && target.closest ? target.closest("[data-image-lightbox]") : null;
        if (imageButton) {
          var lightSrc = imageButton.getAttribute("data-image-lightbox");
          var darkSrc = imageButton.getAttribute("data-image-lightbox-dark");
          var alt = imageButton.getAttribute("data-image-alt") || imageButton.getAttribute("aria-label") || "Expanded image preview";
          var src = document.documentElement.dataset.theme === "dark" && darkSrc ? darkSrc : lightSrc;
          var lightbox = document.querySelector("[data-lightbox]");
          var image = lightbox && lightbox.querySelector("img");
          if (lightbox && image && src) {
            image.removeAttribute("hidden");
            image.setAttribute("src", src);
            image.setAttribute("alt", alt.replace(/^Expand\\s+/i, ""));
            lightbox.removeAttribute("hidden");
          }
          return;
        }

        var closeLightbox = target && target.closest ? target.closest("[data-lightbox-close]") : null;
        if (closeLightbox) {
          var box = document.querySelector("[data-lightbox]");
          if (box) {
            box.setAttribute("hidden", "");
          }
        }
      });

      document.addEventListener("submit", function (event) {
        var form = event.target && event.target.matches && event.target.matches("[data-contact-form]") ? event.target : null;
        if (!form) {
          return;
        }

        event.preventDefault();
        var submit = form.querySelector("[data-contact-submit]");
        var label = form.querySelector("[data-submit-label]");
        var status = form.querySelector("[data-form-status]");
        var statusMessage = form.querySelector("[data-form-status-message]");
        var original = label ? label.textContent : "Send message";
        var payload = {};
        var data = new FormData(form);
        data.forEach(function (value, key) {
          payload[key] = value;
        });
        payload.subject = "Portfolio inquiry from " + (payload.name || "website visitor");
        payload.from_name = payload.name || "Portfolio visitor";
        payload.to_name = "Mustafa Iqbal";

        if (submit) {
          submit.setAttribute("disabled", "");
        }
        if (label) {
          label.textContent = "Sending";
        }
        if (status) {
          status.setAttribute("data-status", "loading");
        }
        if (statusMessage) {
          statusMessage.textContent = "Sending message...";
        }

        fetch("https://api.web3forms.com/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify(payload)
        })
          .then(function (response) { return response.json().then(function (body) { return { ok: response.ok, body: body }; }); })
          .then(function (result) {
            if (!result.ok || !result.body.success) {
              throw new Error(result.body.message || "The form could not send.");
            }
            form.reset();
            if (status) {
              status.setAttribute("data-status", "success");
            }
            if (statusMessage) {
              statusMessage.textContent = "Got it — I'll reply from my inbox soon.";
            }
            showToast("Message sent", "success");
          })
          .catch(function (error) {
            if (status) {
              status.setAttribute("data-status", "error");
            }
            if (statusMessage) {
              statusMessage.textContent = error.message || "That didn't send. Email me directly and it'll reach me.";
            }
            showToast(error.message || "The form could not send", "error");
          })
          .finally(function () {
            if (submit) {
              submit.removeAttribute("disabled");
            }
            if (label) {
              label.textContent = original;
            }
          });
      });

      document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
          var box = document.querySelector("[data-lightbox]");
          if (box) {
            box.setAttribute("hidden", "");
          }
        }
      });

      function setupReveals() {
        var items = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
        var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (!items.length) {
          return;
        }

        if (reduceMotion || !("IntersectionObserver" in window)) {
          items.forEach(function (item) { item.classList.add("is-visible"); });
          return;
        }

        var observer = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              observer.unobserve(entry.target);
            }
          });
        }, { rootMargin: "0px 0px -12% 0px", threshold: 0.12 });

        items.forEach(function (item, index) {
          if (!item.style.getPropertyValue("--reveal-delay")) {
            item.style.setProperty("--reveal-delay", Math.min(index % 5, 4) * 55 + "ms");
          }
          observer.observe(item);
        });
      }

      function updateActiveNav() {
        var path = window.location.pathname;
        var links = Array.prototype.slice.call(document.querySelectorAll("[data-nav-link]"));
        links.forEach(function (link) {
          var href = link.getAttribute("href") || "/";
          var active = href === "/" ? path === "/" : path === href || path.indexOf(href) === 0;
          if (active) {
            link.classList.add("is-active");
            link.setAttribute("aria-current", "page");
          } else {
            link.classList.remove("is-active");
            link.removeAttribute("aria-current");
          }
        });
      }

      function setupMobileMenu() {
        var menu = document.querySelector("[data-mobile-menu]");
        if (!menu) {
          return;
        }

        function setBodyLock() {
          if (menu.hasAttribute("open")) {
            document.body.classList.add("mobile-menu-open");
            var closeButton = menu.querySelector("[data-mobile-menu-close]");
            if (closeButton && closeButton.focus) {
              closeButton.focus();
            }
          } else {
            document.body.classList.remove("mobile-menu-open");
          }
        }

        function closeMenu() {
          menu.removeAttribute("open");
          setBodyLock();
        }

        menu.addEventListener("toggle", setBodyLock);
        menu.addEventListener("click", function (event) {
          var target = event.target;
          var close = target && target.closest ? target.closest("[data-mobile-menu-close]") : null;
          var link = target && target.closest ? target.closest(".mobile-menu-panel a") : null;
          if (close || link) {
            closeMenu();
          }
        });
        document.addEventListener("keydown", function (event) {
          if (event.key === "Escape" && menu.hasAttribute("open")) {
            closeMenu();
          }
        });
        setBodyLock();
      }

      function setupCarousels() {
        var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        var carousels = Array.prototype.slice.call(document.querySelectorAll("[data-project-carousel]"));

        carousels.forEach(function (carousel) {
          var track = carousel.querySelector("[data-carousel-track]");
          var slides = Array.prototype.slice.call(carousel.querySelectorAll("[data-carousel-slide]"));
          var dots = Array.prototype.slice.call(carousel.querySelectorAll("[data-carousel-dot]"));
          var prev = carousel.querySelector("[data-carousel-prev]");
          var next = carousel.querySelector("[data-carousel-next]");
          var index = 0;
          var timer = null;

          if (!track || slides.length < 2) {
            return;
          }

          function update() {
            track.style.transform = "translate3d(" + index * -100 + "%, 0, 0)";
            slides.forEach(function (slide, slideIndex) {
              slide.setAttribute("aria-hidden", slideIndex === index ? "false" : "true");
              slide.tabIndex = slideIndex === index ? 0 : -1;
            });
            dots.forEach(function (dot, dotIndex) {
              dot.setAttribute("aria-pressed", dotIndex === index ? "true" : "false");
            });
          }

          function go(nextIndex) {
            index = (nextIndex + slides.length) % slides.length;
            update();
          }

          function stop() {
            if (timer) {
              window.clearInterval(timer);
              timer = null;
            }
          }

          function start() {
            if (reduceMotion) {
              return;
            }
            stop();
            timer = window.setInterval(function () { go(index + 1); }, 4600);
          }

          if (prev) {
            prev.addEventListener("click", function () { go(index - 1); start(); });
          }
          if (next) {
            next.addEventListener("click", function () { go(index + 1); start(); });
          }
          dots.forEach(function (dot, dotIndex) {
            dot.addEventListener("click", function () { go(dotIndex); start(); });
          });
          carousel.addEventListener("pointerenter", stop);
          carousel.addEventListener("pointerleave", start);
          carousel.addEventListener("focusin", stop);
          carousel.addEventListener("focusout", start);
          update();
          start();
        });
      }

      function setupCarouselRails() {
        var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        var rails = Array.prototype.slice.call(document.querySelectorAll("[data-carousel-rail]"));

        rails.forEach(function (rail) {
          var track = rail.querySelector("[data-carousel-rail-track]");
          var items = Array.prototype.slice.call(rail.querySelectorAll("[data-carousel-rail-item]"));
          var prev = rail.querySelector("[data-carousel-rail-prev]");
          var next = rail.querySelector("[data-carousel-rail-next]");
          var current = rail.querySelector("[data-carousel-rail-current]");
          var timer = null;
          var raf = null;

          if (!track || !items.length) {
            return;
          }

          function pad(value) {
            return String(value).padStart(2, "0");
          }

          function stepSize() {
            if (!items[0]) {
              return track.clientWidth;
            }
            var rect = items[0].getBoundingClientRect();
            var style = window.getComputedStyle(track);
            var gap = parseFloat(style.columnGap || style.gap || "0") || 0;
            return Math.max(rect.width + gap, 1);
          }

          function activeIndex() {
            return Math.min(items.length - 1, Math.max(0, Math.round(track.scrollLeft / stepSize())));
          }

          function update() {
            var maxScroll = Math.max(track.scrollWidth - track.clientWidth, 0);
            var canScroll = maxScroll > 2;
            var index = activeIndex();
            rail.dataset.canScroll = canScroll ? "true" : "false";
            rail.dataset.atStart = track.scrollLeft <= 2 ? "true" : "false";
            rail.dataset.atEnd = track.scrollLeft >= maxScroll - 2 ? "true" : "false";
            if (current) {
              current.textContent = pad(index + 1);
            }
            if (prev) {
              prev.disabled = !canScroll || track.scrollLeft <= 2;
            }
            if (next) {
              next.disabled = !canScroll || track.scrollLeft >= maxScroll - 2;
            }
          }

          function scheduleUpdate() {
            if (raf) {
              window.cancelAnimationFrame(raf);
            }
            raf = window.requestAnimationFrame(update);
          }

          function move(direction) {
            var maxScroll = Math.max(track.scrollWidth - track.clientWidth, 0);
            var target = track.scrollLeft + direction * stepSize();
            if (direction > 0 && track.scrollLeft >= maxScroll - 2) {
              target = 0;
            }
            if (direction < 0 && track.scrollLeft <= 2) {
              target = maxScroll;
            }
            track.scrollTo({ left: Math.min(Math.max(target, 0), maxScroll), behavior: reduceMotion ? "auto" : "smooth" });
          }

          function stop() {
            if (timer) {
              window.clearInterval(timer);
              timer = null;
            }
          }

          function start() {
            var touchViewport = window.matchMedia("(hover: none), (pointer: coarse), (max-width: 680px)").matches;
            if (reduceMotion || touchViewport || rail.getAttribute("data-carousel-auto") !== "true") {
              return;
            }
            stop();
            timer = window.setInterval(function () { move(1); }, 5200);
          }

          if (prev) {
            prev.addEventListener("click", function () {
              move(-1);
              start();
            });
          }
          if (next) {
            next.addEventListener("click", function () {
              move(1);
              start();
            });
          }
          track.addEventListener("scroll", scheduleUpdate, { passive: true });
          track.addEventListener("keydown", function (event) {
            if (event.key === "ArrowRight") {
              event.preventDefault();
              move(1);
            }
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              move(-1);
            }
          });
          rail.addEventListener("pointerenter", stop);
          rail.addEventListener("pointerleave", start);
          rail.addEventListener("focusin", stop);
          rail.addEventListener("focusout", start);
          window.addEventListener("resize", scheduleUpdate);
          update();
          start();
        });
      }

      function setupHeaderState() {
        var header = document.querySelector(".site-header");
        if (!header) {
          return;
        }
        function update() {
          header.setAttribute("data-scrolled", window.scrollY > 24 ? "true" : "false");
        }
        update();
        window.addEventListener("scroll", update, { passive: true });
      }

      function setupDecodes() {
        var items = Array.prototype.slice.call(document.querySelectorAll("[data-decode]"));
        var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (!items.length || reduceMotion || !("IntersectionObserver" in window)) {
          return;
        }

        if (document.readyState !== "complete") {
          window.addEventListener("load", function () {
            window.setTimeout(setupDecodes, 80);
          }, { once: true });
          return;
        }

        var glyphs = "AEHKMNRSTX0123456789#%";

        function decode(el) {
          var final = el.getAttribute("data-decode-final") || el.textContent;
          el.setAttribute("data-decode-final", final);
          var start = null;
          var duration = 640;
          function tick(now) {
            if (!start) {
              start = now;
            }
            var progress = Math.min((now - start) / duration, 1);
            var resolved = Math.floor(progress * final.length);
            var out = final.slice(0, resolved);
            for (var i = resolved; i < final.length; i += 1) {
              out += final[i] === " " ? " " : glyphs[Math.floor(Math.random() * glyphs.length)];
            }
            el.textContent = out;
            if (progress < 1) {
              window.requestAnimationFrame(tick);
            } else {
              el.textContent = final;
            }
          }
          window.requestAnimationFrame(tick);
        }

        var observer = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              observer.unobserve(entry.target);
              decode(entry.target);
            }
          });
        }, { threshold: 0.5 });

        items.forEach(function (item) { observer.observe(item); });
      }

      function setupSpotlights() {
        if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
          return;
        }
        document.addEventListener("pointermove", function (event) {
          var target = event.target;
          var card = target && target.closest ? target.closest("[data-spotlight]") : null;
          if (!card) {
            return;
          }
          var rect = card.getBoundingClientRect();
          card.style.setProperty("--spot-x", (((event.clientX - rect.left) / rect.width) * 100).toFixed(2) + "%");
          card.style.setProperty("--spot-y", (((event.clientY - rect.top) / rect.height) * 100).toFixed(2) + "%");
        }, { passive: true });
      }

      function setupWorkflowTrace() {
        var canvas = document.querySelector("[data-workflow-trace]");
        if (!canvas || !canvas.getContext) {
          return;
        }
        var ctx = canvas.getContext("2d");
        var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        var nodes = [
          { x: 0.06, y: 0.68, label: "SYNC" },
          { x: 0.19, y: 0.34, label: "QUEUE" },
          { x: 0.33, y: 0.6, label: "FILTER" },
          { x: 0.31, y: 0.14, label: "CACHE" },
          { x: 0.52, y: 0.3, label: "DRAFT" },
          { x: 0.66, y: 0.62, label: "APPROVE" },
          { x: 0.83, y: 0.32, label: "PUBLISH" },
          { x: 0.94, y: 0.64, label: "LOG" }
        ];
        var edges = [[0, 1], [1, 2], [1, 3], [2, 4], [3, 4], [4, 5], [5, 6], [6, 7], [2, 5]];
        var packets = edges.map(function (edge, index) {
          return { edge: index, t: (index * 0.41) % 1, speed: 0.0018 + (index % 3) * 0.0011 };
        });
        var pointer = { x: 0.5, y: 0.5 };
        var eased = { x: 0.5, y: 0.5 };
        var palette = { line: "rgba(34,211,238,0.3)", node: "#22d3ee", packet: "#ffb454", label: "rgba(148,163,190,0.9)" };
        var frame = null;
        var visible = false;
        var width = 0;
        var height = 0;

        function readPalette() {
          var styles = window.getComputedStyle(document.documentElement);
          var primary = styles.getPropertyValue("--primary").trim() || "#22d3ee";
          var signal = styles.getPropertyValue("--signal").trim() || "#ffb454";
          var muted = styles.getPropertyValue("--muted-2").trim() || "#8d99aa";
          palette = { line: primary, node: primary, packet: signal, label: muted };
        }

        function resize() {
          var rect = canvas.getBoundingClientRect();
          if (!rect.width || !rect.height) {
            return;
          }
          var dpr = Math.min(window.devicePixelRatio || 1, 2);
          width = rect.width;
          height = rect.height;
          canvas.width = Math.round(rect.width * dpr);
          canvas.height = Math.round(rect.height * dpr);
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          if (reduceMotion) {
            draw();
          }
        }

        function point(node) {
          var driftX = (eased.x - 0.5) * 18;
          var driftY = (eased.y - 0.5) * 12;
          return {
            x: node.x * width + driftX,
            y: node.y * height + driftY
          };
        }

        function draw() {
          if (!width || !height) {
            return;
          }
          ctx.clearRect(0, 0, width, height);

          ctx.lineWidth = 1;
          ctx.globalAlpha = 0.32;
          ctx.strokeStyle = palette.line;
          edges.forEach(function (edge) {
            var from = point(nodes[edge[0]]);
            var to = point(nodes[edge[1]]);
            ctx.beginPath();
            ctx.moveTo(from.x, from.y);
            ctx.lineTo(to.x, to.y);
            ctx.stroke();
          });

          ctx.globalAlpha = 1;
          nodes.forEach(function (node) {
            var pos = point(node);
            var glow = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 18);
            glow.addColorStop(0, palette.node);
            glow.addColorStop(1, "transparent");
            ctx.globalAlpha = 0.16;
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 18, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 0.9;
            ctx.fillStyle = palette.node;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 2.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 0.72;
            ctx.fillStyle = palette.label;
            ctx.font = "600 9px Consolas, 'SF Mono', monospace";
            ctx.fillText(node.label, pos.x + 8, pos.y - 7);
          });

          if (!reduceMotion) {
            packets.forEach(function (packet) {
              var edge = edges[packet.edge];
              var from = point(nodes[edge[0]]);
              var to = point(nodes[edge[1]]);
              var t = packet.t;
              var x = from.x + (to.x - from.x) * t;
              var y = from.y + (to.y - from.y) * t;
              var glow = ctx.createRadialGradient(x, y, 0, x, y, 10);
              glow.addColorStop(0, palette.packet);
              glow.addColorStop(1, "transparent");
              ctx.globalAlpha = 0.5;
              ctx.fillStyle = glow;
              ctx.beginPath();
              ctx.arc(x, y, 10, 0, Math.PI * 2);
              ctx.fill();
              ctx.globalAlpha = 1;
              ctx.fillStyle = palette.packet;
              ctx.beginPath();
              ctx.arc(x, y, 1.8, 0, Math.PI * 2);
              ctx.fill();
            });
          }
          ctx.globalAlpha = 1;
        }

        function tick() {
          eased.x += (pointer.x - eased.x) * 0.04;
          eased.y += (pointer.y - eased.y) * 0.04;
          packets.forEach(function (packet) {
            packet.t += packet.speed;
            if (packet.t > 1) {
              packet.t = 0;
              var node = nodes[edges[packet.edge][1]];
              if (node) {
                window.dispatchEvent(new CustomEvent("trace:arrive", { detail: { stage: node.label } }));
              }
            }
          });
          draw();
          frame = window.requestAnimationFrame(tick);
        }

        function start() {
          if (reduceMotion || frame || !visible || document.hidden) {
            return;
          }
          frame = window.requestAnimationFrame(tick);
        }

        function stop() {
          if (frame) {
            window.cancelAnimationFrame(frame);
            frame = null;
          }
        }

        readPalette();
        resize();
        if (reduceMotion) {
          draw();
        }

        window.addEventListener("resize", function () {
          resize();
          if (reduceMotion) {
            draw();
          }
        });
        window.addEventListener("site-theme-change", function () {
          readPalette();
          draw();
        });
        window.addEventListener("pointermove", function (event) {
          pointer.x = event.clientX / window.innerWidth;
          pointer.y = event.clientY / window.innerHeight;
        }, { passive: true });
        document.addEventListener("visibilitychange", function () {
          if (document.hidden) {
            stop();
          } else {
            start();
          }
        });

        if ("IntersectionObserver" in window) {
          var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
              visible = entry.isIntersecting;
              if (visible) {
                start();
              } else {
                stop();
              }
            });
          }, { threshold: 0.05 });
          observer.observe(canvas);
        } else {
          visible = true;
          start();
        }

        window.addEventListener("trace:arrive", function (event) {
          var stage = event.detail && event.detail.stage;
          if (!stage) {
            return;
          }
          qa('[data-ignite="' + stage + '"]').forEach(function (element) {
            element.classList.remove("is-ignited");
            void element.offsetWidth;
            element.classList.add("is-ignited");
          });
        });
      }

      function qa(selector, root) {
        return Array.prototype.slice.call((root || document).querySelectorAll(selector));
      }

      function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
      }

      function prefersReducedMotion() {
        return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      }

      function routeTo(href) {
        var wipe = document.querySelector("[data-route-wipe]");
        if (prefersReducedMotion() || !wipe) {
          window.location.assign(href);
          return;
        }
        wipe.setAttribute("data-active", "true");
        window.setTimeout(function () {
          window.location.assign(href);
        }, 220);
      }

      function copyText(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () {
            showToast("Email copied", "success");
          }).catch(function () {
            window.location.href = "mailto:" + text;
          });
        } else {
          window.location.href = "mailto:" + text;
        }
      }

      function setupStatusDeck() {
        var deck = document.querySelector("[data-status-deck]");
        if (!deck) {
          return;
        }
        var clock = deck.querySelector("[data-deck-clock]");
        var stages = qa("[data-deck-stage]", deck);

        function pad(value) {
          return String(value).padStart(2, "0");
        }

        function tickClock() {
          if (!clock) {
            return;
          }
          var now = new Date();
          var utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
          var pkt = new Date(utcMs + 5 * 3600000);
          clock.textContent = "PKT " + pad(pkt.getHours()) + ":" + pad(pkt.getMinutes()) + ":" + pad(pkt.getSeconds());
        }

        var cachedMax = 1;
        function recomputeMax() {
          var docHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
          cachedMax = Math.max(docHeight - window.innerHeight, 1);
        }

        function litCount() {
          var progress = clamp(window.scrollY / cachedMax, 0, 1);
          return Math.max(1, Math.ceil(progress * stages.length));
        }

        var stageTicking = false;
        function updateStages() {
          if (stageTicking) {
            return;
          }
          stageTicking = true;
          window.requestAnimationFrame(function () {
            var lit = litCount();
            stages.forEach(function (stage, index) {
              stage.setAttribute("data-lit", index < lit ? "true" : "false");
            });
            stageTicking = false;
          });
        }

        tickClock();
        window.setInterval(tickClock, 1000);
        recomputeMax();
        updateStages();
        window.addEventListener("scroll", updateStages, { passive: true });
        window.addEventListener("resize", function () {
          recomputeMax();
          updateStages();
        });
      }

      function setupConsole() {
        var root = document.querySelector("[data-console]");
        var indexNode = document.getElementById("command-index");
        if (!root || !indexNode) {
          return;
        }

        var data;
        try {
          data = JSON.parse(indexNode.textContent || "{}");
        } catch (error) {
          return;
        }

        var input = root.querySelector("[data-console-input]");
        var list = root.querySelector("[data-console-results]");
        var emptyNote = root.querySelector("[data-console-empty]");
        var countNode = root.querySelector("[data-console-count]");
        var panel = root.querySelector("[data-console-panel]");
        var grip = root.querySelector("[data-console-grip]");
        if (!input || !list || !panel) {
          return;
        }

        var commands = [];
        (data.projects || []).forEach(function (project) {
          commands.push({
            group: "Run a system",
            label: project.title,
            sub: project.metric + " · " + project.status,
            metric: project.metric,
            live: project.status === "Private product" || project.status === "Internal lab",
            keywords: (project.keywords || "") + " " + project.metricLabel,
            type: "nav",
            payload: project.href
          });
        });
        (data.nav || []).forEach(function (item) {
          commands.push({
            group: "Go to",
            label: item.label,
            sub: item.href,
            keywords: "page navigate " + item.label,
            type: "nav",
            payload: item.href
          });
        });
        var actions = data.actions || {};
        commands.push({ group: "Actions", label: "Copy email", sub: actions.email, keywords: "contact mail copy", type: "copy", payload: actions.email });
        commands.push({ group: "Actions", label: "Download resume", sub: "PDF", keywords: "cv resume pdf download", type: "nav", payload: actions.resume });
        commands.push({ group: "Actions", label: "Toggle theme", sub: "light / dark", keywords: "dark light mode appearance theme", type: "theme", payload: "" });
        commands.push({ group: "Actions", label: "Open GitHub", sub: "github.com/Mustafaiqbal2", keywords: "code source github", type: "external", payload: actions.github });
        commands.push({ group: "Actions", label: "Open LinkedIn", sub: "linkedin", keywords: "linkedin profile", type: "external", payload: actions.linkedIn });

        var groupOrder = ["Run a system", "Go to", "Actions"];
        var optionEls = [];
        var activeIndex = 0;
        var lastFocused = null;

        function fuzzyScore(query, text) {
          query = query.toLowerCase();
          text = text.toLowerCase();
          if (!query) {
            return 0;
          }
          var ti = 0;
          var score = 0;
          var streak = 0;
          for (var qi = 0; qi < query.length; qi += 1) {
            var found = text.indexOf(query[qi], ti);
            if (found === -1) {
              return -1;
            }
            var prev = found === 0 ? " " : text[found - 1];
            if (prev === " " || prev === "-" || prev === "/" || prev === ".") {
              score += 4;
            }
            if (found === ti) {
              streak += 1;
              score += 2 + streak;
            } else {
              streak = 0;
              score += 1;
            }
            ti = found + 1;
          }
          return score - (text.length - query.length) * 0.04;
        }

        function render(query) {
          list.innerHTML = "";
          optionEls = [];
          var scored = commands.map(function (command) {
            return { command: command, score: fuzzyScore(query, command.label + " " + command.keywords) };
          }).filter(function (entry) {
            return entry.score >= 0;
          });

          var optionCounter = 0;
          groupOrder.forEach(function (group) {
            var entries = scored.filter(function (entry) {
              return entry.command.group === group;
            });
            if (!entries.length) {
              return;
            }
            if (query) {
              entries.sort(function (a, b) {
                return b.score - a.score;
              });
            }
            var header = document.createElement("li");
            header.className = "console-group";
            header.setAttribute("role", "presentation");
            header.textContent = group;
            list.appendChild(header);

            entries.forEach(function (entry) {
              var command = entry.command;
              var item = document.createElement("li");
              item.className = "console-option";
              item.id = "console-option-" + optionCounter;
              item.setAttribute("role", "option");
              item.setAttribute("data-type", command.type);
              var ledMarkup = command.live ? '<i class="console-led" aria-hidden="true"></i>' : "";
              item.innerHTML =
                ledMarkup +
                '<span class="console-option-label">' + command.label + "</span>" +
                (command.sub ? '<span class="console-option-sub">' + command.sub + "</span>" : "");
              item.addEventListener("click", function () {
                runCommand(command);
              });
              item.addEventListener("pointermove", function () {
                setActive(optionEls.indexOf(item));
              });
              list.appendChild(item);
              optionEls.push(item);
              command._el = item;
              optionCounter += 1;
            });
          });

          var hasResults = optionEls.length > 0;
          if (emptyNote) {
            emptyNote.hidden = hasResults;
          }
          if (countNode) {
            countNode.textContent = hasResults ? optionEls.length + (optionEls.length === 1 ? " result" : " results") : "No matches";
          }
          setActive(0);
        }

        function setActive(index) {
          if (!optionEls.length) {
            activeIndex = 0;
            input.removeAttribute("aria-activedescendant");
            return;
          }
          activeIndex = (index + optionEls.length) % optionEls.length;
          optionEls.forEach(function (element, elementIndex) {
            element.setAttribute("aria-selected", elementIndex === activeIndex ? "true" : "false");
          });
          var active = optionEls[activeIndex];
          input.setAttribute("aria-activedescendant", active.id);
          active.scrollIntoView({ block: "nearest" });
        }

        function commandFromEl(element) {
          for (var i = 0; i < commands.length; i += 1) {
            if (commands[i]._el === element) {
              return commands[i];
            }
          }
          return null;
        }

        function runCommand(command) {
          if (!command) {
            return;
          }
          if (command.type === "theme") {
            var next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
            applyTheme(next, true);
            return;
          }
          closeConsole();
          if (command.type === "copy") {
            copyText(command.payload);
          } else if (command.type === "external") {
            window.open(command.payload, "_blank", "noopener");
          } else {
            routeTo(command.payload);
          }
        }

        function openConsole() {
          if (!root.hasAttribute("hidden")) {
            return;
          }
          lastFocused = document.activeElement;
          root.removeAttribute("hidden");
          document.body.classList.add("console-open");
          input.value = "";
          render("");
          input.focus();
          window.requestAnimationFrame(function () {
            root.setAttribute("data-open", "true");
          });
        }

        function closeConsole() {
          if (root.hasAttribute("hidden")) {
            return;
          }
          root.removeAttribute("data-open");
          document.body.classList.remove("console-open");
          panel.style.transform = "";
          var finish = function () {
            root.setAttribute("hidden", "");
            root.removeEventListener("transitionend", finish);
          };
          if (prefersReducedMotion()) {
            finish();
          } else {
            root.addEventListener("transitionend", finish);
            window.setTimeout(finish, 260);
          }
          if (lastFocused && lastFocused.focus) {
            lastFocused.focus();
          }
        }

        input.addEventListener("input", function () {
          render(input.value.trim());
        });

        input.addEventListener("keydown", function (event) {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive(activeIndex + 1);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive(activeIndex - 1);
          } else if (event.key === "Enter") {
            event.preventDefault();
            if (optionEls.length) {
              runCommand(commandFromEl(optionEls[activeIndex]));
            }
          } else if (event.key === "Tab") {
            event.preventDefault();
          } else if (event.key === "Home") {
            event.preventDefault();
            setActive(0);
          } else if (event.key === "End") {
            event.preventDefault();
            setActive(optionEls.length - 1);
          }
        });

        qa("[data-console-open]").forEach(function (trigger) {
          trigger.addEventListener("click", function (event) {
            event.preventDefault();
            openConsole();
          });
        });

        qa("[data-console-close]", root).forEach(function (trigger) {
          trigger.addEventListener("click", closeConsole);
        });

        document.addEventListener("keydown", function (event) {
          if ((event.metaKey || event.ctrlKey) && (event.key === "k" || event.key === "K")) {
            event.preventDefault();
            if (root.hasAttribute("hidden")) {
              openConsole();
            } else {
              closeConsole();
            }
          } else if (event.key === "Escape" && !root.hasAttribute("hidden")) {
            event.preventDefault();
            closeConsole();
          }
        });

        document.addEventListener("focusin", function (event) {
          if (!root.hasAttribute("data-open")) {
            return;
          }
          if (!panel.contains(event.target)) {
            input.focus();
          }
        });

        if (grip && window.matchMedia("(hover: none), (pointer: coarse)").matches) {
          var startY = 0;
          var dragging = false;
          grip.addEventListener("touchstart", function (event) {
            startY = event.touches[0].clientY;
            dragging = true;
            panel.style.transition = "none";
          }, { passive: true });
          panel.addEventListener("touchmove", function (event) {
            if (!dragging) {
              return;
            }
            var delta = event.touches[0].clientY - startY;
            if (delta > 0) {
              panel.style.transform = "translateY(" + delta + "px)";
            }
          }, { passive: true });
          panel.addEventListener("touchend", function (event) {
            if (!dragging) {
              return;
            }
            dragging = false;
            panel.style.transition = "";
            var delta = event.changedTouches[0].clientY - startY;
            if (delta > 90) {
              closeConsole();
            } else {
              panel.style.transform = "";
            }
          });
        }
      }

      function setupPipelineMonitor() {
        var monitor = document.querySelector("[data-pipeline]");
        if (!monitor) {
          return;
        }
        var track = monitor.querySelector("[data-pipeline-track]");
        var dots = qa("[data-pipeline-dot]", monitor);
        if (!track || !dots.length) {
          return;
        }
        function update() {
          var rows = qa("[data-pipeline-row]", track);
          if (!rows.length) {
            return;
          }
          var step = rows[0].getBoundingClientRect().width + 12;
          var index = Math.min(rows.length - 1, Math.max(0, Math.round(track.scrollLeft / step)));
          dots.forEach(function (dot, dotIndex) {
            dot.setAttribute("aria-current", dotIndex === index ? "true" : "false");
          });
        }
        track.addEventListener("scroll", function () {
          window.requestAnimationFrame(update);
        }, { passive: true });
        update();
      }

      function setupKineticMasthead() {
        var root = document.querySelector("[data-kinetic]");
        if (!root) {
          return;
        }
        var words = qa("[data-kw]", root);
        if (!words.length) {
          return;
        }

        function lockWidths() {
          words.forEach(function (word) {
            word.style.minWidth = "";
            word.style.fontVariationSettings = "'wght' 780";
            var width = word.getBoundingClientRect().width;
            word.style.minWidth = Math.ceil(width) + "px";
            word.style.fontVariationSettings = "";
          });
        }

        if (document.fonts && document.fonts.ready) {
          document.fonts.ready.then(lockWidths);
        } else {
          lockWidths();
        }
        window.addEventListener("resize", lockWidths);

        if (prefersReducedMotion()) {
          return;
        }

        var centers = [];
        var heroVisible = true;
        function measure() {
          if (!heroVisible) {
            return;
          }
          centers = words.map(function (word) {
            var rect = word.getBoundingClientRect();
            return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
          });
        }
        measure();
        window.addEventListener("resize", measure);
        window.addEventListener("scroll", function () {
          if (heroVisible) {
            window.requestAnimationFrame(measure);
          }
        }, { passive: true });

        var pointer = { x: -9999, y: -9999 };
        var lastMove = 0;
        var radius = 260;
        var weights = [];
        var frameId = null;

        function onMove(x, y) {
          pointer.x = x;
          pointer.y = y;
          lastMove = Date.now();
        }
        window.addEventListener("pointermove", function (event) {
          onMove(event.clientX, event.clientY);
        }, { passive: true });
        root.addEventListener("touchmove", function (event) {
          var touch = event.touches[0];
          onMove(touch.clientX, touch.clientY);
        }, { passive: true });

        function frame() {
          var now = Date.now();
          var idle = now - lastMove > 1500;
          words.forEach(function (word, index) {
            var center = centers[index];
            if (!center) {
              return;
            }
            var t;
            if (idle) {
              t = 0.4 + 0.35 * Math.sin(now / 900 + index * 0.7);
            } else {
              var dx = pointer.x - center.x;
              var dy = pointer.y - center.y;
              var dist = Math.sqrt(dx * dx + dy * dy);
              t = clamp(1 - dist / radius, 0, 1);
            }
            var weight = Math.round((480 + t * 300) / 20) * 20;
            if (weights[index] !== weight) {
              weights[index] = weight;
              word.style.setProperty("--w", weight);
            }
          });
          frameId = window.requestAnimationFrame(frame);
        }

        function start() {
          if (frameId || !heroVisible || document.hidden) {
            return;
          }
          frameId = window.requestAnimationFrame(frame);
        }
        function stop() {
          if (frameId) {
            window.cancelAnimationFrame(frameId);
            frameId = null;
          }
        }

        document.addEventListener("visibilitychange", function () {
          if (document.hidden) {
            stop();
          } else {
            start();
          }
        });

        if ("IntersectionObserver" in window) {
          var kineticObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
              heroVisible = entry.isIntersecting;
              if (heroVisible) {
                measure();
                start();
              } else {
                stop();
              }
            });
          }, { threshold: 0.05 });
          kineticObserver.observe(root);
        } else {
          heroVisible = true;
          start();
        }
      }

      function setupGauges() {
        var gauges = qa("[data-gauge]");
        if (!gauges.length) {
          return;
        }
        var reduce = prefersReducedMotion();

        function fill(gauge) {
          var arc = gauge.querySelector("[data-gauge-arc]");
          if (!arc) {
            return;
          }
          var value = clamp(parseFloat(gauge.getAttribute("data-gauge")) || 0, 0, 1);
          var length = arc.getTotalLength ? arc.getTotalLength() : 100;
          arc.style.strokeDasharray = length;
          arc.style.strokeDashoffset = length * (1 - value);
        }

        if (reduce || !("IntersectionObserver" in window)) {
          gauges.forEach(fill);
          return;
        }

        var observer = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              observer.unobserve(entry.target);
              fill(entry.target);
            }
          });
        }, { threshold: 0.4 });
        gauges.forEach(function (gauge) {
          var arc = gauge.querySelector("[data-gauge-arc]");
          if (arc) {
            var length = arc.getTotalLength ? arc.getTotalLength() : 100;
            arc.style.strokeDasharray = length;
            arc.style.strokeDashoffset = length;
          }
          observer.observe(gauge);
        });
      }

      function setupProjectStories() {
        var stories = qa("[data-story]");
        if (!stories.length) {
          return;
        }
        var reduce = prefersReducedMotion();

        stories.forEach(function (story) {
          var stageNodes = qa("[data-story-stage]", story);
          var chips = qa("[data-story-chip]", story);
          var packet = story.querySelector("[data-story-packet]");
          var bench = story.querySelector("[data-story-bench]");
          var readout = story.querySelector("[data-story-readout]");

          if (reduce) {
            return;
          }

          story.setAttribute("data-js", "true");

          function apply(p) {
            var activeStage = Math.min(stageNodes.length, Math.round(p * (stageNodes.length + 0.6)));
            stageNodes.forEach(function (node, index) {
              node.setAttribute("data-lit", index < activeStage ? "true" : "false");
            });
            if (packet) {
              packet.style.setProperty("--p", p.toFixed(3));
            }
            chips.forEach(function (chip) {
              var at = parseFloat(chip.getAttribute("data-at") || "0.45");
              var skip = chip.getAttribute("data-skip") === "true";
              chip.setAttribute("data-drained", skip && p >= at ? "true" : "false");
              chip.setAttribute("data-moved", !skip && p >= at ? "true" : "false");
            });
            if (bench) {
              bench.style.setProperty("--b", clamp((p - 0.45) / 0.4, 0, 1).toFixed(3));
            }
            if (readout && stageNodes[Math.min(stageNodes.length - 1, Math.max(0, activeStage - 1))]) {
              var current = stageNodes[Math.min(stageNodes.length - 1, Math.max(0, activeStage - 1))];
              readout.textContent = current.getAttribute("data-readout") || "";
            }
          }

          var ticking = false;
          function onScroll() {
            if (ticking) {
              return;
            }
            ticking = true;
            window.requestAnimationFrame(function () {
              var rect = story.getBoundingClientRect();
              var vh = window.innerHeight;
              var span = rect.height + vh * 0.5;
              var p = clamp((vh * 0.85 - rect.top) / span, 0, 1);
              apply(p);
              ticking = false;
            });
          }

          onScroll();
          window.addEventListener("scroll", onScroll, { passive: true });
          window.addEventListener("resize", onScroll);
        });
      }

      function updateScrollProgress() {
        var bar = document.querySelector("[data-scroll-progress]");
        if (!bar) {
          return;
        }
        var documentHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
        var max = Math.max(documentHeight - window.innerHeight, 1);
        var progress = Math.min(Math.max(window.scrollY / max, 0), 1);
        bar.style.transform = "scaleX(" + progress + ")";
      }

      function showToast(message, type) {
        var region = document.querySelector("[data-toast-region]");
        if (!region) {
          return;
        }
        var toast = document.createElement("div");
        toast.className = "toast " + (type === "error" ? "toast-error" : "toast-success");
        toast.textContent = message;
        region.appendChild(toast);
        window.setTimeout(function () {
          toast.setAttribute("data-hiding", "true");
          window.setTimeout(function () { toast.remove(); }, 220);
        }, 3200);
      }
    })();
  `;

  const commandIndex = {
    projects: featuredProjects.map((project) => ({
      title: project.title,
      href: `/work/${project.slug}/`,
      metric: project.featuredMetric.value,
      metricLabel: project.featuredMetric.label,
      category: project.category,
      status: project.status,
      keywords: [project.category, project.status, ...project.stack].join(" ")
    })),
    nav: navigation.map((item) => ({ label: item.label, href: item.href })),
    actions: {
      email: profile.email,
      resume: profile.resume,
      github: profile.github,
      linkedIn: profile.linkedIn
    }
  };

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Person",
      name: profile.name,
      jobTitle: profile.title,
      email: `mailto:${profile.email}`,
      url: siteUrl,
      image: `${siteUrl}${profile.photo}`,
      address: {
        "@type": "PostalAddress",
        addressLocality: "Rawalpindi",
        addressRegion: "Punjab",
        addressCountry: "PK"
      },
      sameAs: [profile.github, profile.linkedIn],
      alumniOf: {
        "@type": "CollegeOrUniversity",
        name: "National University of Computer and Emerging Sciences"
      },
      knowsAbout: [
        "AI automation",
        "Retrieval-Augmented Generation",
        "LLM workflow systems",
        "FastAPI",
        "Next.js",
        "OAuth integrations",
        "Vector search",
        "CUDA"
      ]
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Mustafa Iqbal",
      url: siteUrl,
      description:
        "Mustafa Iqbal is an AI automation and full-stack engineer building LLM workflows, RAG systems, and integrations — shipped products with measured outcomes."
    }
  ];

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} ${bricolage.variable}`}>
        <a className="skip-link" href="#top">
          Skip to content
        </a>
        <div className="scroll-progress" data-scroll-progress aria-hidden="true" />
        <div className="route-wipe" data-route-wipe aria-hidden="true" />
        <SiteHeader />
        {children}
        <GlobalContact accessKey={process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY || ""} />
        <SiteFooter />
        <StatusDeck />
        <CommandConsole />
        <script
          type="application/json"
          id="command-index"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(commandIndex) }}
        />
        <div className="toast-region" data-toast-region aria-live="polite" aria-atomic="true" />
        <div className="image-lightbox" data-lightbox hidden>
          <button className="lightbox-backdrop" type="button" data-lightbox-close aria-label="Close image preview" />
          <div className="lightbox-panel" role="dialog" aria-modal="true" aria-label="Image preview">
            <button className="lightbox-close" type="button" data-lightbox-close>
              Close
            </button>
            <img src={profile.photo} alt="Mustafa Iqbal" />
          </div>
        </div>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </body>
    </html>
  );
}
