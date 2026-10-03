// Timed letters keep their original layout. Scrolling near the end of a speech
// can catch the reveal up, so a quick swipe never leaves a half-written sentence.
export function createTypewriter(text: string) {
  const letters = Array.from(text);
  let duration = 0;
  const arrivals = letters.map((letter, index) => {
    const at = duration;
    duration += .025 + (index * 7 % 5) * .002;
    if (/[,;:]/.test(letter)) duration += .085;
    if (/[.!?]/.test(letter) && letters[index + 1] !== letter) duration += .16;
    if (letter === "\n") duration += .18;
    return at;
  });
  let elapsed = 0, count = 0;
  return {
    get count() { return count; },
    get complete() { return count === letters.length; },
    reset() { elapsed = 0; count = 0; },
    advance(visible: boolean, seconds: number, reduced = false, minimum = 0) {
      if (!visible) return count;
      elapsed += Math.max(0, seconds);
      count = Math.min(letters.length, Math.max(count, Math.floor(minimum)));
      if (reduced) count = letters.length;
      while (count < arrivals.length && arrivals[count] <= elapsed) count++;
      return count;
    }
  };
}

export function bindTypewriter(node: HTMLElement | null, text: string) {
  const clock = createTypewriter(text);
  const letters = node ? Array.from(node.querySelectorAll<HTMLElement>("[data-letter]")) : [];
  let painted = 0;
  function paint(count: number) {
    for (let i = Math.min(painted, count); i < Math.max(painted, count); i++) {
      if (letters[i]) letters[i].style.visibility = i < count ? "visible" : "hidden";
    }
    painted = count;
  }
  return {
    get complete() { return clock.complete; },
    reset() { clock.reset(); paint(0); },
    advance(visible: boolean, seconds: number, reduced: boolean, minimum = 0) {
      paint(clock.advance(visible, seconds, reduced, minimum));
    }
  };
}
