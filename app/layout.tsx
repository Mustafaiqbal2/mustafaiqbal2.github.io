import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, JetBrains_Mono } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import { profile, siteUrl } from "@/data/portfolio";
import "./globals.css";

const displaySans = Bricolage_Grotesque({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap"
});

const monoFont = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap"
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Mustafa Iqbal — Software Engineer & Founder",
    template: "%s — Mustafa Iqbal"
  },
  description:
    "Software engineer and founder in Islamabad. AI agents for Simplabots, a search platform for a cable manufacturer, and ArchPHI — a company that reads architects' drawings and writes bills of quantities.",
  alternates: { canonical: "/" },
  keywords: [
    "Mustafa Iqbal",
    "Software engineer",
    "Founder",
    "AI agents",
    "LLM engineer",
    "Full-stack engineer",
    "ArchPHI",
    "Next.js",
    "SEO engineering"
  ],
  authors: [{ name: profile.name, url: siteUrl }],
  creator: profile.name,
  publisher: profile.name,
  openGraph: {
    type: "website",
    url: siteUrl,
    title: "Mustafa Iqbal — Software Engineer & Founder",
    description:
      "AI agents for Simplabots, a search platform for a cable manufacturer, and ArchPHI — a company that reads architects' drawings and writes bills of quantities.",
    siteName: "Mustafa Iqbal",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Mustafa Iqbal — Software Engineer & Founder" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Mustafa Iqbal — Software Engineer & Founder",
    description: "AI agents for Simplabots, a search platform for a cable manufacturer, and ArchPHI.",
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
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F6F8" },
    { media: "(prefers-color-scheme: dark)", color: "#101216" }
  ]
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const themeScript = `
    (function () {
      document.documentElement.classList.remove("no-js");
      function resolveTheme(pref) {
        var systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        return pref === "system" ? (systemDark ? "dark" : "light") : pref;
      }
      function updateControls(pref) {
        var buttons = document.querySelectorAll("[data-theme-choice]");
        for (var i = 0; i < buttons.length; i += 1) {
          buttons[i].setAttribute("aria-pressed", buttons[i].getAttribute("data-theme-choice") === pref ? "true" : "false");
        }
      }
      function applyTheme(pref, persist) {
        var theme = resolveTheme(pref);
        document.documentElement.dataset.theme = theme;
        document.documentElement.dataset.themePreference = pref;
        document.documentElement.style.colorScheme = theme;
        if (persist) { try { localStorage.setItem("theme-preference", pref); } catch (e) {} }
        updateControls(pref);
        window.dispatchEvent(new Event("site-theme-change"));
      }
      try { applyTheme(localStorage.getItem("theme-preference") || "system", false); } catch (e) {}

      // Run AFTER hydration: these setups mutate server-rendered attributes
      // (data-scrolled, progress transform, reveal delays); doing it at
      // DOMContentLoaded races React and triggers hydration mismatches.
      function initAfterHydration() {
        var pref = "system";
        try { pref = localStorage.getItem("theme-preference") || "system"; } catch (e) {}
        updateControls(pref);
        [updateActiveNav, setupReveals, setupHero, setupMobileNav, setupLightbox, setupCopyButtons].forEach(function (fn) {
          try { fn(); } catch (e) {}
        });
        var media = window.matchMedia("(prefers-color-scheme: dark)");
        media.addEventListener("change", function () {
          var p = "system";
          try { p = localStorage.getItem("theme-preference") || "system"; } catch (e) {}
          if (p === "system") { applyTheme("system", false); }
        });
      }
      if (document.readyState === "complete") {
        window.setTimeout(initAfterHydration, 0);
      } else {
        window.addEventListener("load", function () { window.setTimeout(initAfterHydration, 0); });
      }

      document.addEventListener("click", function (event) {
        var t = event.target;
        var themeBtn = t && t.closest ? t.closest("[data-theme-choice]") : null;
        if (themeBtn) { applyTheme(themeBtn.getAttribute("data-theme-choice") || "system", true); return; }
      });

      function updateActiveNav() {
        var path = window.location.pathname;
        var links = Array.prototype.slice.call(document.querySelectorAll("[data-nav-link]"));
        links.forEach(function (link) {
          var href = link.getAttribute("href") || "/";
          var active = href === "/" ? path === "/" : path === href || path.indexOf(href) === 0;
          if (active) { link.setAttribute("aria-current", "page"); }
          else { link.removeAttribute("aria-current"); }
        });
      }

      // setupHeaderState is gone with the header: it wrote --scroll-p onto
      // <html> every scroll frame, forcing a full-document style recalc per
      // frame for a progress bar that no longer exists.

      function prefersReduced() {
        return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      }

      function setupReveals() {
        var items = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
        if (!items.length) { return; }
        if (prefersReduced() || !("IntersectionObserver" in window)) {
          items.forEach(function (i) { i.classList.add("is-visible"); });
          return;
        }
        var lastY = window.scrollY;
        window.addEventListener("scroll", function () {
          var y = window.scrollY;
          if (Math.abs(y - lastY) > 2) {
            document.documentElement.setAttribute("data-scroll-dir", y > lastY ? "down" : "up");
            lastY = y;
          }
        }, { passive: true });
        var observer = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            entry.target.classList.toggle("is-visible", entry.isIntersecting);
          });
        }, { rootMargin: "-9% 0px -9% 0px", threshold: 0 });
        items.forEach(function (item) {
          // stagger delays come from CSS now (hydration-safe)
          observer.observe(item);
        });
      }

      function setupHero() {
        var hero = document.querySelector("[data-hero]");
        if (!hero) { return; }
        var reduce = prefersReduced();
        var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

        if (fine && !reduce) {
          hero.addEventListener("pointermove", function (event) {
            var r = hero.getBoundingClientRect();
            hero.style.setProperty("--mx", (((event.clientX - r.left) / r.width - 0.5) * 2).toFixed(3));
            hero.style.setProperty("--my", (((event.clientY - r.top) / r.height - 0.5) * 2).toFixed(3));
          }, { passive: true });
          hero.addEventListener("pointerleave", function () {
            hero.style.setProperty("--mx", "0");
            hero.style.setProperty("--my", "0");
          });
        }

        var canvas = hero.querySelector("[data-hero-field]");
        if (!canvas || !canvas.getContext) { return; }
        var ctx = canvas.getContext("2d");
        var anchor = hero.querySelector("[data-hero-anchor]");
        var W = 0, H = 0, dpr = 1, points = [], frame = null, visible = true, prog = 0;
        var target = { x0: 0, x1: 0, y: 0 };
        var accent = "#2a45c4";

        function readAccent() {
          accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#2a45c4";
        }
        function computeTarget(r) {
          if (anchor) {
            var ar = anchor.getBoundingClientRect();
            target = { x0: ar.left - r.left, x1: ar.right - r.left, y: ar.bottom - r.top + 6 };
          } else {
            target = { x0: W * 0.08, x1: W * 0.45, y: H * 0.62 };
          }
        }
        function count() { return window.innerWidth < 680 ? 24 : 54; }
        function build() {
          var n = count();
          points = [];
          for (var i = 0; i < n; i += 1) {
            points.push({
              sx: Math.random() * W,
              sy: Math.random() * H,
              tx: target.x0 + (target.x1 - target.x0) * (n > 1 ? i / (n - 1) : 0.5),
              ty: target.y + (Math.random() - 0.5) * 3,
              ph: Math.random() * Math.PI * 2,
              sp: 0.4 + Math.random() * 0.7,
              x: 0,
              y: 0
            });
          }
        }
        function resize() {
          var r = canvas.getBoundingClientRect();
          if (!r.width || !r.height) { return; }
          dpr = Math.min(window.devicePixelRatio || 1, 1.6);
          W = r.width; H = r.height;
          canvas.width = Math.round(W * dpr);
          canvas.height = Math.round(H * dpr);
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          computeTarget(r);
          build();
        }
        function updateProgress() {
          var r = hero.getBoundingClientRect();
          prog = Math.max(0, Math.min(1, -r.top / (r.height * 0.72)));
        }
        function draw(now) {
          ctx.clearRect(0, 0, W, H);
          var p = prog;
          var i, j;
          for (i = 0; i < points.length; i += 1) {
            var pt = points[i];
            var bx = pt.sx + Math.sin(now / 1700 + pt.ph) * 11 * pt.sp;
            var by = pt.sy + Math.cos(now / 2000 + pt.ph) * 9 * pt.sp;
            pt.x = bx + (pt.tx - bx) * p;
            pt.y = by + (pt.ty - by) * p;
          }
          ctx.strokeStyle = accent;
          ctx.lineWidth = 1;
          var linkAlpha = 0.14 * (1 - p);
          if (linkAlpha > 0.01) {
            for (i = 0; i < points.length; i += 1) {
              for (j = i + 1; j < points.length; j += 1) {
                var dx = points[i].x - points[j].x;
                var dy = points[i].y - points[j].y;
                var dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 118) {
                  ctx.globalAlpha = linkAlpha * (1 - dist / 118);
                  ctx.beginPath();
                  ctx.moveTo(points[i].x, points[i].y);
                  ctx.lineTo(points[j].x, points[j].y);
                  ctx.stroke();
                }
              }
            }
          }
          ctx.fillStyle = accent;
          for (i = 0; i < points.length; i += 1) {
            ctx.globalAlpha = 0.4 + 0.5 * p;
            ctx.beginPath();
            ctx.arc(points[i].x, points[i].y, 1.7, 0, Math.PI * 2);
            ctx.fill();
          }
          if (p > 0.5) {
            ctx.globalAlpha = ((p - 0.5) / 0.5) * 0.8;
            ctx.strokeStyle = accent;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(target.x0, target.y);
            ctx.lineTo(target.x1, target.y);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
          if (visible && !document.hidden) {
            frame = window.requestAnimationFrame(draw);
          } else {
            frame = null;
          }
        }
        function start() {
          if (frame || !visible || document.hidden || reduce) { return; }
          frame = window.requestAnimationFrame(draw);
        }
        function stop() {
          if (frame) { window.cancelAnimationFrame(frame); frame = null; }
        }

        readAccent();
        resize();
        updateProgress();
        window.addEventListener("resize", function () { resize(); });
        window.addEventListener("scroll", function () { updateProgress(); }, { passive: true });
        window.addEventListener("site-theme-change", readAccent);
        document.addEventListener("visibilitychange", function () { if (document.hidden) { stop(); } else { start(); } });

        if (reduce) {
          prog = 0;
          draw(0);
          stop();
          return;
        }
        if ("IntersectionObserver" in window) {
          new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
              visible = entry.isIntersecting;
              if (visible) { start(); } else { stop(); }
            });
          }, { threshold: 0.02 }).observe(canvas);
        }
        start();
      }

      function setupMobileNav() {
        var nav = document.querySelector("[data-mobile-nav]");
        var toggle = document.querySelector("[data-nav-toggle]");
        if (!nav || !toggle) { return; }
        var lastFocused = null;

        function focusables() {
          return Array.prototype.slice.call(
            nav.querySelectorAll('a[href], button:not([disabled])')
          ).filter(function (el) { return el.offsetParent !== null; });
        }
        function open() {
          lastFocused = document.activeElement;
          nav.removeAttribute("hidden");
          document.body.classList.add("nav-open");
          toggle.setAttribute("aria-expanded", "true");
          window.requestAnimationFrame(function () {
            nav.setAttribute("data-open", "true");
            var first = nav.querySelector("[data-nav-close]");
            if (first) { first.focus(); }
          });
        }
        function close() {
          nav.removeAttribute("data-open");
          document.body.classList.remove("nav-open");
          toggle.setAttribute("aria-expanded", "false");
          var finish = function () { nav.setAttribute("hidden", ""); nav.removeEventListener("transitionend", finish); };
          if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { finish(); }
          else { nav.addEventListener("transitionend", finish); window.setTimeout(finish, 260); }
          if (lastFocused && lastFocused.focus) { lastFocused.focus(); }
        }
        toggle.addEventListener("click", function () {
          if (nav.hasAttribute("hidden")) { open(); } else { close(); }
        });
        nav.addEventListener("click", function (event) {
          var t = event.target;
          if (t.closest("[data-nav-close]") || t.closest("[data-nav-backdrop]") || (t.closest("a") && !t.closest("[data-theme-toggle]"))) {
            close();
          }
        });
        document.addEventListener("keydown", function (event) {
          if (nav.hasAttribute("hidden")) { return; }
          if (event.key === "Escape") { event.preventDefault(); close(); }
          if (event.key === "Tab") {
            var f = focusables();
            if (!f.length) { return; }
            var firstEl = f[0], lastEl = f[f.length - 1];
            if (event.shiftKey && document.activeElement === firstEl) { event.preventDefault(); lastEl.focus(); }
            else if (!event.shiftKey && document.activeElement === lastEl) { event.preventDefault(); firstEl.focus(); }
          }
        });
      }

      function setupLightbox() {
        var box = document.querySelector("[data-lightbox]");
        if (!box) { return; }
        var image = box.querySelector("img");
        var lastTrigger = null;
        function close() {
          box.setAttribute("hidden", "");
          document.body.classList.remove("nav-open");
          if (lastTrigger && lastTrigger.focus) { lastTrigger.focus(); }
        }
        document.addEventListener("click", function (event) {
          var trigger = event.target && event.target.closest ? event.target.closest("[data-lightbox-open]") : null;
          if (trigger && image) {
            lastTrigger = trigger;
            image.setAttribute("src", trigger.getAttribute("data-lightbox-open"));
            image.setAttribute("alt", trigger.getAttribute("data-lightbox-alt") || "");
            box.removeAttribute("hidden");
            document.body.classList.add("nav-open");
            var closeBtn = box.querySelector(".lightbox__close");
            if (closeBtn) { closeBtn.focus(); }
            return;
          }
          if (event.target && event.target.closest && event.target.closest("[data-lightbox-close]")) { close(); }
        });
        document.addEventListener("keydown", function (event) {
          if (box.hasAttribute("hidden")) { return; }
          if (event.key === "Escape") { event.preventDefault(); close(); }
          if (event.key === "Tab") {
            var f = Array.prototype.slice.call(box.querySelectorAll("[data-lightbox-close]"));
            if (!f.length) { return; }
            var firstEl = f[0], lastEl = f[f.length - 1];
            if (event.shiftKey && document.activeElement === firstEl) { event.preventDefault(); lastEl.focus(); }
            else if (!event.shiftKey && document.activeElement === lastEl) { event.preventDefault(); firstEl.focus(); }
          }
        });
      }

      function setupCopyButtons() {
        document.addEventListener("click", function (event) {
          var btn = event.target && event.target.closest ? event.target.closest("[data-copy]") : null;
          if (!btn) { return; }
          var text = btn.getAttribute("data-copy");
          var label = btn.querySelector("[data-copy-label]");
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () {
              btn.setAttribute("data-copied", "true");
              if (label) { label.textContent = "Copied"; }
              window.setTimeout(function () {
                btn.removeAttribute("data-copied");
                if (label) { label.textContent = "Copy email"; }
              }, 1800);
            });
          }
        });
      }
    })();
  `;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.name,
    jobTitle: "Software Engineer & Founder",
    email: `mailto:${profile.email}`,
    url: siteUrl,
    image: `${siteUrl}${profile.photo}`,
    address: { "@type": "PostalAddress", addressLocality: "Islamabad", addressCountry: "PK" },
    sameAs: [profile.github, profile.linkedIn],
    alumniOf: {
      "@type": "CollegeOrUniversity",
      name: "National University of Computer and Emerging Sciences (FAST-NUCES)"
    },
    knowsAbout: ["AI automation", "LLM pipelines", "Retrieval-Augmented Generation", "OAuth integrations", "Background job systems", "Full-stack engineering"]
  };

  return (
    <html lang="en" className="no-js" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${displaySans.variable} ${monoFont.variable}`}>
        <a className="skip-link" href="#main">Skip to content</a>
        {children}
        <SiteFooter />
        <div className="lightbox" data-lightbox hidden>
          <button className="lightbox__backdrop" type="button" data-lightbox-close aria-label="Close image" />
          <div className="lightbox__panel" role="dialog" aria-modal="true" aria-label="Image preview">
            <button className="lightbox__close" type="button" data-lightbox-close>Close</button>
            <img alt="" />
          </div>
        </div>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </body>
    </html>
  );
}
