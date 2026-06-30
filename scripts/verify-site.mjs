import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const base = process.argv[2] || "http://127.0.0.1:4174";
const chromePath = process.env.CHROME_EXECUTABLE_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";

const routes = [
  "/",
  "/work/",
  "/work/simplabots-agentic-saas/",
  "/work/revvy-review-automation/",
  "/work/emmy-email-categorization/",
  "/work/cad-understanding-core/",
  "/work/melodymind/",
  "/work/recruitment-rag-platform/",
  "/resume/",
  "/about/",
  "/contact/",
  "/robots.txt",
  "/sitemap.xml",
  "/resume/Mustafa_Iqbal_Full_Resume.pdf"
];

const mediaAssets = [
  "/favicon.svg",
  "/icon.svg",
  "/og-image.png",
  "/images/me.jpeg",
  "/projects/simplabots/thumb-light.webp",
  "/projects/simplabots/thumb-dark.webp",
  "/projects/simplabots/platform-topology-light.webp",
  "/projects/simplabots/platform-topology-dark.webp",
  "/projects/simplabots/platform-flow-light.webp",
  "/projects/simplabots/platform-flow-dark.webp",
  "/projects/simplabots/prisma-erd-light.webp",
  "/projects/simplabots/prisma-erd-dark.webp",
  "/projects/simplabots/domain-model-light.webp",
  "/projects/simplabots/domain-model-dark.webp",
  "/projects/revvy/revvy-demo.mp4",
  "/projects/revvy/revvy-poster.webp",
  "/projects/revvy/revvy-screenshot.webp",
  "/projects/revvy/review-flow-light.webp",
  "/projects/revvy/review-flow-dark.webp",
  "/projects/revvy/review-erd-light.webp",
  "/projects/revvy/review-erd-dark.webp",
  "/projects/revvy/performance-pipeline-light.webp",
  "/projects/revvy/performance-pipeline-dark.webp",
  "/projects/emmy/emmy-screenshot.webp",
  "/projects/emmy/email-flow-light.webp",
  "/projects/emmy/email-flow-dark.webp",
  "/projects/emmy/email-erd-light.webp",
  "/projects/emmy/email-erd-dark.webp",
  "/projects/emmy/classification-loop-light.webp",
  "/projects/emmy/classification-loop-dark.webp",
  "/projects/cad-understanding/drawing-contexts.webp",
  "/projects/cad-understanding/space-hypotheses.webp",
  "/projects/cad-understanding/boundary-graph.webp",
  "/projects/cad-understanding/safety-contract-light.webp",
  "/projects/cad-understanding/safety-contract-dark.webp",
  "/projects/melodymind/thesis-page-39.webp",
  "/projects/melodymind/thesis-page-40.webp",
  "/projects/melodymind/music-architecture-light.webp",
  "/projects/melodymind/music-architecture-dark.webp",
  "/projects/recruitment-rag/recruitment-flow-light.webp",
  "/projects/recruitment-rag/recruitment-flow-dark.webp",
  "/projects/recruitment-rag/interview-demo-frame-1.webp",
  "/projects/recruitment-rag/interview-demo-frame-2.webp",
  "/projects/recruitment-rag/job-automation-frame-1.webp",
  "/resume/Mustafa_Iqbal_Full_Resume.pdf"
];

const expectedLayoutMarkers = {
  "/work/simplabots-agentic-saas/": ".case-layout-platform .platform-stack-map",
  "/work/revvy-review-automation/": ".case-layout-performance .performance-stage-carousel",
  "/work/emmy-email-categorization/": ".case-layout-classification .email-routing-board",
  "/work/cad-understanding-core/": ".case-layout-cad .contract-panel",
  "/work/melodymind/": ".case-layout-music .music-journey-carousel",
  "/work/recruitment-rag-platform/": ".case-layout-rag .rag-lane-carousel"
};

const visualRoutes = [
  "/",
  "/work/",
  "/work/simplabots-agentic-saas/",
  "/work/revvy-review-automation/",
  "/work/emmy-email-categorization/",
  "/work/cad-understanding-core/",
  "/work/melodymind/",
  "/work/recruitment-rag-platform/",
  "/resume/",
  "/about/",
  "/contact/"
];
const viewports = [
  { name: "mobile", width: 390, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 1000 }
];

