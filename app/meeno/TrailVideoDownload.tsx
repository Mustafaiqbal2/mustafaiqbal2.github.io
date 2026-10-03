"use client";

import { useEffect, useRef, useState } from "react";
import { createAmbience } from "./useAmbience";
import type { TrailStory } from "./trailSequence";

export function TrailVideoDownload({story,onBusy,prepared,pending}:{story:TrailStory;onBusy:(busy:boolean)=>void;prepared:Blob|null;pending:boolean}) {
  const [busy,setBusy]=useState(false);
  const [progress,setProgress]=useState(0);
  const [error,setError]=useState("");
  const [file,setFile]=useState<{url:string;extension:string}|null>(null);
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const cancelRef=useRef<HTMLButtonElement>(null);
  const controlRef=useRef<HTMLButtonElement|HTMLAnchorElement|null>(null);
  const wasBusyRef=useRef(false);
  const abortRef=useRef<AbortController|null>(null);
  const urlRef=useRef<string|null>(null);
  useEffect(()=>()=>{abortRef.current?.abort();if(urlRef.current) URL.revokeObjectURL(urlRef.current);},[]);
  useEffect(()=>{
    if(!prepared) return;
    if(urlRef.current) URL.revokeObjectURL(urlRef.current);
    const url=URL.createObjectURL(prepared);urlRef.current=url;
    setFile({url,extension:prepared.type.includes("mp4")?"mp4":"webm"});
  },[prepared]);
  useEffect(()=>{
    if(busy) cancelRef.current?.focus({preventScroll:true});
    else if(wasBusyRef.current) controlRef.current?.focus({preventScroll:true});
    wasBusyRef.current=busy;
  },[busy]);
  async function prepare() {
    if(abortRef.current) return;
    const controller=new AbortController();abortRef.current=controller;
    // Create/resume audio directly in the tap, before lazy-loading the encoder.
    let sound:ReturnType<typeof createAmbience>=null;
    try {sound=createAmbience(true);} catch { /* Explain unsupported audio below. */ }
    if(!sound) {setError("Video export needs audio support in this browser.");abortRef.current=null;return;}
    const resume=sound.context.resume();
    setError("");setProgress(0);setBusy(true);onBusy(true);
    try {
      const [module]=await Promise.all([import("./trailVideo"),resume]);
      await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
      if(!canvasRef.current || controller.signal.aborted) return;
      const blob=await module.exportTrailVideo({story,canvas:canvasRef.current,sound,signal:controller.signal,onProgress:setProgress});
      if(controller.signal.aborted) return;
      const url=URL.createObjectURL(blob);urlRef.current=url;
      setFile({url,extension:blob.type.includes("mp4")?"mp4":"webm"});
    } catch(error) {
      if(!controller.signal.aborted) setError(error instanceof Error?error.message:"The video couldn't be prepared. Please try again.");
    } finally {
      sound.dispose();abortRef.current=null;setBusy(false);onBusy(false);
    }
  }
  return <>
    {file ? <a ref={node=>{controlRef.current=node;}} className="meeno-download" href={file.url} download={`our-walk.${file.extension}`}>Download video <span aria-hidden="true">↓</span></a> :
      <button ref={node=>{controlRef.current=node;}} className="meeno-download" type="button" onClick={()=>void prepare()} disabled={busy || pending}>{pending?"Finishing video…":"Download video"} <span aria-hidden="true">↓</span></button>}
    {error && <p className="meeno-export-error" role="status">{error}</p>}
    {file && !prepared && <p className="meeno-export-ready" role="status">Your video is ready to save.</p>}
    {busy && <div className="meeno-export" role="dialog" aria-modal="true" aria-labelledby="meeno-export-title"
      onKeyDown={event=>{
        if(event.key==="Tab") {event.preventDefault();cancelRef.current?.focus();}
        if(event.key==="Escape") abortRef.current?.abort();
      }}>
      <canvas ref={canvasRef} className="meeno-export__preview" aria-hidden="true" />
      <h2 id="meeno-export-title">Preparing your video</h2>
      <progress value={progress} max={100} aria-label="Video export progress" />
      <p>{progress}% · About 2 minutes. Keep this tab open.</p>
      <button ref={cancelRef} type="button" onClick={()=>abortRef.current?.abort()}>Cancel</button>
    </div>}
  </>;
}
