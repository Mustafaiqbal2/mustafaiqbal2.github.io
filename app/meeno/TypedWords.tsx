export function TypedWords({ text }: { text: string }) {
  // Keep whole words together and retain every space/newline. Hidden letters
  // still occupy their final width, avoiding jumps in centred, balanced copy.
  let index = 0;
  return <span className="meeno-typewriter" aria-hidden="true">
    {text.split(/(\s+)/).map((part, word) => <span key={word} className={/\s/.test(part) ? undefined : "meeno-typewriter__word"}>
      {Array.from(part).map(letter => <span data-letter key={index++}>{letter}</span>)}
    </span>)}
  </span>;
}
