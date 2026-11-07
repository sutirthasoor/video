import {useEffect,useRef,useState} from 'react';
// Streams one YouTube video inside our own player shell:
//  - YouTube's own controls, title bar, share/"Watch on YouTube" buttons and keyboard shortcuts are switched off
//  - a transparent shield sits over the iframe so clicks never reach YouTube's UI; we supply our own controls
//  - the viewer's email floats over the picture as a deterrent against screen recording
let apiP;
const loadYT=()=>apiP||(apiP=new Promise(res=>{if(window.YT?.Player)return res(window.YT);
  const prev=window.onYouTubeIframeAPIReady;window.onYouTubeIframeAPIReady=()=>{prev&&prev();res(window.YT)};
  const s=document.createElement('script');s.src='https://www.youtube.com/iframe_api';document.head.appendChild(s);}));
const fmt=s=>{s=Math.max(0,Math.floor(s||0));const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return (h?h+':'+String(m).padStart(2,'0'):m)+':'+String(x).padStart(2,'0')};
export default function Player({vid,mark,onEnd}){
  const box=useRef(),host=useRef(),pl=useRef(),endRef=useRef(onEnd);endRef.current=onEnd;
  const [s,setS]=useState({ready:false,state:-1,cur:0,dur:0,muted:false});const [pos,setPos]=useState(0);const [err,setErr]=useState(false);
  useEffect(()=>{let dead=false,t,w;setS({ready:false,state:-1,cur:0,dur:0,muted:false});setErr(false);
    loadYT().then(YT=>{if(dead)return;const el=document.createElement('div');host.current.innerHTML='';host.current.appendChild(el);
      pl.current=new YT.Player(el,{videoId:vid,host:'https://www.youtube-nocookie.com',width:'100%',height:'100%',
        playerVars:{controls:0,disablekb:1,modestbranding:1,rel:0,fs:0,iv_load_policy:3,playsinline:1,origin:location.origin},
        events:{onReady:()=>!dead&&setS(x=>({...x,ready:true,dur:pl.current.getDuration()})),
          onStateChange:e=>!dead&&(setS(x=>({...x,state:e.data,dur:pl.current.getDuration()||x.dur})),e.data===0&&endRef.current&&endRef.current()),
          onError:()=>!dead&&setErr(true)}});
      t=setInterval(()=>{const p=pl.current;if(p&&p.getCurrentTime)setS(x=>({...x,cur:p.getCurrentTime(),muted:p.isMuted()}))},400);
      w=setInterval(()=>setPos(p=>(p+1)%4),15000);});
    return()=>{dead=true;clearInterval(t);clearInterval(w);try{pl.current&&pl.current.destroy()}catch{}pl.current=null};},[vid]);
  const p=()=>pl.current;const playing=s.state===1,ended=s.state===0;
  const toggle=()=>{if(!s.ready)return;playing?p().pauseVideo():p().playVideo()};
  const seek=e=>{const v=Number(e.target.value);p().seekTo(v,true);setS(x=>({...x,cur:v}))};
  const mute=()=>{s.muted?p().unMute():p().mute()};
  const full=()=>{const el=box.current;document.fullscreenElement?document.exitFullscreen():el.requestFullscreen?.()};
  const corner=['tl','tr','br','bl'][pos];
  return <div className="vp" ref={box} onContextMenu={e=>e.preventDefault()}>
    <div className="vp-frame" ref={host}/>
    <div className="vp-shield" onClick={toggle} onDoubleClick={full}/>
    {(!playing&&!ended&&s.cur>0)&&<div className="vp-cover" onClick={toggle}><span>Paused — click to resume</span></div>}
    {ended&&<div className="vp-cover" onClick={()=>{p().seekTo(0,true);p().playVideo()}}><span>Finished — click to replay</span></div>}
    {!s.ready&&!err&&<div className="vp-cover"><span>Loading video…</span></div>}
    {err&&<div className="vp-cover"><span>This video can’t be played. Ask the seller to check its YouTube visibility (it must be “Unlisted”, not “Private”).</span></div>}
    {playing&&<div className={'vp-mark '+corner}>{mark}</div>}
    <div className="vp-bar">
      <button onClick={toggle} aria-label={playing?'Pause':'Play'}>{playing?'❚❚':'▶'}</button>
      <span className="vp-t">{fmt(s.cur)}</span>
      <input type="range" min="0" max={Math.max(1,s.dur)} step="1" value={Math.min(s.cur,s.dur||0)} onChange={seek} aria-label="Seek"/>
      <span className="vp-t">{fmt(s.dur)}</span>
      <button onClick={mute} aria-label="Mute">{s.muted?'🔇':'🔊'}</button>
      <button onClick={full} aria-label="Fullscreen">⛶</button>
    </div></div>;}
