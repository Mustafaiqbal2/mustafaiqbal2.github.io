import { loadTrailArtwork } from "./trailAssets";
import { createTrailRenderer } from "./trailRenderer";
import { celebrationAt, FIREWORK_BURSTS, followupVisibility, messageVisibility, SHELLS, type TrailStory } from "./trailSequence";
import { createTypewriter } from "./trailTypewriter";
import { captionLines, FINAL_NOTE, VIDEO_SECONDS, VIDEO_YES_AT, videoAt, videoMime } from "./trailVideoTimeline";
import type { createAmbience } from "./useAmbience";

type Sound = NonNullable<ReturnType<typeof createAmbience>>;
const WIDTH=720,HEIGHT=1280,FPS=24;

function caption(text: string, font: string, width: number, lineHeight: number) {
  const measure=document.createElement("canvas").getContext("2d")!;
  measure.font=font;
  const lines=captionLines(text,width,value=>measure.measureText(value).width).map(line=>{
    const ink=document.createElement("canvas");ink.width=WIDTH;ink.height=Math.ceil(lineHeight+40);
    const ctx=ink.getContext("2d")!;ctx.font=font;ctx.fillStyle="#fff";ctx.textBaseline="middle";
    ctx.shadowColor="#000";ctx.shadowBlur=12;ctx.shadowOffsetY=3;
    const x=(WIDTH-ctx.measureText(line.text).width)/2;
    ctx.fillText(line.text,x,lineHeight/2+20);
    const ends=Array.from(line.text).map((_,i)=>measure.measureText(Array.from(line.text).slice(0,i+1).join("")).width);
    return {...line,ink,x,ends};
  });
  const clock=createTypewriter(text);
  return {
    height:lines.length*lineHeight,
    get complete(){return clock.complete;},
    update(visible: boolean,delta: number) { return clock.advance(visible,delta); },
    draw(ctx: CanvasRenderingContext2D,top: number,count: number,opacity=1) {
      ctx.save();ctx.globalAlpha=opacity;
      lines.forEach((line,i)=>{
        const shown=Math.min(line.ends.length,Math.max(0,count-line.start));
        if(!shown) return;
        const right=shown===line.ends.length?WIDTH:line.x+line.ends[shown-1]+1;
        ctx.drawImage(line.ink,0,0,right,line.ink.height,0,top+i*lineHeight-20,right,line.ink.height);
      });
      ctx.restore();
    }
  };
}

