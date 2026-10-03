import { PAN_SECONDS, SHOW_SECONDS } from "./trailSequence";

export const VIDEO_WALK_SECONDS = 72;
export const VIDEO_YES_AT = VIDEO_WALK_SECONDS + 6;
export const VIDEO_SECONDS = VIDEO_YES_AT + PAN_SECONDS + SHOW_SECONDS + 2;
export const FINAL_NOTE = "Idk if we'll get to see japanese fireworks so this will have to do for now :)";
export const videoAt = (seconds: number) => ({
  progress: Math.min(1,Math.max(0,seconds/VIDEO_WALK_SECONDS)),
  question: seconds>=VIDEO_WALK_SECONDS && seconds<VIDEO_YES_AT,
  ending: seconds>=VIDEO_YES_AT ? seconds-VIDEO_YES_AT : null,
  finished: seconds>=VIDEO_SECONDS
});

export function videoMime(supported: (type:string)=>boolean) {
  return ["video/mp4;codecs=avc1.42E01E,mp4a.40.2","video/mp4","video/webm;codecs=vp8,opus","video/webm"]
    .find(supported) ?? null;
}

// Balance complete words while keeping original character indices, including
// explicit newlines, so a video reveal uses exactly the same authored copy.
export function captionLines(text: string, width: number, measure: (text:string)=>number) {
  const lines: {text:string;start:number}[]=[];
  let base=0;
  for(const paragraph of text.split("\n")) {
    const words=Array.from(paragraph.matchAll(/\S+/g));
    function wrap(limit: number) {
      const result: {text:string;start:number}[]=[];
      let start=-1,end=0;
      for(const word of words) {
        const at=word.index!,next=at+word[0].length;
        if(start>=0 && measure(paragraph.slice(start,next))>limit) {
          result.push({text:paragraph.slice(start,end),start:base+start});start=at;
        }
        if(start<0) start=at;
        end=next;
      }
      if(start>=0) result.push({text:paragraph.slice(start,end),start:base+start});
      return result;
    }
    const count=wrap(width).length;
    let low=0,high=width;
    for(let i=0;i<12;i++) {
      const candidate=(low+high)/2;
      if(wrap(candidate).length>count) low=candidate;else high=candidate;
    }
    lines.push(...wrap(high));
    base+=paragraph.length+1;
  }
  return lines.map(line=>({...line,start:Array.from(text.slice(0,line.start)).length}));
}
