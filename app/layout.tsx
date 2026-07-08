import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { profile, siteUrl } from "@/data/portfolio";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap"
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap"
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Mustafa Iqbal — AI Automation Engineer",
    template: "%s — Mustafa Iqbal"
  },
  description:
    "I build production AI automation — OAuth integrations, background-job pipelines, and cost-aware LLM generation — that turns manual operational work into systems that run unattended. Full-stack, end to end.",
  alternates: { canonical: "/" },
  keywords: [
    "Mustafa Iqbal",
    "AI automation engineer",
    "Full-stack software engineer",
    "LLM engineer",
    "RAG engineer",
    "background jobs",
    "OAuth integrations",
    "Next.js",
    "FastAPI"
  ],
  authors: [{ name: profile.name, url: siteUrl }],
  creator: profile.name,
  publisher: profile.name,
  openGraph: {
    type: "website",
    url: siteUrl,
    title: "Mustafa Iqbal — AI Automation Engineer",
    description:
      "Production AI automation and the full-stack systems that keep it fast, cheap, and correct once real data and real users arrive.",
    siteName: "Mustafa Iqbal",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Mustafa Iqbal — AI Automation Engineer" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Mustafa Iqbal — AI Automation Engineer",
    description: "Production AI automation and the full-stack systems that keep it honest in production.",
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
      }
      try { applyTheme(localStorage.getItem("theme-preference") || "system", false); } catch (e) {}

      document.addEventListener("DOMContentLoaded", function () {
        var pref = "system";
        try { pref = localStorage.getItem("theme-preference") || "system"; } catch (e) {}
        updateControls(pref);
        [updateActiveNav, setupHeaderState, setupReveals, setupMobileNav, setupLightbox, setupCopyButtons].forEach(function (fn) {
          try { fn(); } catch (e) {}
        });
        var media = window.matchMedia("(prefers-color-scheme: dark)");
        media.addEventListener("change", function () {
          var p = "system";
          try { p = localStorage.getItem("theme-preference") || "system"; } catch (e) {}
          if (p === "system") { applyTheme("system", false); }
        });
      });

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

      function setupHeaderState() {
        var header = document.querySelector("[data-header]");
        if (!header) { return; }
        function update() { header.setAttribute("data-scrolled", window.scrollY > 12 ? "true" : "false"); }
        update();
        window.addEventListener("scroll", update, { passive: true });
      }

      function setupReveals() {
        var items = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
        var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (!items.length) { return; }
        if (reduce || !("IntersectionObserver" in window)) {
          items.forEach(function (i) { i.classList.add("is-visible"); });
          return;
        }
        var observer = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              observer.unobserve(entry.target);
            }
          });
        }, { rootMargin: "0px 0px -8% 0px", threshold: 0.1 });
        items.forEach(function (item, index) {
          if (!item.style.getPropertyValue("--reveal-delay")) {
            item.style.setProperty("--reveal-delay", Math.min(index % 6, 5) * 50 + "ms");
          }
          observer.observe(item);
        });
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
    jobTitle: "AI Automation Engineer",
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
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <a className="skip-link" href="#main">Skip to content</a>
        <SiteHeader />
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
