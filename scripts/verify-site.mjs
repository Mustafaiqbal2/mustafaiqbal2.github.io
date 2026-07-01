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
  "/projects/revvy/thumb-light.webp",
  "/projects/revvy/thumb-dark.webp",
  "/projects/revvy/revvy-demo.mp4",
  "/projects/revvy/revvy-poster.webp",
  "/projects/revvy/revvy-screenshot.webp",
  "/projects/emmy/thumb-light.webp",
  "/projects/emmy/thumb-dark.webp",
  "/projects/emmy/emmy-screenshot.webp",
  "/projects/cad-understanding/thumb-light.webp",
  "/projects/cad-understanding/thumb-dark.webp",
  "/projects/cad-understanding/drawing-contexts.webp",
  "/projects/cad-understanding/space-hypotheses.webp",
  "/projects/cad-understanding/boundary-graph.webp",
  "/projects/cad-understanding/linework-evidence.webp",
  "/projects/melodymind/thumb-light.webp",
  "/projects/melodymind/thumb-dark.webp",
  "/projects/melodymind/thesis-page-39.webp",
  "/projects/melodymind/thesis-page-40.webp",
  "/projects/recruitment-rag/thumb-light.webp",
  "/projects/recruitment-rag/thumb-dark.webp",
  "/projects/recruitment-rag/interview-demo-frame-1.webp",
  "/projects/recruitment-rag/interview-demo-frame-2.webp",
  "/projects/recruitment-rag/job-automation-frame-1.webp",
  "/projects/recruitment-rag/job-automation-frame-2.webp",
  "/resume/Mustafa_Iqbal_Full_Resume.pdf"
];

const expectedLayoutMarkers = {
  "/work/simplabots-agentic-saas/": ".case-layout-platform [data-project-documentation]",
  "/work/revvy-review-automation/": ".case-layout-performance [data-project-documentation]",
  "/work/emmy-email-categorization/": ".case-layout-classification [data-project-documentation]",
  "/work/cad-understanding-core/": ".case-layout-cad [data-project-documentation]",
  "/work/melodymind/": ".case-layout-music [data-project-documentation]",
  "/work/recruitment-rag-platform/": ".case-layout-rag [data-project-documentation]"
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
  { name: "mobile-360", width: 360, height: 820 },
  { name: "mobile", width: 390, height: 900 },
  { name: "mobile-430", width: 430, height: 932 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 1000 },
  { name: "wide", width: 1728, height: 1100 }
];

const shotDir = path.join(process.cwd(), "audit-shots");
fs.mkdirSync(shotDir, { recursive: true });

