"use client";

import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from "react";
import { loadTrailArtwork } from "./trailAssets";
import { celebrationAt, evadePosition, FIREWORK_BURSTS, followupVisibility, messageVisibility, MESSAGE_WINDOWS, measureTrail, questionVisible, SHELLS, trailProgress, type TrailStory } from "./trailSequence";
import type { WorldRenderer } from "./trailRenderer";
import { bindTypewriter } from "./trailTypewriter";
import { TypedWords } from "./TypedWords";
import { FINAL_NOTE } from "./trailVideoTimeline";
import { TrailVideoDownload } from "./TrailVideoDownload";
import { createTrailRecording, type AudioTap, type RecordedLayer, type RecordedChoices } from "./trailRecording";

type TrailRendererModule = typeof import("./trailRenderer");
let trailRendererPromise: Promise<TrailRendererModule> | null = null;

export function preloadTrailRenderer() {
  trailRendererPromise ??= import("./trailRenderer");
  return trailRendererPromise;
}

export function TrailEntrance({ story, onLaunch, onBurst, onCelebrate, onReplay, onExportBusy, onCaptureAudio, active }: {
  story: TrailStory; onLaunch: (pan?: number) => void; onBurst: (strength: number, pan?: number) => void;
  onCelebrate: () => void; onReplay: () => void; onExportBusy: (busy:boolean)=>void; onCaptureAudio:()=>AudioTap|null; active: boolean;
}) {
  const stageRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wordsRef = useRef<(HTMLDivElement | null)[]>([]);
  const afterRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const lineRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const questionTextRef = useRef<HTMLHeadingElement>(null);
  const finalNoteRef = useRef<HTMLParagraphElement>(null);
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
  const exportingRef = useRef(false);
  const [ending, setEnding] = useState(false);
  const [finished, setFinished] = useState(false);
  const [recordedVideo,setRecordedVideo]=useState<Blob|null>(null);
  const [recordingPending,setRecordingPending]=useState(false);
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
    let choicesWereReady = false;
    let capture:ReturnType<typeof createTrailRecording>=null;
    let captureRevision=0,captureFinished=false;
    let captureLayers:RecordedLayer[]=[],captureChoices:RecordedChoices|null=null;
    let captureViewport={width:1,height:1};
    const lastOpacity = story.segments.map(() => -1);
    const lastAfter = story.segments.map(() => -1);
    const typing = story.segments.map((segment,index) => ({
      main: bindTypewriter(lineRefs.current[index],segment.text),
      after: bindTypewriter(afterRefs.current[index],segment.after ?? ""),
      length: Array.from(segment.text).length,
      afterLength: Array.from(segment.after ?? "").length
    }));
    const questionTyping = bindTypewriter(questionTextRef.current,story.question);
    const finalTyping = bindTypewriter(finalNoteRef.current,FINAL_NOTE);
    const measureRecording = () => {
      const view=canvas.getBoundingClientRect();
      captureViewport={width:view.width,height:view.height};
      captureLayers=[];
      function layer(node:HTMLElement|null,opacity:()=>number,offsetY?:()=>number) {
        const image=node?.querySelector<HTMLCanvasElement>("canvas");
        if(!image) return;
        const rect=image.getBoundingClientRect();
        captureLayers.push({canvas:image,x:rect.left-view.left,y:rect.top-view.top,width:rect.width,height:rect.height,opacity,offsetY});
      }
      story.segments.forEach((_,index)=>{
        layer(lineRefs.current[index],()=>lastOpacity[index]);
        const measuredShift=(1-Math.max(0,lastAfter[index]))*7;
        layer(afterRefs.current[index],()=>lastOpacity[index]*lastAfter[index],()=>((1-Math.max(0,lastAfter[index]))*7)-measuredShift);
      });
      layer(questionTextRef.current,()=>questionWasVisible?1:0);
      layer(finalNoteRef.current,()=>finalNoteShown?1:0);
      const choices=choicesRef.current?.getBoundingClientRect();
      captureChoices=choices?{x:choices.left-view.left,y:choices.top-view.top,width:choices.width,height:choices.height,visible:()=>choicesWereReady}:null;
    };
    const beginRecording = () => {
      const generation=++captureRevision;
      capture?.dispose();captureFinished=false;
      setRecordedVideo(null);
      measureRecording();
      capture=createTrailRecording(captureViewport.width,captureViewport.height,onCaptureAudio(),file=>{
        if(!disposed && generation===captureRevision) {setRecordedVideo(file);setRecordingPending(false);}
      });
      setRecordingPending(Boolean(capture));
    };

    const updateWords = (position: number, seconds = 0) => {
      const celebrating = elapsedRef.current !== null;
      wordsRef.current.forEach((node, index) => {
        if (!node) return;
        const opacity = celebrating ? 0 : messageVisibility(position, index);
        const [enter,leave,followup] = MESSAGE_WINDOWS[index];
        if (!celebrating && position <= enter) {
          typing[index].main.reset();
          typing[index].after.reset();
        }
        const catchup = Math.max(0,Math.min(1,(position-enter)/(leave-enter-.018)*2-1));
        typing[index].main.advance(opacity>.04,seconds,reducedMotion.matches,typing[index].length*catchup);
        if (Math.abs(opacity-lastOpacity[index]) > .001) {
          lastOpacity[index]=opacity;
          node.style.opacity=opacity.toFixed(3);
        }
        const after = afterRefs.current[index];
        if (after) {
          const arrival = typing[index].main.complete ? followupVisibility(position, index) : 0;
          const afterCatchup = Math.max(0,Math.min(1,(position-followup)/(leave-followup-.018)*2-1));
          typing[index].after.advance(opacity>.04 && arrival>.04,seconds,reducedMotion.matches,typing[index].afterLength*afterCatchup);
          if (Math.abs(arrival-lastAfter[index]) > .001) {
            lastAfter[index]=arrival;
            after.style.opacity=arrival.toFixed(3);
            after.style.transform=`translateY(${((1-arrival)*7).toFixed(2)}px)`;
          }
        }
      });
      const visible = !celebrating && questionVisible(position);
      if (!visible && !celebrating) questionTyping.reset();
      questionTyping.advance(visible,seconds,reducedMotion.matches);
      finalTyping.advance(finalNoteShown,seconds,reducedMotion.matches);
      const choicesReady = visible && questionTyping.complete;
      if (choicesReady !== choicesWereReady) {
        choicesWereReady=choicesReady;
        stage.dataset.choicesReady=String(choicesReady);
        if (choicesRef.current) choicesRef.current.inert=!choicesReady;
      }
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
      measureRecording();
    };
    measureRef.current=measure;
    const tick = (now: number) => {
      frame = 0;
      if (disposed || document.hidden || !activeRef.current || exportingRef.current) return;
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
      if (now-lastPaint >= 1000/30 || reducedMotion.matches) {
        updateWords(reducedMotion.matches ? target : progress,Math.min(now-(lastPaint || now),80)/1000);
        if (!reducedMotion.matches) sceneTime += Math.min(now-(lastPaint || now),80)/1000;
        renderer?.draw(reducedMotion.matches ? 0 : progress,sceneTime,!reducedMotion.matches,elapsedRef.current);
        if(renderer) capture?.frame(canvas,captureViewport,captureLayers,captureChoices,elapsedRef.current!==null);
        lastPaint = now;
      }
      if(done && !captureFinished) {captureFinished=true;capture?.finish();}
      if (activeRef.current && (!reducedMotion.matches || (elapsedRef.current !== null && !done))) frame=requestAnimationFrame(tick);
    };
    function start() {
      if (activeRef.current && !frame && !document.hidden) { lastFrame=0; lastPaint=0; frame=requestAnimationFrame(tick); }
    }
    resumeRef.current=start;
    startShowRef.current = () => {
      if (elapsedRef.current !== null || !questionVisible(target) || !questionTyping.complete) return;
      progress=target=1;
      elapsedRef.current=0;
      onCelebrate();
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
      onReplay();
      progress=target=sceneTime=0;
      lastBurst=-1;
      lastLaunch=-1;
      finalNoteShown=false;
      stage.dataset.finalNote="false";
      typing.forEach(line=>{line.main.reset();line.after.reset();});
      questionTyping.reset();
      finalTyping.reset();
      lastDodgeRef.current=0;
      dodgeStepRef.current=0;
      done=false;
      setEnding(false);
      setFinished(false);
      setNoPosition(null);
      stage.dataset.walked="false";
      updateWords(0);
      renderer?.draw(0,0,!reducedMotion.matches,null);
      beginRecording();
      start();
    };
    const rebuildWords = () => {
      typing.forEach(line=>{line.main.rebuild();line.after.rebuild();});
      questionTyping.rebuild();finalTyping.rebuild();
      measureRecording();
    };
    void document.fonts.ready.then(()=>{if(!disposed) rebuildWords();});
    const resize = () => { renderer?.resize(); rebuildWords(); measure(); start(); };
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
          if(!capture) beginRecording();
        }
        stage.dataset.renderer=renderer ? "spatial" : "fallback";
      } catch (error) {
        if (!disposed && request === revision) stage.dataset.renderer="fallback";
        if (process.env.NODE_ENV === "development") console.warn("Woodland renderer unavailable",error);
      }
    };
    const visibility = () => {
      capture?.pause(document.hidden);
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
      captureRevision++;capture?.dispose();
      cancelAnimationFrame(frame);observer.disconnect();renderer?.dispose();
      window.removeEventListener("scroll",readProgress);
      document.removeEventListener("visibilitychange",visibility);
      reducedMotion.removeEventListener("change",motionChange);
      canvas.removeEventListener("webglcontextlost",contextLost);
      canvas.removeEventListener("webglcontextrestored",prepare);
    };
  }, [onLaunch,onBurst,onCelebrate,onReplay,onCaptureAudio,story]);

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
    <section ref={stageRef} className={`meeno-trail${ending ? " meeno-trail--ending" : ""}${finished ? " meeno-trail--finished" : ""}`} aria-label="A walk through the moonlit woods">
      <div className="meeno-trail__scene">
        <div className="meeno-trail__fallback" aria-hidden="true" />
        <canvas ref={canvasRef} className="meeno-trail__canvas" aria-hidden="true" />
        <div className="meeno-trail__shade" aria-hidden="true" />
        <div className="meeno-trail__words" aria-hidden="true">
          {story.segments.map((segment,index) => (
            <div className="meeno-trail__speech" key={index} ref={node=>{wordsRef.current[index]=node;}}>
              <p ref={node=>{lineRefs.current[index]=node;}}><TypedWords text={segment.text} /></p>
              {segment.after && <p className="meeno-trail__after" ref={node=>{afterRefs.current[index]=node;}}><TypedWords text={segment.after} /></p>}
            </div>
          ))}
        </div>
        <div ref={questionRef} className="meeno-invitation" aria-hidden="true" inert>
          <div className="meeno-invitation__rule" aria-hidden="true"><span /></div>
          <h1 ref={questionTextRef} aria-label={story.question}><TypedWords text={story.question} /></h1>
          <div ref={choicesRef} className="meeno-trail__choices" inert onPointerMove={approachNo} onPointerDown={approachNo}>
            <button className="meeno-choice meeno-choice--yes" type="button" onClick={()=>startShowRef.current()}>Yes</button>
            <button ref={noRef} className="meeno-choice meeno-choice--no" type="button"
              onPointerDown={event=>{event.preventDefault();moveNo();}}
              onClick={event=>{if(event.detail===0) moveNo();}}
              style={noPosition ? {right:"auto",left:0,transform:`translate(${noPosition.x}px,${noPosition.y}px)`} : undefined}>No</button>
          </div>
        </div>
        <p ref={finalNoteRef} className="meeno-fireworks-note" aria-hidden="true"><TypedWords text={FINAL_NOTE} /></p>
        {ending && <p className="meeno-trail__transcript" role="status">{finished ? "The fireworks have finished." : "Fireworks above the forest."}</p>}
        {finished && <>
          <div className="meeno-ending-actions">
            <button ref={returnRef} className="meeno-return" type="button" onClick={()=>restartWalkRef.current()}>Back to start <span aria-hidden="true">↺</span></button>
            <TrailVideoDownload story={story} prepared={recordedVideo} pending={recordingPending} onBusy={busy=>{
              exportingRef.current=busy;onExportBusy(busy);
              if(!busy) resumeRef.current();
            }} />
          </div>
        </>}
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
