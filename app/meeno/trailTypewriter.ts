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
  const canvas = node?.querySelector<HTMLCanvasElement>("canvas") ?? null;
  const layout = node?.querySelector<HTMLElement>("[data-type-layout]") ?? null;
  const context = canvas?.getContext("2d");
  const pad = 26;
  let painted = -1, signature = "", ratio = 1;
  type Line = { image: HTMLCanvasElement; x: number; y: number; width: number; height: number; start: number; ends: number[] };
  let lines: Line[] = [];
  function paint(count: number, force = false) {
    if (!context || !canvas || (!force && count === painted)) return;
    context.clearRect(0,0,canvas.width,canvas.height);
    context.save(); context.scale(ratio,ratio);
    for (const line of lines) {
      const shown = Math.min(line.ends.length,Math.max(0,count-line.start));
      if (!shown) continue;
      const width = shown === line.ends.length ? line.width : line.ends[shown-1]+pad+1;
      context.drawImage(line.image,0,0,width*ratio,line.height*ratio,line.x,line.y,width,line.height);
    }
    context.restore();
    painted = count;
  }
  function rebuild() {
    if (!canvas || !layout || !node || !context || !layout.firstChild) return;
    const bounds = layout.getBoundingClientRect();
    const style = getComputedStyle(layout);
    const next = `${bounds.width}:${bounds.height}:${style.font}:${devicePixelRatio}`;
    if (signature === next || !bounds.width || !bounds.height) return;
    signature = next;
    ratio = Math.min(1.5,devicePixelRatio || 1);
    // Range positions are read once while preparing/resizing, never per letter.
    const range = document.createRange();
    const groups: { text: string; x: number; y: number; height: number; start: number; ends: number[] }[] = [];
    let offset = 0;
    Array.from(text).forEach((letter,index) => {
      range.setStart(layout.firstChild!,offset); offset += letter.length;
      range.setEnd(layout.firstChild!,offset);
      const rect = range.getBoundingClientRect();
      if (letter === "\n" || !rect.height) return;
      let group = groups[groups.length-1];
      if (!group || Math.abs(group.y-(rect.top-bounds.top))>2) {
        group = {text:"",x:rect.left-bounds.left,y:rect.top-bounds.top,height:rect.height,start:index,ends:[]};
        groups.push(group);
      }
      group.text += letter;
      group.ends.push(Math.max(0,rect.right-bounds.left-group.x));
    });
    canvas.width = Math.ceil((bounds.width+pad*2)*ratio);
    canvas.height = Math.ceil((bounds.height+pad*2)*ratio);
    lines = groups.map(group => {
      const image = document.createElement("canvas");
      const width = Math.max(...group.ends)+pad*2, height = group.height+pad*2;
      image.width=Math.ceil(width*ratio); image.height=Math.ceil(height*ratio);
      const ink=image.getContext("2d")!;
      ink.scale(ratio,ratio);
      ink.font=`${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      if("letterSpacing" in ink) ink.letterSpacing=style.letterSpacing;
      ink.fillStyle=style.color;
      ink.textBaseline="alphabetic";
      const ascent=ink.measureText("Mg").fontBoundingBoxAscent || parseFloat(style.fontSize)*.85;
      ink.shadowColor="rgba(0,0,0,.92)"; ink.shadowBlur=8*ratio; ink.shadowOffsetY=2*ratio;
      ink.fillText(group.text,pad,pad+ascent);
      return {image,width,height,x:group.x,y:group.y,start:group.start,ends:group.ends};
    });
    paint(clock.count,true);
  }
  rebuild();
  return {
    get complete() { return clock.complete; },
    rebuild,
    reset() { clock.reset(); paint(0); },
    advance(visible: boolean, seconds: number, reduced: boolean, minimum = 0) {
      paint(clock.advance(visible, seconds, reduced, minimum));
    }
  };
}
