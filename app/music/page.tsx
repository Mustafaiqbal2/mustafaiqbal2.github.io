import type { Metadata } from "next";
// CSS first: bundle order decides equal-specificity ties, and the scene
// styles (imported through MusicPage) must come AFTER the base sheets to
// override kit defaults like .mu-bubble geometry
import "@/app/landing.css";
import "@/app/music.css";
import "@/app/music-fit.css";
import { MusicPage } from "@/components/music/MusicPage";
import { siteUrl } from "@/data/portfolio";

export const metadata: Metadata = {
  title: "Music",
  description: "The story of MelodyMind, live song search, and Mustafa's Spotify listening room.",
  alternates: { canonical: `${siteUrl}/music/` }
};

// Desktop keeps the scroll-driven story boot discipline. Compact screens skip
// that work entirely and enter MelodyMind directly; the story/listening room
// remain the intentionally desktop-only parts of /music.
const bootGate = `
try {
  document.documentElement.classList.add("mu-page");
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);

  var compactMusic = window.matchMedia("(max-width: 1023px)").matches;
  if (compactMusic) {
    if (window.location.hash !== "#melodymind") {
      history.replaceState(null, "", "#melodymind");
    }
    document.documentElement.classList.remove("lv-boot");
  } else if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
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
