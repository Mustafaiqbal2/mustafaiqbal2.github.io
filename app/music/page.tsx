import type { Metadata } from "next";
// CSS first: bundle order decides equal-specificity ties, and the scene
// styles (imported through MusicPage) must come AFTER the base sheets to
// override kit defaults like .mu-bubble geometry
import "@/app/landing.css";
import "@/app/music.css";
import { MusicPage } from "@/components/music/MusicPage";
import { siteUrl } from "@/data/portfolio";

export const metadata: Metadata = {
  title: "Music",
  description: "The story of MelodyMind: how one bad answer became a thesis about finding the song for the exact situation.",
  alternates: { canonical: `${siteUrl}/music/` }
};

// Same boot discipline as the landing: scroll is gated from first paint
// until the story's pinned scenes are built (MusicPage releases it), with a
// no-hydration failsafe. html.lv-boot { overflow: hidden } lives in
// landing.css, which this route imports.
const bootGate = `
try {
  document.documentElement.classList.add("mu-page");
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.documentElement.classList.add("lv-boot");
    window.setTimeout(function () { document.documentElement.classList.remove("lv-boot"); }, 3000);
  }
} catch (e) {}
`;

export default function Music() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: bootGate }} />
      <MusicPage />
    </>
  );
}
