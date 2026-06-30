import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { GlobalContact } from "@/components/GlobalContact";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { profile, siteUrl } from "@/data/portfolio";
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

const instrumentSerif = Instrument_Serif({
  variable: "--font-editorial",
  subsets: ["latin"],
  weight: "400",
  display: "swap"
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Mustafa Iqbal | Software Engineer",
    template: "%s | Mustafa Iqbal"
  },
  description:
    "Portfolio for Mustafa Iqbal, a software engineer building AI automation products, full-stack apps, RAG workflows, mobile experiences, and systems projects.",
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
      "Portfolio for AI products, automation systems, full-stack apps, mobile experiences, RAG workflows, and systems projects.",
    siteName: "Mustafa Iqbal Portfolio",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Mustafa Iqbal portfolio preview"
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
      }

      try {
        applyTheme(localStorage.getItem("theme-preference") || "system", false);
      } catch (error) {}

      document.addEventListener("DOMContentLoaded", function () {
        var preference = localStorage.getItem("theme-preference") || "system";
        updateThemeControls(preference);
        updateActiveNav();
        setupReveals();
        setupCarousels();
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
          var src = document.documentElement.dataset.theme === "dark" && darkSrc ? darkSrc : lightSrc;
          var lightbox = document.querySelector("[data-lightbox]");
          var image = lightbox && lightbox.querySelector("img");
          if (lightbox && image && src) {
            image.setAttribute("src", src);
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
          status.textContent = "Sending message...";
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
              status.textContent = "Message sent. I will reply from my email.";
            }
            showToast("Message sent", "success");
          })
          .catch(function (error) {
            if (status) {
              status.textContent = error.message || "The form could not send. Email still works.";
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
      name: "Mustafa Iqbal Portfolio",
      url: siteUrl,
      description:
        "Portfolio for Mustafa Iqbal, an AI automation and full-stack engineer building LLM workflows, RAG systems, and startup product software."
    }
  ];

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable}`}>
        <div className="scroll-progress" data-scroll-progress aria-hidden="true" />
        <SiteHeader />
        {children}
        <GlobalContact accessKey={process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY || ""} />
        <SiteFooter />
        <div className="toast-region" data-toast-region aria-live="polite" aria-atomic="true" />
        <div className="image-lightbox" data-lightbox hidden>
          <button className="lightbox-backdrop" type="button" data-lightbox-close aria-label="Close image preview" />
          <div className="lightbox-panel" role="dialog" aria-modal="true" aria-label="Mustafa Iqbal photo preview">
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
