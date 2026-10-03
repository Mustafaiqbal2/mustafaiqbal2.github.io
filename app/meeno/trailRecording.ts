import { videoMime } from "./trailVideoTimeline";

export type AudioTap = {stream:MediaStream;dispose:()=>void};
export type RecordedLayer = {
  canvas:HTMLCanvasElement;x:number;y:number;width:number;height:number;
  opacity:()=>number;offsetY?:()=>number;
};
export type RecordedChoices = {x:number;y:number;width:number;height:number;visible:()=>boolean};

export function recordingSize(width:number,height:number) {
  const scale=Math.min(1.5,540/width,960/height);
  return {width:Math.max(2,Math.round(width*scale/2)*2),height:Math.max(2,Math.round(height*scale/2)*2)};
}

// Save frames already rendered for the walk. No second WebGL scene, replay,
// screen/microphone capture, or extra soundtrack is needed for the download.
export function createTrailRecording(width:number,height:number,tap:AudioTap|null,onReady:(file:Blob|null)=>void) {
  if(!tap) return null;
  let recorder:MediaRecorder|null=null,stream:MediaStream|null=null;
  let disposed=false,failed=false,finishing=false,started=false,bytes=0;
  const chunks:Blob[]=[];
  try {
    const mime=typeof MediaRecorder!=="undefined"?videoMime(type=>MediaRecorder.isTypeSupported(type)):null;
    if(!mime) {tap.dispose();return null;}
    const canvas=document.createElement("canvas"),size=recordingSize(width,height);
    canvas.width=size.width;canvas.height=size.height;
    const ctx=canvas.getContext("2d",{alpha:false,desynchronized:true});
    if(!ctx || !canvas.captureStream) {tap.dispose();return null;}
    stream=canvas.captureStream(24);
    tap.stream.getAudioTracks().forEach(track=>stream!.addTrack(track));
    recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:1800000,audioBitsPerSecond:128000});
    const shade=document.createElement("canvas");shade.width=canvas.width;shade.height=canvas.height;
    const ink=shade.getContext("2d")!;
    const edge=ink.createLinearGradient(0,0,shade.width,0);
    edge.addColorStop(0,"rgba(0,3,5,.3)");edge.addColorStop(.28,"transparent");
    edge.addColorStop(.72,"transparent");edge.addColorStop(1,"rgba(0,3,5,.3)");
    ink.fillStyle=edge;ink.fillRect(0,0,shade.width,shade.height);
    let released=false;
    function release() {
      if(released) return;
      released=true;stream?.getTracks().forEach(track=>track.stop());tap!.dispose();
    }
    function stop(error=false) {
      failed ||= error;finishing=true;
      if(recorder?.state!=="inactive") recorder?.stop();
      else if(!started) {release();if(!disposed) onReady(null);}
    }
    recorder.ondataavailable=event=>{
      if(event.data.size && !failed && !disposed) {
        chunks.push(event.data);bytes+=event.data.size;
        // Very long visits can use the existing bounded cinematic fallback.
        if(bytes>80*1024*1024) stop(true);
      }
    };
    recorder.onerror=()=>stop(true);
    recorder.onstop=()=>{
      release();
      if(!disposed) onReady(!failed && chunks.length?new Blob(chunks,{type:recorder!.mimeType || mime}):null);
      chunks.length=0;
    };
    return {
      frame(source:HTMLCanvasElement,viewport:{width:number;height:number},layers:RecordedLayer[],choices:RecordedChoices|null,ending:boolean) {
        if(disposed || finishing || failed || recorder?.state==="paused") return;
        try {
          const scale=Math.min(canvas.width/viewport.width,canvas.height/viewport.height);
          const x=(canvas.width-viewport.width*scale)/2,y=(canvas.height-viewport.height*scale)/2;
          ctx.fillStyle="#03090e";ctx.fillRect(0,0,canvas.width,canvas.height);
          ctx.drawImage(source,x,y,viewport.width*scale,viewport.height*scale);
          ctx.globalAlpha=ending?.35:1;ctx.drawImage(shade,0,0);ctx.globalAlpha=1;
          ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
          for(const layer of layers) {
            const opacity=layer.opacity();
            if(opacity<=.002 || !layer.canvas.width || !layer.canvas.height) continue;
            ctx.globalAlpha=Math.min(1,opacity);
            ctx.drawImage(layer.canvas,layer.x,layer.y+(layer.offsetY?.() ?? 0),layer.width,layer.height);
          }
          ctx.globalAlpha=1;
          if(choices?.visible()) {
            const buttonWidth=112,buttonHeight=45;
            ctx.font="16px Georgia";ctx.textAlign="center";ctx.textBaseline="middle";
            for(const [label,left] of [["Yes",choices.x],["No",choices.x+choices.width-buttonWidth]] as const) {
              ctx.fillStyle="rgba(2,8,9,.85)";ctx.strokeStyle="#9cac98";ctx.lineWidth=1;
              ctx.fillRect(left,choices.y,buttonWidth,buttonHeight);ctx.strokeRect(left,choices.y,buttonWidth,buttonHeight);
              ctx.fillStyle="#fff";ctx.fillText(label,left+buttonWidth/2,choices.y+buttonHeight/2);
            }
          }
          ctx.restore();
          if(!started) {recorder!.start(1000);started=true;}
        } catch {stop(true);}
      },
      pause(hidden:boolean) {
        if(disposed || finishing || !started) return;
        if(hidden && recorder?.state==="recording") recorder.pause();
        else if(!hidden && recorder?.state==="paused") recorder.resume();
      },
      finish() {if(!finishing) stop();},
      dispose() {
        disposed=true;
        if(recorder && recorder.state!=="inactive") recorder.stop();
        release();chunks.length=0;
      }
    };
  } catch {
    stream?.getTracks().forEach(track=>track.stop());tap.dispose();return null;
  }
}
