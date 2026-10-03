export function TypedWords({ text }: { text: string }) {
  // One static layout and one small canvas, instead of hundreds of letter nodes
  // invalidating text shadows and paint during the walk.
  return <span className="meeno-typewriter" aria-hidden="true">
    <span data-type-layout>{text}</span>
    <canvas className="meeno-typewriter__canvas" />
  </span>;
}