export async function exportTrailVideo({story,canvas,sound,signal,onProgress}: {
  story:TrailStory;canvas:HTMLCanvasElement;sound:Sound;signal:AbortSignal;onProgress:(value:number)=>void;
}): Promise<Blob> {
  const mime=typeof MediaRecorder!=="undefined" ? videoMime(type=>MediaRecorder.isTypeSupported(type)) : null;
  if(!mime || !canvas.captureStream || !sound.recording) throw new Error("Video export isn't supported in this browser.");
  const [artwork,ready]=await Promise.all([loadTrailArtwork(),sound.ready(),document.fonts.ready]);
  if(signal.aborted) throw new DOMException("Cancelled","AbortError");
  if(!ready) throw new Error("The music couldn't load. Please try again.");
  const sceneCanvas=document.createElement("canvas");
  const world=createTrailRenderer(sceneCanvas,artwork,{width:WIDTH,height:HEIGHT});
  if(!world) throw new Error("The video renderer couldn't start. Please try again.");
  const ctx=canvas.getContext("2d",{alpha:false})!;
  canvas.width=WIDTH;canvas.height=HEIGHT;
  const family=getComputedStyle(canvas).getPropertyValue("--font-sans").trim() || "system-ui";
  const lines=story.segments.map(segment=>({
    main:caption(segment.text,`450 32px ${family}`,612,54),
    after:segment.after?caption(segment.after,`450 30px ${family}`,612,51):null
  }));
  const question=caption(story.question,"400 52px Georgia",590,72);
  const note=caption(FINAL_NOTE,"400 29px Georgia",636,44);
  const shade=document.createElement("canvas");shade.width=WIDTH;shade.height=HEIGHT;
  const shadeInk=shade.getContext("2d")!;
  const edges=shadeInk.createLinearGradient(0,0,WIDTH,0);
  edges.addColorStop(0,"rgba(0,3,5,.3)");edges.addColorStop(.28,"transparent");
  edges.addColorStop(.72,"transparent");edges.addColorStop(1,"rgba(0,3,5,.3)");
  shadeInk.fillStyle=edges;shadeInk.fillRect(0,0,WIDTH,HEIGHT);
  let videoStream:MediaStream|null=null,stream:MediaStream|null=null;
  let recorder:MediaRecorder|null=null,frame=0,wake:WakeLockSentinel|null=null;
  let visibility=()=>{},abort=()=>{};
  try {
    world.draw(0,0,true,null);ctx.drawImage(sceneCanvas,0,0,WIDTH,HEIGHT);
    videoStream=canvas.captureStream(FPS);
    stream=new MediaStream([...videoStream.getVideoTracks(),...sound.recording.stream.getAudioTracks()]);
    recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:2800000,audioBitsPerSecond:128000});
    try { wake=await navigator.wakeLock?.request("screen") ?? null; } catch { /* Optional on older phones. */ }
    if(signal.aborted) throw new DOMException("Cancelled","AbortError");
    return await new Promise<Blob>((resolve,reject)=>{
      const chunks:Blob[]=[];
      let elapsed=0,last=0,lastDraw=0,lastLaunch=-1,lastBurst=-1,lastPercent=-1,celebrating=false;
      let failure:Error|null=null;
      function stop(error?:Error) {
        failure=error ?? failure;cancelAnimationFrame(frame);frame=0;
        if(recorder?.state!=="inactive") recorder?.stop();
      }
      recorder!.ondataavailable=event=>{if(event.data.size) chunks.push(event.data);};
      recorder!.onerror=()=>stop(new Error("The browser couldn't finish recording. Please try again."));
      recorder!.onstop=()=>{
        if(failure) reject(failure);
        else if(!chunks.length) reject(new Error("The recording was empty. Please try again."));
        else resolve(new Blob(chunks,{type:recorder!.mimeType || mime}));
      };
      function renderFrame(now:number) {
        frame=0;
        if(signal.aborted || document.hidden) return;
        if(!last) last=now;
        elapsed+=(now-last)/1000;last=now;
        if(now-lastDraw<1000/FPS) {frame=requestAnimationFrame(draw);return;}
        const delta=lastDraw?Math.min(.25,(now-lastDraw)/1000):0;lastDraw=now;
        const state=videoAt(elapsed);
        if(state.ending!==null && !celebrating) {celebrating=true;sound.scene("fireworks");}
        if(state.ending!==null) {
          const sequence=celebrationAt(state.ending);
          SHELLS.forEach((shell,index)=>{
            if(index>lastLaunch && sequence.fireworks>=shell.at-2.2) {sound.launch(shell.x*1.7);lastLaunch=index;}
          });
          FIREWORK_BURSTS.forEach((burst,index)=>{
            if(index>lastBurst && sequence.fireworks>=burst.at) {sound.burst(burst.strength,burst.pan);lastBurst=index;}
          });
        }
        world!.draw(state.progress,elapsed,true,state.ending);
        ctx.drawImage(sceneCanvas,0,0,WIDTH,HEIGHT);
        ctx.globalAlpha=state.ending===null?1:.35;
        ctx.drawImage(shade,0,0);ctx.globalAlpha=1;
        if(state.ending===null) {
          lines.forEach((line,index)=>{
            const opacity=messageVisibility(state.progress,index);
            const mainCount=line.main.update(opacity>.04,delta);
            const afterOpacity=line.main.complete?followupVisibility(state.progress,index):0;
            const afterCount=line.after?.update(opacity>.04 && afterOpacity>.04,delta) ?? 0;
            if(opacity<=0) return;
            const top=HEIGHT*.61-(line.main.height+(line.after?line.after.height+40:0))/2;
            line.main.draw(ctx,top,mainCount,opacity);
            line.after?.draw(ctx,top+line.main.height+40,afterCount,opacity*afterOpacity);
          });
          const count=question.update(state.question,delta);
          if(state.question) {
            question.draw(ctx,HEIGHT*.51,count);
            if(question.complete) {
              const y=HEIGHT*.51+question.height+45;
              ctx.font="32px Georgia";ctx.textAlign="center";
              for(const [label,x] of [["Yes",195],["No",525]] as const) {
                ctx.fillStyle=label==="Yes" && elapsed>VIDEO_YES_AT-1?"#213225":"rgba(2,8,9,.85)";
                ctx.fillRect(x-105,y,210,82);ctx.strokeStyle="#9cac98";ctx.lineWidth=1;ctx.strokeRect(x-105,y,210,82);
                ctx.fillStyle="#fff";ctx.fillText(label,x,y+51);
              }
              ctx.textAlign="start";
            }
          }
        } else {
          const shown=celebrationAt(state.ending).fireworks>=SHELLS[SHELLS.length-1].at;
          const count=note.update(shown,delta);
          if(shown) note.draw(ctx,HEIGHT-160-note.height,count);
        }
        const percent=Math.min(99,Math.floor(elapsed/VIDEO_SECONDS*100));
        if(percent!==lastPercent) {lastPercent=percent;onProgress(percent);}
        if(state.finished) {stop();return;}
        frame=requestAnimationFrame(draw);
      }
      function draw(now:number) {
        try {renderFrame(now);} catch {stop(new Error("The video couldn't finish rendering. Please try again."));}
      }
      visibility=()=>{
        if(document.hidden) {
          cancelAnimationFrame(frame);frame=0;last=lastDraw=0;
          if(recorder?.state==="recording") recorder.pause();
          void sound.context.suspend().catch(()=>{});
        } else {
          void sound.context.resume().then(()=>{
            if(signal.aborted || recorder?.state!=="paused") return;
            recorder.resume();last=lastDraw=0;frame=requestAnimationFrame(draw);
          }).catch(()=>stop(new Error("Audio could not resume. Please try exporting again.")));
        }
      };
      abort=()=>stop(new DOMException("Cancelled","AbortError"));
      signal.addEventListener("abort",abort,{once:true});
      document.addEventListener("visibilitychange",visibility);
      sound.scene("forest");
      recorder!.start(1000);frame=requestAnimationFrame(draw);
    });
  } finally {
    cancelAnimationFrame(frame);
    signal.removeEventListener("abort",abort);document.removeEventListener("visibilitychange",visibility);
    if(recorder && recorder.state!=="inactive") recorder.stop();
    stream?.getTracks().forEach(track=>track.stop());videoStream?.getTracks().forEach(track=>track.stop());
    void wake?.release().catch(()=>{});
    world.dispose();
  }
}
