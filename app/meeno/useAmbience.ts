"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createTrailMusic } from "./trailMusic";
import type { AudioTap } from "./trailRecording";

type Soundscape = "ocean" | "forest" | "fireworks";

// Procedural surf/wind, a recorded burst, and the continuous Married Life track.
export function createAmbience(record = false) {
  const Audio = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Audio) return null;
  const context=new Audio();
  const master=context.createGain();
  master.gain.value=.65;
  const recording=record?context.createMediaStreamDestination():null;
  master.connect(recording ?? context.destination);
  const music=createTrailMusic(context,master);
  const musicReady=music.preload();
  const ocean=context.createGain(),forest=context.createGain(),effects=context.createGain();
  ocean.gain.value=0;forest.gain.value=0;effects.gain.value=.65;
  ocean.connect(master);forest.connect(master);effects.connect(master);
  let burstSample: AudioBuffer | null=null;
  const burstReady=fetch('/meeno/firework-burst.mp3').then(response=>{
    if(!response.ok) throw new Error('Audio unavailable');
    return response.arrayBuffer();
  }).then(data=>context.decodeAudioData(data)).then(buffer=>{burstSample=buffer;return true;}).catch(()=>false);
  // A low, diffuse outdoor tail; no pitched whistle or synthesized sub-thump.
  const echo=context.createDelay(1);echo.delayTime.value=.21;
  const echoTone=context.createBiquadFilter();echoTone.type='lowpass';echoTone.frequency.value=780;
  const echoGain=context.createGain();echoGain.gain.value=.20;
  effects.connect(echo);echo.connect(echoTone);echoTone.connect(echoGain);echoGain.connect(master);
  echoGain.connect(echo);
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
    recording,
    capture():AudioTap {
      const destination=context.createMediaStreamDestination();
      master.connect(destination);
      let released=false;
      return {stream:destination.stream,dispose(){
        if(released) return;
        released=true;master.disconnect(destination);
        destination.stream.getTracks().forEach(track=>track.stop());
      }};
    },
    ready() { return Promise.all([musicReady,burstReady]).then(loaded=>loaded.every(Boolean)); },
    scene(scene: Soundscape) {
      ramp(ocean,scene==="ocean"?1:0,.7);
      ramp(forest,scene==="forest"?.28:scene==="fireworks"?.07:0,.9);
      music.scene(scene==="ocean"?null:scene);
    },
    mute(muted: boolean) { ramp(master,muted?0:.65,.12); },
    launch(panValue = 0) {
      if(context.state!=="running") return;
      const now=context.currentTime+.02;
      const source=context.createBufferSource();source.buffer=noise;
      const band=context.createBiquadFilter();band.type="bandpass";band.Q.value=.4;
      band.frequency.setValueAtTime(460,now);band.frequency.exponentialRampToValueAtTime(1250,now+1.8);
      const gain=context.createGain();gain.gain.setValueAtTime(.0001,now);
      gain.gain.exponentialRampToValueAtTime(.022,now+.1);
      gain.gain.exponentialRampToValueAtTime(.0001,now+1.95);
      const pan=context.createStereoPanner();pan.pan.value=Math.max(-.75,Math.min(.75,panValue));
      source.connect(band);band.connect(gain);gain.connect(pan);pan.connect(effects);
      source.start(now,Math.random()*4,2);
      source.onended=()=>{source.disconnect();band.disconnect();gain.disconnect();pan.disconnect();};
    },
    burst(strength: number, panValue = 0) {
      music.duck(strength);
      if(context.state!=="running" || !burstSample) return;
      const small=strength<.2;
      const source=context.createBufferSource();source.buffer=burstSample;
      source.playbackRate.value=small?1.28+Math.random()*.22:.86+Math.random()*.14;
      const filter=context.createBiquadFilter();filter.type="lowpass";filter.frequency.value=small?2100:1450;
      const gain=context.createGain();gain.gain.value=small?.026:strength*.34;
      const pan=context.createStereoPanner();pan.pan.value=Math.max(-.8,Math.min(.8,panValue));
      source.connect(filter);filter.connect(gain);gain.connect(pan);pan.connect(effects);
      source.start(context.currentTime+.13+Math.random()*.045);
      source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();pan.disconnect();};
    },
    dispose() { window.clearInterval(timer);music.dispose();sources.forEach(source=>source.stop());void context.close(); }
  };
}

export function useAmbience(scene: Soundscape) {
  const audioRef=useRef<ReturnType<typeof createAmbience>>(null);
  const sceneRef=useRef(scene);
  const mutedRef=useRef(false);
  const exportingRef=useRef(false);
  const [active,setActive]=useState(false);
  useEffect(()=>{sceneRef.current=scene;audioRef.current?.scene(scene);},[scene]);
  const start=useCallback(()=>{
    if(mutedRef.current || exportingRef.current) return;
    try {
      if(!audioRef.current) {
        audioRef.current=createAmbience();
        audioRef.current?.scene(sceneRef.current);
      }
      const audio=audioRef.current;
      if(!audio) return;
      // Try immediately; a later gesture resumes contexts blocked by autoplay policy.
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
  const launch=useCallback((pan = 0)=>{ if(!mutedRef.current) audioRef.current?.launch(pan); },[]);
  const burst=useCallback((strength: number,pan = 0)=>{ if(!mutedRef.current) audioRef.current?.burst(strength,pan); },[]);
  const celebrate=useCallback(()=>{sceneRef.current="fireworks";audioRef.current?.scene("fireworks");},[]);
  const replay=useCallback(()=>{sceneRef.current="forest";audioRef.current?.scene("forest");},[]);
  const capture=useCallback(()=>{
    try {return audioRef.current?.capture() ?? null;} catch {return null;}
  },[]);
  const exporting=useCallback((paused: boolean)=>{
    exportingRef.current=paused;
    document.documentElement.classList.toggle("meeno-exporting",paused);
    if(paused) void audioRef.current?.context.suspend().catch(()=>{});
    else if(!mutedRef.current) start();
  },[start]);
  useEffect(()=>{
    const visibility=()=>{
      if(document.hidden) { void audioRef.current?.context.suspend().catch(()=>{});setActive(false); }
      else if(!mutedRef.current && audioRef.current) start();
    };
    document.addEventListener("visibilitychange",visibility);
    return ()=>{document.removeEventListener("visibilitychange",visibility);document.documentElement.classList.remove("meeno-exporting");audioRef.current?.dispose();audioRef.current=null;};
  },[start]);
  useEffect(()=>{start();},[start]);
  return {active,start,toggle,launch,burst,celebrate,replay,exporting,capture};
}
