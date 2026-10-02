import type { Metadata } from "next";
import { MeenoExperience } from "./MeenoExperience";
import "./meeno.css";

export const metadata: Metadata = {
  title: "meeno",
  description: "A private note.",
  robots: { index: false, follow: false },
  openGraph: { title: "meeno", description: "A private note." }
};

export default function MeenoPage() {
  return <MeenoExperience />;
}
