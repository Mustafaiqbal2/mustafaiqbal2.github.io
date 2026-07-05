import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import { GlobalContact } from "@/components/GlobalContact";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { profile, siteUrl } from "@/data/portfolio";
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
    default: "Mustafa Iqbal | Software Engineer",
    template: "%s | Mustafa Iqbal"
  },
  description:
    "Mustafa Iqbal is a software engineer building AI automation products, full-stack apps, RAG workflows, mobile experiences, and systems projects.",
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
    "YC startup engineer",
    "Gmail automation",
    "Google Business Profile automation"
  ],
  authors: [{ name: profile.name, url: siteUrl }],
  creator: profile.name,
  publisher: profile.name,
  openGraph: {
    type: "website",
    url: siteUrl,
    title: "Mustafa Iqbal | Software Engineer",
    description:
      "AI products, automation systems, full-stack apps, mobile experiences, RAG workflows, and systems projects.",
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
    title: "Mustafa Iqbal | Software Engineer",
    description: "AI products, automation systems, full-stack apps, mobile experiences, RAG workflows, and systems projects.",
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
              statusMessage.textContent = "Message sent. I will reply from my email.";
            }
            showToast("Message sent", "success");
          })
          .catch(function (error) {
            if (status) {
              status.setAttribute("data-status", "error");
            }
            if (statusMessage) {
              statusMessage.textContent = error.message || "The form could not send. Email still works.";
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
        "Mustafa Iqbal is an AI automation and full-stack engineer building LLM workflows, RAG systems, and startup product software."
    }
  ];

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} ${bricolage.variable}`}>
        <div className="scroll-progress" data-scroll-progress aria-hidden="true" />
        <SiteHeader />
        {children}
        <GlobalContact accessKey={process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY || ""} />
        <SiteFooter />
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
