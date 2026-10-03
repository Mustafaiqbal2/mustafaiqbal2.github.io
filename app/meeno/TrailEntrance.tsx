"use client";

import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from "react";
import { loadTrailArtwork } from "./trailAssets";
import { celebrationAt, evadePosition, FIREWORK_BURSTS, followupVisibility, messageVisibility, measureTrail, questionVisible, SHELLS, trailProgress, type TrailStory } from "./trailSequence";
import type { WorldRenderer } from "./trailRenderer";

type TrailRendererModule = typeof import("./trailRenderer");
let trailRendererPromise: Promise<TrailRendererModule> | null = null;

export function preloadTrailRenderer() {
  trailRendererPromise ??= import("./trailRenderer");
  return trailRendererPromise;
}

export function TrailEntrance({ story, onLaunch, onBurst, active }: { story: TrailStory; onLaunch: (pan?: number) => void; onBurst: (strength: number, pan?: number) => void; active: boolean }) {
  const stageRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wordsRef = useRef<(HTMLDivElement | null)[]>([]);
  const afterRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const questionRef = useRef<HTMLDivElement>(null);
  const choicesRef = useRef<HTMLDivElement>(null);
  const noRef = useRef<HTMLButtonElement>(null);
  const returnRef = useRef<HTMLButtonElement>(null);
  const lastDodgeRef = useRef(0);
  const dodgeStepRef = useRef(0);
  const elapsedRef = useRef<number | null>(null);
  const startShowRef = useRef<() => void>(() => {});
  const restartWalkRef = useRef<() => void>(() => {});
  const restoreScrollRef = useRef(0);
  const activeRef = useRef(active);
  const resumeRef = useRef<() => void>(() => {});
  const measureRef = useRef<() => void>(() => {});
  const resettingRef = useRef(false);
  const [ending, setEnding] = useState(false);
  const [finished, setFinished] = useState(false);
  const [noPosition, setNoPosition] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    activeRef.current = active;
    if (active) resumeRef.current();
  }, [active]);

  useLayoutEffect(() => {
    if (!ending) {
      if (resettingRef.current) {
        window.scrollTo({top:0,behavior:"instant"});
        resettingRef.current=false;
        measureRef.current();
      }
      return;
    }
    const body = document.body;
    const saved = { position: body.style.position, top: body.style.top, width: body.style.width, left: body.style.left };
    restoreScrollRef.current = window.scrollY;
    body.style.position = "fixed";
    body.style.top = `-${restoreScrollRef.current}px`;
    body.style.left = "0";
    body.style.width = "100%";
    document.documentElement.classList.add("meeno-celebrating");
    return () => {
      Object.assign(body.style, saved);
      document.documentElement.classList.remove("meeno-celebrating");
      window.scrollTo({ top: restoreScrollRef.current, behavior: "instant" });
    };
  }, [ending]);

  useEffect(() => { if (finished) returnRef.current?.focus({ preventScroll: true }); }, [finished]);

  useEffect(() => {
    const arena=choicesRef.current, button=noRef.current;
    if (!arena || !button) return;
    const observer=new ResizeObserver(()=>setNoPosition(previous=>previous && ({
      x:Math.max(0,Math.min(previous.x,arena.clientWidth-button.offsetWidth)),
      y:Math.max(0,Math.min(previous.y,arena.clientHeight-button.offsetHeight))
    })));
    observer.observe(arena);
    return ()=>observer.disconnect();
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let renderer: WorldRenderer | null = null;
    let disposed = false;
    let frame = 0;
    let revision = 0;
    let target = 0;
    let progress = 0;
    let lastFrame = 0;
    let lastPaint = 0;
    let sceneTime = 0;
    let done = false;
    let lastBurst = -1;
    let lastLaunch = -1;
    let finalNoteShown = false;
    let measurement = {start:0,distance:1};
    let questionWasVisible = false;
    const lastOpacity = story.segments.map(() => -1);
    const lastAfter = story.segments.map(() => -1);

    const updateWords = (position: number) => {
      const celebrating = elapsedRef.current !== null;
      wordsRef.current.forEach((node, index) => {
        if (!node) return;
        const opacity = celebrating ? 0 : messageVisibility(position, index);
        if (Math.abs(opacity-lastOpacity[index]) > .001) {
          lastOpacity[index]=opacity;
          node.style.opacity=opacity.toFixed(3);
        }
        const after = afterRefs.current[index];
        if (after) {
          const arrival = followupVisibility(position, index);
          if (Math.abs(arrival-lastAfter[index]) > .001) {
            lastAfter[index]=arrival;
            after.style.opacity=arrival.toFixed(3);
            after.style.transform=`translateY(${((1-arrival)*7).toFixed(2)}px)`;
          }
        }
      });
      const visible = !celebrating && questionVisible(position);
      if (visible !== questionWasVisible) {
        questionWasVisible=visible;
        stage.dataset.atEnd=String(visible);
        if (questionRef.current) {
          questionRef.current.inert=!visible;
          questionRef.current.setAttribute("aria-hidden",String(!visible));
        }
      }
    };
    const readProgress = () => {
      if (elapsedRef.current !== null || resettingRef.current) return;
      target = trailProgress(window.scrollY,measurement);
      stage.dataset.walked = String(target > .01);
      if (reducedMotion.matches) { updateWords(target); start(); }
    };
    const measure = () => {
      const bounds = stage.getBoundingClientRect();
      measurement=measureTrail(bounds.top,window.scrollY,stage.offsetHeight,window.innerHeight,
        elapsedRef.current!==null || resettingRef.current,measurement);
      readProgress();
    };
    measureRef.current=measure;
    const tick = (now: number) => {
      frame = 0;
      if (disposed || document.hidden || !activeRef.current) return;
      const delta = Math.min(now-(lastFrame || now),64);
      lastFrame = now;
      if (elapsedRef.current !== null) {
        elapsedRef.current += delta/1000;
        const sequence = celebrationAt(elapsedRef.current, reducedMotion.matches);
        SHELLS.forEach((shell,index) => {
          const launchAt=shell.at-2.2;
          if(sequence.fireworks>=launchAt && index>lastLaunch) {
            onLaunch(shell.x*1.7);
            lastLaunch=index;
          }
        });
        FIREWORK_BURSTS.forEach((burst,index) => {
          if (sequence.fireworks >= burst.at && index > lastBurst) {
            onBurst(burst.strength,burst.pan);
            lastBurst = index;
          }
        });
        if (!finalNoteShown && sequence.fireworks >= SHELLS[SHELLS.length-1].at) {
          finalNoteShown=true;
          stage.dataset.finalNote="true";
        }
        if (sequence.finished && !done) { done = true; setFinished(true); }
      } else {
        progress += (target-progress)*(1-Math.exp(-delta/80));
        if (Math.abs(target-progress)<.0001) progress=target;
      }
      updateWords(reducedMotion.matches ? target : progress);
      const moving = Math.abs(target-progress)>.0001;
      if (moving || now-lastPaint >= 33 || reducedMotion.matches) {
        if (!reducedMotion.matches) sceneTime += Math.min(now-(lastPaint || now),80)/1000;
        renderer?.draw(reducedMotion.matches ? 0 : progress,sceneTime,!reducedMotion.matches,elapsedRef.current);
        lastPaint = now;
      }
      if (activeRef.current && (!reducedMotion.matches || (elapsedRef.current !== null && !done))) frame=requestAnimationFrame(tick);
    };
    function start() {
      if (activeRef.current && !frame && !document.hidden) { lastFrame=0; lastPaint=0; frame=requestAnimationFrame(tick); }
    }
    resumeRef.current=start;
    startShowRef.current = () => {
      if (elapsedRef.current !== null || !questionVisible(target)) return;
      progress=target=1;
      elapsedRef.current=0;
      finalNoteShown=false;
      stage.dataset.finalNote="false";
      setEnding(true);
      updateWords(1);
      start();
    };
    restartWalkRef.current = () => {
      // Reuse the decoded story and live renderer; only rewind the walk/show.
      restoreScrollRef.current=0;
      resettingRef.current=true;
      elapsedRef.current=null;
      progress=target=sceneTime=0;
      lastBurst=-1;
      lastLaunch=-1;
      finalNoteShown=false;
      stage.dataset.finalNote="false";
      lastDodgeRef.current=0;
      dodgeStepRef.current=0;
      done=false;
      setEnding(false);
      setFinished(false);
      setNoPosition(null);
      stage.dataset.walked="false";
      updateWords(0);
      renderer?.draw(0,0,!reducedMotion.matches,null);
      start();
    };
    const resize = () => { renderer?.resize(); measure(); start(); };
    const prepare = async () => {
      const request=++revision;
      try {
        const [artwork,engine] = await Promise.all([loadTrailArtwork(),preloadTrailRenderer()]);
        if (disposed || request !== revision) return;
        renderer?.dispose();
        renderer=engine.createTrailRenderer(canvas,artwork);
        if (renderer) {
          resize();
          renderer.draw(reducedMotion.matches ? 0 : progress,sceneTime,!reducedMotion.matches,elapsedRef.current);
        }
        stage.dataset.renderer=renderer ? "spatial" : "fallback";
      } catch (error) {
        if (!disposed && request === revision) stage.dataset.renderer="fallback";
        if (process.env.NODE_ENV === "development") console.warn("Woodland renderer unavailable",error);
      }
    };
    const visibility = () => {
      if (document.hidden) { cancelAnimationFrame(frame); frame=0; }
      else start();
    };
    const motionChange = () => { cancelAnimationFrame(frame); frame=0; start(); };
    const contextLost = (event: Event) => {
      event.preventDefault();
      renderer?.dispose(); renderer=null;
      stage.dataset.renderer="fallback";
    };
    measure(); start(); void prepare();
    const observer=new ResizeObserver(resize);
    observer.observe(canvas);
    window.addEventListener("scroll",readProgress,{passive:true});
    document.addEventListener("visibilitychange",visibility);
    reducedMotion.addEventListener("change",motionChange);
    canvas.addEventListener("webglcontextlost",contextLost);
    canvas.addEventListener("webglcontextrestored",prepare);
    return () => {
      disposed=true;revision++;
      startShowRef.current=()=>{};
      restartWalkRef.current=()=>{};
      resumeRef.current=()=>{};
      measureRef.current=()=>{};
      cancelAnimationFrame(frame);observer.disconnect();renderer?.dispose();
      window.removeEventListener("scroll",readProgress);
      document.removeEventListener("visibilitychange",visibility);
      reducedMotion.removeEventListener("change",motionChange);
      canvas.removeEventListener("webglcontextlost",contextLost);
      canvas.removeEventListener("webglcontextrestored",prepare);
    };
  }, [onLaunch,onBurst,story]);

  function moveNo() {
    const arena=choicesRef.current,button=noRef.current;
    if (ending || !arena || !button || Date.now()-lastDodgeRef.current<180) return;
    lastDodgeRef.current=Date.now();
    const bounds=arena.getBoundingClientRect(),rect=button.getBoundingClientRect();
    setNoPosition(evadePosition(bounds.width,bounds.height,rect.width,rect.height,dodgeStepRef.current++));
  }
  function approachNo(event: PointerEvent<HTMLDivElement>) {
    if (!noRef.current || ending) return;
    const rect=noRef.current.getBoundingClientRect();
    const dx=Math.max(rect.left-event.clientX,0,event.clientX-rect.right);
    const dy=Math.max(rect.top-event.clientY,0,event.clientY-rect.bottom);
    if (Math.hypot(dx,dy)<(event.pointerType === "touch" ? 48 : 34)) moveNo();
  }
  return (
    <section ref={stageRef} className={`meeno-trail${ending ? " meeno-trail--ending" : ""}`} aria-label="A walk through the moonlit woods">
      <div className="meeno-trail__scene">
        <div className="meeno-trail__fallback" aria-hidden="true" />
        <canvas ref={canvasRef} className="meeno-trail__canvas" aria-hidden="true" />
        <div className="meeno-trail__shade" aria-hidden="true" />
        <div className="meeno-trail__words" aria-hidden="true">
          {story.segments.map((segment,index) => (
            <div className="meeno-trail__speech" key={index} ref={node=>{wordsRef.current[index]=node;}}>
              <p>{segment.text}</p>
              {segment.after && <p className="meeno-trail__after" ref={node=>{afterRefs.current[index]=node;}}>{segment.after}</p>}
            </div>
          ))}
        </div>
        <div ref={questionRef} className="meeno-invitation" aria-hidden="true" inert>
          <div className="meeno-invitation__rule" aria-hidden="true"><span /></div>
          <h1>{story.question}</h1>
          <div ref={choicesRef} className="meeno-trail__choices" onPointerMove={approachNo} onPointerDown={approachNo}>
            <button className="meeno-choice meeno-choice--yes" type="button" onClick={()=>startShowRef.current()}>Yes</button>
            <button ref={noRef} className="meeno-choice meeno-choice--no" type="button"
              onPointerDown={event=>{event.preventDefault();moveNo();}}
              onClick={event=>{if(event.detail===0) moveNo();}}
              style={noPosition ? {right:"auto",left:0,transform:`translate(${noPosition.x}px,${noPosition.y}px)`} : undefined}>No</button>
          </div>
        </div>
        <p className="meeno-fireworks-note" aria-hidden="true">Idk if we'll get to see japanese fireworks so this will have to do for now :)</p>
        {ending && <p className="meeno-trail__transcript" role="status">{finished ? "The fireworks have finished." : "Fireworks above the forest."}</p>}
        {finished && <button ref={returnRef} className="meeno-return" type="button" onClick={()=>restartWalkRef.current()}>Back to start <span aria-hidden="true">↺</span></button>}
        <button className="meeno-trail__step" type="button" onClick={()=>window.scrollBy({top:window.innerHeight*.65,behavior:"smooth"})} aria-label="Walk forward. You can also scroll to follow the trail.">
          <span aria-hidden="true" />
        </button>
      </div>
      <div className="meeno-trail__transcript">
        {story.segments.map((segment,index)=><p key={index}>{segment.text} {segment.after}</p>)}
      </div>
    </section>
  );
}
