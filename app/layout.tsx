import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, JetBrains_Mono } from "next/font/google";
import { AnalyticsTracker } from "@/components/AnalyticsTracker";
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
    "Software engineer and founder in Islamabad. Building ArchPHI — the operating system for architectural drawings — with production AI agents and a factory site on page one behind it.",
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
      "Building ArchPHI — the operating system for architectural drawings — with production AI agents and a factory site on page one behind it.",
    siteName: "Mustafa Iqbal",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Mustafa Iqbal — Software Engineer & Founder" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Mustafa Iqbal — Software Engineer & Founder",
    description: "Building ArchPHI — the operating system for architectural drawings.",
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
  themeColor: "#f2f2ee"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Pre-hydration site script. The old theme system (resolveTheme,
  // data-theme, colorScheme writes) is gone: the site is single-look and
  // globals.css pins color-scheme. What remains is the no-js fallback flag,
  // the reveal observer, and the case-page lightbox.
  const siteScript = `
    (function () {
      document.documentElement.classList.remove("no-js");

      // Run AFTER hydration: setupReveals mutates server-rendered class
      // lists; doing it at DOMContentLoaded races React and triggers
      // hydration mismatches.
      function initAfterHydration() {
        [setupReveals, setupLightbox].forEach(function (fn) {
          try { fn(); } catch (e) {}
        });
      }
      if (document.readyState === "complete") {
        window.setTimeout(initAfterHydration, 0);
      } else {
        window.addEventListener("load", function () { window.setTimeout(initAfterHydration, 0); });
      }

      function setupReveals() {
        var items = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
        if (!items.length) { return; }
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
          items.forEach(function (i) { i.classList.add("is-visible"); });
          return;
        }
        var observer = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            entry.target.classList.toggle("is-visible", entry.isIntersecting);
          });
        }, { rootMargin: "-9% 0px -9% 0px", threshold: 0 });
        items.forEach(function (item) { observer.observe(item); });
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
        <script dangerouslySetInnerHTML={{ __html: siteScript }} />
      </head>
      <body className={`${displaySans.variable} ${monoFont.variable}`}>
        <AnalyticsTracker />
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
