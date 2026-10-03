"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type FullscreenDocument = Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => Promise<void> };
type FullscreenRoot = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };

export function useFullscreen() {
  const [fullscreen,setFullscreen]=useState(false);
  const [notice,setNotice]=useState("");
  const timer=useRef(0);
  useEffect(()=>{
    const sync=()=>setFullscreen(Boolean(document.fullscreenElement || (document as FullscreenDocument).webkitFullscreenElement));
    document.addEventListener("fullscreenchange",sync);
    document.addEventListener("webkitfullscreenchange",sync);
    sync();
    return ()=>{
      document.removeEventListener("fullscreenchange",sync);
      document.removeEventListener("webkitfullscreenchange",sync);
      window.clearTimeout(timer.current);
    };
  },[]);
  const toggle=useCallback(async()=>{
    const doc=document as FullscreenDocument;
    const root=document.documentElement as FullscreenRoot;
    try {
      if(doc.fullscreenElement || doc.webkitFullscreenElement) {
        if(doc.exitFullscreen) await doc.exitFullscreen();
        else await doc.webkitExitFullscreen?.();
      } else if(root.requestFullscreen) await root.requestFullscreen({navigationUI:"hide"});
      else if(root.webkitRequestFullscreen) await root.webkitRequestFullscreen();
      else throw new Error("Unavailable");
      setNotice("");
    } catch {
      setNotice("Fullscreen isn’t available in this browser.");
      window.clearTimeout(timer.current);
      timer.current=window.setTimeout(()=>setNotice(""),4500);
    }
  },[]);
  return {fullscreen,notice,toggle};
}
