import { Landing } from "@/components/Landing";
import "./landing.css";

// Hides the hero intro elements from first paint ONLY when JS is running and
// motion is allowed, so the fly-in never flashes its end state. A timeout
// releases the gate even if the animation runtime fails to boot.
const introGate = `
try {
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.documentElement.classList.add("lv-intro");
    window.setTimeout(function () { document.documentElement.classList.remove("lv-intro"); }, 2500);
  }
} catch (e) {}
`;

export default function Home() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: introGate }} />
      <Landing />
    </>
  );
}