const shotDir = path.join(process.cwd(), "audit-shots");
fs.mkdirSync(shotDir, { recursive: true });

async function verifyStatus(paths, label) {
  const failures = [];

  for (const route of paths) {
    const response = await fetch(`${base}${route}`, { redirect: "manual" });
    if (response.status >= 400) {
      failures.push(`${label} ${route} returned ${response.status}`);
    }
    await response.body?.cancel();
  }

  return failures;
}

async function main() {
  const failures = [];
  failures.push(...(await verifyStatus(routes, "Route")));
  failures.push(...(await verifyStatus(mediaAssets, "Media")));

  const browser = await chromium.launch({ executablePath: chromePath, headless: true });

  for (const viewport of viewports) {
    for (const theme of ["light", "dark"]) {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
      await context.addInitScript((themeName) => localStorage.setItem("theme-preference", themeName), theme);
      const page = await context.newPage();

      for (const route of visualRoutes) {
        await page.goto(`${base}${route}`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForTimeout(220);

        const safeRoute = route === "/" ? "home" : route.replace(/^\//, "").replace(/\/$/, "").replace(/\//g, "-");
        await page.screenshot({ path: path.join(shotDir, `${safeRoute}-${viewport.name}-${theme}.png`), fullPage: false });

        const data = await page.evaluate((layoutMarkers) => {
          const bodyText = document.body.innerText;
          const inViewportBroken = Array.from(document.images)
            .filter((img) => {
              const rect = img.getBoundingClientRect();
              const visible =
                rect.bottom > 0 &&
                rect.top < window.innerHeight &&
                rect.right > 0 &&
                rect.left < window.innerWidth &&
                getComputedStyle(img).display !== "none";
              return visible && (!img.complete || img.naturalWidth === 0);
            })
            .map((img) => img.getAttribute("src"));

          return {
            overflow: document.documentElement.scrollWidth - window.innerWidth,
            avatarUsesNewPhoto: document.querySelector(".brand-avatar")?.currentSrc.includes("me.jpeg") ?? false,
            inViewportBroken,
            textHasEncodingArtifact: bodyText.includes(String.fromCharCode(65533)) || bodyText.includes(String.fromCharCode(194)),
            textHasPlaceholder: /lorem|todo|placeholder|dummy text|your name here/i.test(bodyText),
            textHasPhone: /(\+?92|0)?3\d{2}[- .]?\d{7}/.test(bodyText),
            formCount: document.querySelectorAll("[data-contact-form]").length,
            globalContactCount: document.querySelectorAll(".global-contact").length,
            contactCtaCount: document.querySelectorAll(".contact-cta").length,
            sendDisabled: document.querySelector('.contact-form button[type="submit"]')?.disabled ?? null,
            textHasFallback: bodyText.includes("Email fallback:"),
            textHasGroundedIn: /what this page is grounded in/i.test(bodyText),
            textHasParallelHeadline: Array.from(document.querySelectorAll(".metric")).some((metric) => /20\s*parallel|parallel ai calls/i.test(metric.innerText || "")),
            footerHasDocumentRag: Array.from(document.querySelectorAll(".site-footer a")).some((a) => a.textContent?.trim() === "Document RAG"),
            emptyMetricCells: Array.from(document.querySelectorAll(".metric")).filter((metric) => !metric.innerText.trim()).length,
            homepageHasAvailabilityChip: location.pathname === "/" && bodyText.includes("Open to remote AI engineering roles"),
            homeGradient: getComputedStyle(document.querySelector(".nav-home")).backgroundImage,
            activeNavCount: document.querySelectorAll("[data-nav-link].is-active").length,
            activeNavCurrent: document.querySelector("[data-nav-link].is-active")?.getAttribute("href") || "",
            sectionGutter: (() => {
              const inner = document.querySelector(".section-inner");
              if (!inner) return null;
              const rect = inner.getBoundingClientRect();
              return Math.round(window.innerWidth - rect.width);
            })(),
            expectedLayoutPresent: (() => {
              const selector = layoutMarkers[location.pathname];
              return selector ? Boolean(document.querySelector(selector)) : true;
            })(),
            reelObjectFits: Array.from(document.querySelectorAll(".reel-card img")).map((img) => getComputedStyle(img).objectFit),
            projectObjectFits: Array.from(document.querySelectorAll(".project-card-media img")).map((img) => getComputedStyle(img).objectFit),
            darkProjectMediaVisible: (() => {
              if (document.documentElement.dataset.theme !== "dark") return true;
              const themed = Array.from(document.querySelectorAll(".media-frame .theme-media-dark"));
              return themed.length === 0 || themed.some((img) => getComputedStyle(img).display !== "none");
            })(),
            mobileMenuExists: Boolean(document.querySelector(".mobile-menu")),
            carouselExists: location.pathname === "/" ? Boolean(document.querySelector("[data-project-carousel]")) : true,
            railCount: document.querySelectorAll("[data-carousel-rail]").length,
            visibleRailControls: Array.from(document.querySelectorAll("[data-carousel-rail]")).filter((rail) => rail.getAttribute("data-can-scroll") === "true").length,
            hasGridEvidenceRows: Boolean(document.querySelector(".achievement-board, .skills-grid, .secondary-grid .secondary-card, .project-grid .project-card")),
            theme: document.documentElement.dataset.theme
          };
        }, expectedLayoutMarkers);

        if (data.overflow > 2) failures.push(`${route} ${viewport.name} ${theme} horizontal overflow ${data.overflow}`);
        if (!data.avatarUsesNewPhoto) failures.push(`${route} ${viewport.name} ${theme} avatar is not using me.jpeg`);
        if (data.inViewportBroken.length) {
          failures.push(`${route} ${viewport.name} ${theme} broken in-viewport images ${data.inViewportBroken.join(", ")}`);
        }
        if (data.textHasEncodingArtifact) failures.push(`${route} ${viewport.name} ${theme} has encoding artifact`);
        if (data.textHasPlaceholder) failures.push(`${route} ${viewport.name} ${theme} has placeholder marker`);
        if (data.textHasPhone) failures.push(`${route} ${viewport.name} ${theme} has phone-like public text`);
        if (data.formCount !== 1) failures.push(`${route} ${viewport.name} ${theme} expected one contact form, got ${data.formCount}`);
        if (data.globalContactCount !== 1) failures.push(`${route} ${viewport.name} ${theme} expected one global contact section`);
        if (data.contactCtaCount !== 0) failures.push(`${route} ${viewport.name} ${theme} has duplicated contact CTA`);
        if (data.sendDisabled) failures.push(`${route} ${viewport.name} ${theme} contact send button disabled`);
        if (data.textHasFallback) failures.push(`${route} ${viewport.name} ${theme} has email fallback text`);
        if (data.textHasGroundedIn) failures.push(`${route} ${viewport.name} ${theme} has grounded-in evidence copy`);
        if (data.textHasParallelHeadline) failures.push(`${route} ${viewport.name} ${theme} has 20-call headline metric`);
        if (data.footerHasDocumentRag) failures.push(`${route} ${viewport.name} ${theme} footer still links Document RAG`);
        if (data.emptyMetricCells) failures.push(`${route} ${viewport.name} ${theme} has empty metric cells`);
        if (data.homepageHasAvailabilityChip) failures.push(`${route} ${viewport.name} ${theme} homepage still shows availability chip text`);
        if (!data.homeGradient.includes("gradient")) failures.push(`${route} ${viewport.name} ${theme} Home nav gradient missing`);
        if (data.activeNavCount < 1) failures.push(`${route} ${viewport.name} ${theme} active nav state missing`);
        if (data.sectionGutter !== null && data.sectionGutter > (viewport.name === "mobile" ? 16 : viewport.name === "tablet" ? 54 : 96)) {
          failures.push(`${route} ${viewport.name} ${theme} section gutters too wide (${data.sectionGutter}px)`);
        }
        if (!data.expectedLayoutPresent) failures.push(`${route} ${viewport.name} ${theme} expected case-study layout marker missing`);
        if (data.reelObjectFits.some((fit) => fit !== "contain")) failures.push(`${route} ${viewport.name} ${theme} reel wallpapers are not contain-fit`);
        if (data.projectObjectFits.some((fit) => fit !== "contain")) failures.push(`${route} ${viewport.name} ${theme} project wallpapers are not contain-fit`);
        if (!data.darkProjectMediaVisible) failures.push(`${route} ${viewport.name} ${theme} dark case-study media variant not visible`);
        if (!data.carouselExists) failures.push(`${route} ${viewport.name} ${theme} homepage carousel missing`);
        if (["/", "/work/", "/resume/", "/about/"].includes(route) && data.railCount < 1) {
          failures.push(`${route} ${viewport.name} ${theme} expected carousel rails`);
        }
        if (["/work/", "/resume/"].includes(route) && data.hasGridEvidenceRows) {
          failures.push(`${route} ${viewport.name} ${theme} repeated cards still use grid layout`);
        }
        if (data.theme !== theme) failures.push(`${route} ${viewport.name} expected ${theme} theme, got ${data.theme}`);
        if (viewport.name === "mobile" && !data.mobileMenuExists) failures.push(`${route} mobile menu missing`);
      }

      await context.close();
    }
  }

  console.log("Visual checks complete");

  const interactionContext = await browser.newContext({ viewport: { width: 390, height: 900 } });
  await interactionContext.grantPermissions(["clipboard-write"], { origin: base });
  const interactionPage = await interactionContext.newPage();
  interactionPage.setDefaultTimeout(7000);
  await interactionPage.goto(`${base}/`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await interactionPage.waitForTimeout(250);
  await interactionPage.locator(".mobile-menu summary").first().click();
  const menuOpen = await interactionPage.locator(".mobile-menu").evaluate((el) => el.hasAttribute("open"));
  if (!menuOpen) failures.push("Mobile menu did not open");

  await interactionPage.evaluate(() => window.scrollTo({ top: 1400, behavior: "instant" }));
  await interactionPage.waitForTimeout(600);
  const revealVisible = await interactionPage.locator(".reveal.is-visible").count();
  if (!revealVisible) failures.push("Scroll reveal did not activate after scrolling");
  await interactionPage.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await interactionPage.waitForTimeout(200);

  await interactionPage.locator("[data-carousel-next]").first().click();
  const firstDotInactive = await interactionPage.locator('[data-carousel-dot="0"]').evaluate((el) => el.getAttribute("aria-pressed") === "false");
  if (!firstDotInactive) failures.push("Carousel next control did not advance");

  await interactionPage.goto(`${base}/resume/`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await interactionPage.waitForTimeout(250);
  const railMoved = await interactionPage.locator("[data-carousel-rail]").first().evaluate(async (rail) => {
    const track = rail.querySelector("[data-carousel-rail-track]");
    const next = rail.querySelector("[data-carousel-rail-next]");
    if (!track || !next || next.disabled) return true;
    const before = track.scrollLeft;
    next.click();
    await new Promise((resolve) => setTimeout(resolve, 450));
    return track.scrollLeft > before;
  });
  if (!railMoved) failures.push("Carousel rail next control did not scroll");

  await interactionPage.locator(".avatar-button").first().click();
  const lightboxOpen = await interactionPage.locator("[data-lightbox]").evaluate((el) => !el.hasAttribute("hidden"));
  if (!lightboxOpen) failures.push("Avatar lightbox did not open");
  await interactionPage.locator(".lightbox-close").click();

  await interactionPage.setViewportSize({ width: 1440, height: 1000 });
  await interactionPage.goto(`${base}/contact/`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await interactionPage.waitForTimeout(250);
  await interactionPage.locator("[data-copy-email]").first().click();
  const copiedText = await interactionPage.locator('[data-copy-email][data-copied="true"]').count();
  if (!copiedText) failures.push("Copy email button did not show copied state");
  const toastCount = await interactionPage.locator(".toast").count();
  if (!toastCount) failures.push("Copy email did not show a toast");
  await interactionPage.close();
  await interactionContext.close();

  await browser.close();

  const result = {
    failures,
    screenshotDir: shotDir,
    checkedRoutes: routes.length,
    checkedMedia: mediaAssets.length,
    visualChecks: visualRoutes.length * viewports.length * 2
  };

  console.log(JSON.stringify(result, null, 2));
  if (failures.length) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
