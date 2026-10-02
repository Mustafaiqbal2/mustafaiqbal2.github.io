"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Soundscape = "ocean" | "forest";

// Quiet, locally synthesised surf, wind and insects. No remote media requests.
function createAmbience() {
  const Audio = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Audio) return null;
  const context=new Audio();
  const master=context.createGain();
  master.gain.value=.65;
  master.connect(context.destination);
  const ocean=context.createGain(),forest=context.createGain();
  ocean.gain.value=0;forest.gain.value=0;
  ocean.connect(master);forest.connect(master);
  const sources: AudioScheduledSourceNode[]=[];
  const noise=context.createBuffer(2,context.sampleRate*8,context.sampleRate);
  for(let channel=0;channel<2;channel++) {
    const data=noise.getChannelData(channel);
    let brown=0;
    for(let i=0;i<data.length;i++) {
      const white=Math.random()*2-1;
      brown=(brown+white*.025)/1.025;
      data[i]=white*.25+brown*2.4;
    }
    // Match the loop seam without a repeated click.
    const seam=2048;
    for(let i=0;i<seam;i++) {
      const mix=i/seam;
      data[data.length-seam+i]=data[data.length-seam+i]*(1-mix)+data[i]*mix;
    }
  }
  function bed(bus: GainNode,frequency: number,volume: number,rate: number,depth: number,offset: number) {
    const source=context.createBufferSource();source.buffer=noise;source.loop=true;
    source.loopStart=2048/context.sampleRate;source.loopEnd=noise.duration;
    const filter=context.createBiquadFilter();filter.type="lowpass";filter.frequency.value=frequency;filter.Q.value=.3;
    const gain=context.createGain();gain.gain.value=volume;
    const swell=context.createOscillator();swell.frequency.value=rate;
    const swellGain=context.createGain();swellGain.gain.value=depth;
    swell.connect(swellGain);swellGain.connect(gain.gain);
    source.connect(filter);filter.connect(gain);gain.connect(bus);
    source.start(0,offset);swell.start();sources.push(source,swell);
  }
  bed(ocean,670,.32,.085,.18,0);
  bed(ocean,2400,.09,.12,.065,3.3);
  bed(forest,380,.105,.065,.035,1.8);
  bed(forest,1450,.017,.19,.007,5.1);
  const chirpers=[2700,3450,4100].map((frequency,index)=>{
    const oscillator=context.createOscillator();oscillator.frequency.value=frequency;
    const gain=context.createGain();gain.gain.value=0;
    const pan=context.createStereoPanner();pan.pan.value=[-.7,.5,.1][index];
    oscillator.connect(gain);gain.connect(pan);pan.connect(forest);oscillator.start();sources.push(oscillator);
    return {oscillator,gain,index,next:context.currentTime+index*.9};
  });
  const timer=window.setInterval(()=>{
    if(context.state!=="running") return;
    const now=context.currentTime;
    chirpers.forEach(chirper=>{
      if(now<chirper.next) return;
      const start=now+.025;
      const count=3+Math.floor(Math.random()*4);
      for(let pulse=0;pulse<count;pulse++) {
        const t=start+pulse*.09;
        chirper.gain.gain.setValueAtTime(0,t);
        chirper.gain.gain.linearRampToValueAtTime(.005+Math.random()*.004,t+.008);
        chirper.gain.gain.exponentialRampToValueAtTime(.0001,t+.047);
        chirper.gain.gain.setValueAtTime(0,t+.055);
      }
      chirper.next=start+count*.09+1.2+Math.random()*3.5;
    });
  },200);
  function ramp(gain: GainNode,value: number,seconds: number) {
    const now=context.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setTargetAtTime(value,now,seconds);
  }
  return {
    context,
    scene(scene: Soundscape) { ramp(ocean,scene==="ocean"?1:0,.7);ramp(forest,scene==="forest"?1:0,.9); },
    mute(muted: boolean) { ramp(master,muted?0:.65,.12); },
    burst(strength: number) {
      if(context.state!=="running") return;
      const now=context.currentTime+.16;
      const small=strength<.2;
      const decay=small?.3:1.7;
      const source=context.createBufferSource();source.buffer=noise;
      const filter=context.createBiquadFilter();filter.type="lowpass";filter.frequency.value=small?1250:190;
      const gain=context.createGain();gain.gain.setValueAtTime(0,now);
      gain.gain.linearRampToValueAtTime(.38*strength,now+.018);
      gain.gain.exponentialRampToValueAtTime(.0001,now+decay);
      source.connect(filter);filter.connect(gain);gain.connect(master);
      source.start(now,Math.random()*4,decay+.1);
      source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
    },
    dispose() { window.clearInterval(timer);sources.forEach(source=>source.stop());void context.close(); }
  };
}

export function useAmbience(scene: Soundscape) {
  const audioRef=useRef<ReturnType<typeof createAmbience>>(null);
  const sceneRef=useRef(scene);
  const mutedRef=useRef(false);
  const [active,setActive]=useState(false);
  useEffect(()=>{sceneRef.current=scene;audioRef.current?.scene(scene);},[scene]);
  const start=useCallback(()=>{
    if(mutedRef.current) return;
    try {
      if(!audioRef.current) {
        audioRef.current=createAmbience();
        audioRef.current?.scene(sceneRef.current);
      }
      const audio=audioRef.current;
      if(!audio) return;
      // Called directly from a tap/focus gesture, as required by mobile Safari.
      void audio.context.resume().then(()=>{
        if(audioRef.current===audio) setActive(!mutedRef.current && audio.context.state==="running");
      }).catch(()=>setActive(false));
    } catch { setActive(false); }
  },[]);
  const toggle=useCallback(()=>{
    if(!audioRef.current || audioRef.current.context.state!=="running" || mutedRef.current) {
      mutedRef.current=false;audioRef.current?.mute(false);start();
    } else { mutedRef.current=true;audioRef.current.mute(true);setActive(false); }
  },[start]);
  const burst=useCallback((strength: number)=>{ if(!mutedRef.current) audioRef.current?.burst(strength); },[]);
  useEffect(()=>{
    const visibility=()=>{
      if(document.hidden) { void audioRef.current?.context.suspend().catch(()=>{});setActive(false); }
      else if(!mutedRef.current && audioRef.current) start();
    };
    document.addEventListener("visibilitychange",visibility);
    return ()=>{document.removeEventListener("visibilitychange",visibility);audioRef.current?.dispose();audioRef.current=null;};
  },[start]);
  return {active,start,toggle,burst};
}