const projectDocsPath = path.join(process.cwd(), "data", "generated", "project-docs.json");
const featuredSlugs = [
  "simplabots-agentic-saas",
  "revvy-review-automation",
  "emmy-email-categorization",
  "cad-understanding-core",
  "melodymind",
  "recruitment-rag-platform"
];
const bannedGeneratedDataPatterns = [
  /C:\\\\|C:\//i,
  /Users[\\/]+musta/i,
  /\.env/i,
  /github-recovery-codes/i,
  /\bid(front|back|b2?)\b/i,
  /AKIA[0-9A-Z]{16}/,
  /sk-[A-Za-z0-9_-]{20,}/,
  /ghp_[A-Za-z0-9_]{20,}/,
  /-----BEGIN [A-Z ]+PRIVATE KEY-----/,
  /(^|[^A-Za-z0-9])(\+?92|0)?3\d{2}[- .]?\d{7}($|[^A-Za-z0-9])/
];
const obsoleteDiagramAssets = [
  "public/projects/simplabots/prisma-erd-light.webp",
  "public/projects/simplabots/platform-flow-light.webp",
  "public/projects/revvy/review-erd-light.webp",
  "public/projects/revvy/review-flow-light.webp",
  "public/projects/emmy/email-erd-light.webp",
  "public/projects/emmy/email-flow-light.webp",
  "public/projects/cad-understanding/safety-contract-light.webp",
  "public/projects/melodymind/music-architecture-light.webp",
  "public/projects/recruitment-rag/recruitment-flow-light.webp"
];

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

  if (!fs.existsSync(projectDocsPath)) {
    failures.push("Generated project docs JSON is missing");
  } else {
    const projectDocsText = fs.readFileSync(projectDocsPath, "utf8");
    for (const pattern of bannedGeneratedDataPatterns) {
      if (pattern.test(projectDocsText)) {
        failures.push(`Generated project docs failed safety pattern ${pattern}`);
      }
    }
    try {
      const projectDocs = JSON.parse(projectDocsText);
      for (const slug of featuredSlugs) {
        const project = projectDocs.projects?.[slug];
        if (!project) {
          failures.push(`Generated project docs missing ${slug}`);
          continue;
        }
        if ((project.visualizations || []).length < 2) {
          failures.push(`${slug} has fewer than two generated documentation visualizations`);
        }
        if (!(project.sources || []).length) {
          failures.push(`${slug} has no generated documentation sources`);
        }
      }
    } catch (error) {
      failures.push(`Generated project docs are not valid JSON: ${error.message}`);
    }
  }

  for (const asset of obsoleteDiagramAssets) {
    if (fs.existsSync(path.join(process.cwd(), asset))) {
      failures.push(`Obsolete static diagram asset still exists: ${asset}`);
    }
  }

  const browser = await chromium.launch({ executablePath: chromePath, headless: true });

  for (const viewport of viewports) {
    for (const theme of ["light", "dark"]) {
      const mobileEmulation = viewport.width <= 430;
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        isMobile: mobileEmulation,
        hasTouch: mobileEmulation,
        deviceScaleFactor: mobileEmulation ? 2 : 1
      });
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
            layoutViewportWidth: window.innerWidth,
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
            textHasInternalBuildCopy:
              /what this page is grounded in|local docs|local evidence|local Work folder|source signals|project sources|source-backed graph|generated from sanitized|generated from local|Live diagrams|Source-generated|project evidence behind/i.test(
                bodyText
              ),
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
            docPreviewCount: document.querySelectorAll(".documentation-preview-card").length,
            docExpandCount: document.querySelectorAll(".documentation-preview-button").length,
            reactFlowPreviewCount: document.querySelectorAll("[data-project-documentation] .react-flow").length,
            oldStaticDiagramRefs: /\/projects\/[^"')\s]*(platform-topology|platform-flow|prisma-erd|review-flow|review-erd|performance-pipeline|email-erd|email-flow|safety-contract|music-architecture|recruitment-flow)[^"')\s]*\.webp/.test(document.documentElement.innerHTML),
            mobileMenuExists: Boolean(document.querySelector(".mobile-menu")),
            mobileBrandVisible: (() => {
              const brand = document.querySelector(".brand-copy");
              return Boolean(brand && getComputedStyle(brand).display !== "none");
            })(),
            mobileMenuButtonSize: (() => {
              const summary = document.querySelector(".mobile-menu summary");
              if (!summary) return null;
              const rect = summary.getBoundingClientRect();
              return { width: Math.round(rect.width), height: Math.round(rect.height) };
            })(),
            desktopThemeHiddenOnMobile: (() => {
              const toggle = document.querySelector(".site-header .header-actions > .theme-toggle");
              return !toggle || getComputedStyle(toggle).display === "none";
            })(),
            mobileContentRailsReadable: (() => {
              const rails = Array.from(document.querySelectorAll("[data-carousel-rail]")).filter((rail) => !rail.classList.contains("media-carousel"));
              if (!rails.length) return true;
              return rails.every((rail) => {
                const track = rail.querySelector("[data-carousel-rail-track]");
                const controls = rail.querySelector(".carousel-rail-controls");
                const firstItem = rail.querySelector("[data-carousel-rail-item]");
                if (!track || !firstItem) return false;
                const trackStyle = getComputedStyle(track);
                const controlsHidden = !controls || getComputedStyle(controls).display === "none";
                const itemRect = firstItem.getBoundingClientRect();
                return controlsHidden && trackStyle.gridAutoFlow === "row" && itemRect.width >= Math.min(window.innerWidth - 24, 320);
              });
            })(),
            carouselExists: location.pathname === "/" ? Boolean(document.querySelector("[data-project-carousel]")) : true,
            railCount: document.querySelectorAll("[data-carousel-rail]").length,
            visibleRailControls: Array.from(document.querySelectorAll("[data-carousel-rail]")).filter((rail) => rail.getAttribute("data-can-scroll") === "true").length,
            hasGridEvidenceRows: Boolean(document.querySelector(".achievement-board, .skills-grid, .secondary-grid .secondary-card, .project-grid .project-card")),
            theme: document.documentElement.dataset.theme
          };
        }, expectedLayoutMarkers);

        if (data.overflow > 2) failures.push(`${route} ${viewport.name} ${theme} horizontal overflow ${data.overflow}`);
        if (viewport.width <= 430 && data.layoutViewportWidth > viewport.width + 4) {
          failures.push(`${route} ${viewport.name} ${theme} mobile viewport meta not respected (${data.layoutViewportWidth}px)`);
        }
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
        if (data.textHasInternalBuildCopy) failures.push(`${route} ${viewport.name} ${theme} has internal build/source copy`);
        if (data.textHasParallelHeadline) failures.push(`${route} ${viewport.name} ${theme} has 20-call headline metric`);
        if (data.footerHasDocumentRag) failures.push(`${route} ${viewport.name} ${theme} footer still links Document RAG`);
        if (data.emptyMetricCells) failures.push(`${route} ${viewport.name} ${theme} has empty metric cells`);
        if (data.homepageHasAvailabilityChip) failures.push(`${route} ${viewport.name} ${theme} homepage still shows availability chip text`);
        if (!data.homeGradient.includes("gradient")) failures.push(`${route} ${viewport.name} ${theme} Home nav gradient missing`);
        if (data.activeNavCount < 1) failures.push(`${route} ${viewport.name} ${theme} active nav state missing`);
        if (data.sectionGutter !== null && data.sectionGutter > (viewport.width <= 430 ? 16 : viewport.name === "tablet" ? 54 : 96)) {
          failures.push(`${route} ${viewport.name} ${theme} section gutters too wide (${data.sectionGutter}px)`);
        }
        if (!data.expectedLayoutPresent) failures.push(`${route} ${viewport.name} ${theme} expected case-study layout marker missing`);
        if (route.startsWith("/work/") && route !== "/work/" && data.docPreviewCount < 2) {
          failures.push(`${route} ${viewport.name} ${theme} has fewer than two documentation preview cards`);
        }
        if (route.startsWith("/work/") && route !== "/work/" && data.docExpandCount < 2) {
          failures.push(`${route} ${viewport.name} ${theme} has fewer than two documentation expand controls`);
        }
        if (route.startsWith("/work/") && route !== "/work/" && data.reactFlowPreviewCount < 2) {
          failures.push(`${route} ${viewport.name} ${theme} has fewer than two React Flow previews`);
        }
        if (data.oldStaticDiagramRefs) failures.push(`${route} ${viewport.name} ${theme} still references old static diagram assets`);
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
        if (viewport.width <= 680) {
          if (!data.mobileMenuExists) failures.push(`${route} ${viewport.name} mobile menu missing`);
          if (!data.mobileBrandVisible) failures.push(`${route} ${viewport.name} mobile brand copy hidden`);
          if (!data.desktopThemeHiddenOnMobile) failures.push(`${route} ${viewport.name} desktop theme toggle visible in header`);
          if (!data.mobileMenuButtonSize || data.mobileMenuButtonSize.width < 44 || data.mobileMenuButtonSize.height < 44) {
            failures.push(`${route} ${viewport.name} mobile menu tap target too small`);
          }
          if (data.railCount > 0 && !data.mobileContentRailsReadable) {
            failures.push(`${route} ${viewport.name} content carousel cards are not readable stacked mobile cards`);
          }
        }
      }

      await context.close();
    }
  }

  console.log("Visual checks complete");

  const interactionContext = await browser.newContext({ viewport: { width: 390, height: 900 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await interactionContext.grantPermissions(["clipboard-write"], { origin: base });
  const interactionPage = await interactionContext.newPage();
  interactionPage.setDefaultTimeout(7000);
  await interactionPage.goto(`${base}/`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await interactionPage.waitForTimeout(250);
  await interactionPage.locator(".mobile-menu summary").first().click();
  const menuOpen = await interactionPage.locator(".mobile-menu").evaluate((el) => el.hasAttribute("open"));
  if (!menuOpen) failures.push("Mobile menu did not open");
  const menuBodyLocked = await interactionPage.locator("body").evaluate((el) => el.classList.contains("mobile-menu-open"));
  if (!menuBodyLocked) failures.push("Mobile menu did not lock page scroll");
  await interactionPage.locator(".mobile-menu-head [data-mobile-menu-close]").click();
  const menuClosed = await interactionPage.locator(".mobile-menu").evaluate((el) => !el.hasAttribute("open"));
  if (!menuClosed) failures.push("Mobile menu did not close from close button");

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
  const mobileResumeRailReadable = await interactionPage.locator(".achievement-carousel").evaluate((rail) => {
    const track = rail.querySelector("[data-carousel-rail-track]");
    const controls = rail.querySelector(".carousel-rail-controls");
    const firstItem = rail.querySelector("[data-carousel-rail-item]");
    if (!track || !firstItem) return false;
    const trackStyle = getComputedStyle(track);
    const itemRect = firstItem.getBoundingClientRect();
    return (
      trackStyle.gridAutoFlow === "row" &&
      (!controls || getComputedStyle(controls).display === "none") &&
      itemRect.width >= Math.min(window.innerWidth - 24, 320)
    );
  });
  if (!mobileResumeRailReadable) failures.push("Resume evidence cards are not readable on mobile");

  await interactionPage.locator(".avatar-button").first().click();
  const lightboxOpen = await interactionPage.locator("[data-lightbox]").evaluate((el) => !el.hasAttribute("hidden"));
  if (!lightboxOpen) failures.push("Avatar lightbox did not open");
  await interactionPage.locator(".lightbox-close").click();

  await interactionPage.goto(`${base}/work/revvy-review-automation/`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await interactionPage.waitForTimeout(250);
  await interactionPage.locator(".documentation-preview-button").first().click();
  const explorerOpen = await interactionPage.locator(".documentation-explorer-shell").count();
  if (!explorerOpen) failures.push("Documentation explorer did not open");
  const flowControls = await interactionPage.locator(".documentation-explorer-shell .react-flow__controls").count();
  if (!flowControls) failures.push("Documentation explorer controls missing");
  const flowMinimap = await interactionPage.locator(".documentation-explorer-shell .react-flow__minimap").count();
  if (flowMinimap) failures.push("Documentation explorer minimap should be hidden on mobile");
  const beforeInspector = await interactionPage.locator(".documentation-inspector-card h3").first().innerText().catch(() => "");
  const selectableNodes = interactionPage.locator(".documentation-explorer-shell .react-flow__node");
  if ((await selectableNodes.count()) > 1) {
    await selectableNodes.nth(1).click({ force: true });
    await interactionPage.waitForTimeout(250);
    const afterInspector = await interactionPage.locator(".documentation-inspector-card h3").first().innerText().catch(() => "");
    if (beforeInspector && afterInspector && beforeInspector === afterInspector) {
      failures.push("Documentation explorer inspector did not update after node click");
    }
  } else {
    failures.push("Documentation explorer has fewer than two selectable nodes");
  }
  await interactionPage.locator(".documentation-explorer-close").click();
  const explorerClosed = await interactionPage.locator(".documentation-explorer-shell").count();
  if (explorerClosed) failures.push("Documentation explorer did not close");

  await interactionPage.close();
  await interactionContext.close();

  const desktopInteractionContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await desktopInteractionContext.grantPermissions(["clipboard-write"], { origin: base });
  const desktopPage = await desktopInteractionContext.newPage();
  desktopPage.setDefaultTimeout(7000);

  await desktopPage.goto(`${base}/resume/`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await desktopPage.waitForTimeout(250);
  const desktopRailMoved = await desktopPage.locator(".achievement-carousel").evaluate(async (rail) => {
    const track = rail.querySelector("[data-carousel-rail-track]");
    const next = rail.querySelector("[data-carousel-rail-next]");
    if (!track || !next || next.disabled) return true;
    const before = track.scrollLeft;
    next.click();
    await new Promise((resolve) => setTimeout(resolve, 450));
    return track.scrollLeft > before;
  });
  if (!desktopRailMoved) failures.push("Desktop carousel rail next control did not scroll");

  await desktopPage.goto(`${base}/work/revvy-review-automation/`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await desktopPage.waitForTimeout(250);
  await desktopPage.locator(".documentation-preview-button").first().click();
  const desktopMinimap = await desktopPage.locator(".documentation-explorer-shell .react-flow__minimap").count();
  if (!desktopMinimap) failures.push("Documentation explorer minimap missing on desktop");
  await desktopPage.locator(".documentation-explorer-close").click();

  await desktopPage.goto(`${base}/contact/`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await desktopPage.waitForTimeout(250);
  const statusLayoutOk = await desktopPage.evaluate(() => {
    const status = document.querySelector("[data-form-status]");
    const message = document.querySelector("[data-form-status-message]");
    if (!status || !message) return false;
    status.setAttribute("data-status", "success");
    message.textContent = "Message sent. I will reply from my email.";
    const statusRect = status.getBoundingClientRect();
    const messageRect = message.getBoundingClientRect();
    return statusRect.width > 260 && messageRect.width > 220 && statusRect.height < 96;
  });
  if (!statusLayoutOk) failures.push("Contact form status banner layout collapsed");
  await desktopPage.locator("[data-copy-email]").first().click();
  const copiedText = await desktopPage.locator('[data-copy-email][data-copied="true"]').count();
  if (!copiedText) failures.push("Copy email button did not show copied state");
  const toastCount = await desktopPage.locator(".toast").count();
  if (!toastCount) failures.push("Copy email did not show a toast");
  await desktopPage.close();
  await desktopInteractionContext.close();

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
