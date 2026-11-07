import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {collection,onSnapshot,orderBy,query} from 'firebase/firestore';
import {db} from './firebase';
import {useApp,money,effPrice} from './store';
// Public album docs: {title,description,price,videos:[{id,title}],videoCount,createdAt}. No URLs here.
export function useAlbums(){const [a,setA]=useState(null);
  useEffect(()=>onSnapshot(query(collection(db,'albums'),orderBy('title')),s=>setA(s.docs.map(d=>({id:d.id,...d.data()})))),[]);return a;}
export const ytId=u=>{const m=String(u||'').match(/(?:youtu\.be\/|[?&]v=|embed\/|shorts\/|live\/)([A-Za-z0-9_-]{11})/);return m?m[1]:null};
export function Brand(){const {site}=useApp();return <>{site.logo?<img className="mark img" src={site.logo} alt=""/>:<span className="mark">{(site.name||'V')[0].toUpperCase()}</span>}<span>{site.name}</span></>}
export function fileToDataUrl(file,maxW,type='image/jpeg',q=.8){return new Promise((res,rej)=>{if(!file.type.startsWith('image/'))return rej(new Error('Please choose an image file.'));const r=new FileReader();r.onerror=()=>rej(new Error('Could not read file.'));r.onload=()=>{const im=new Image();im.onerror=()=>rej(new Error('Invalid image.'));im.onload=()=>{const k=Math.min(1,maxW/im.width),c=document.createElement('canvas');c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);const x=c.getContext('2d');if(type==='image/jpeg'){x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height)}x.drawImage(im,0,0,c.width,c.height);res(c.toDataURL(type,q))};im.src=r.result};r.readAsDataURL(file)})}
export function Price({a}){const d=Number(a.discount)||0;return d>0?<span className="pr"><b className="price">{money(effPrice(a))}</b><s className="muted sm">{money(a.price)}</s><i className="off">{d}% off</i></span>:<b className="price">{money(a.price)}</b>}
const hue=t=>Math.abs([...String(t)].reduce((h,c)=>(h*31+c.charCodeAt(0))|0,7))%360;
export function AlbumCard({a}){const {addToCart,owns,cart}=useApp();const inCart=cart.some(c=>c.id===a.id),own=owns(a.id);
  return <div className="pc"><Link to={`/albums/${a.id}`} className="pimg" style={{'--h':hue(a.title)}}>{a.thumb&&<img className="pthumb" src={a.thumb} alt="" loading="lazy"/>}<span>▶</span><i className={'pbadge '+(own?'f':'p')}>{own?'Owned':'Paid'}</i></Link>
    <div className="pbody"><Link to={`/albums/${a.id}`} className="ptitle">{a.title}</Link>
      <p className="pmeta">{a.videoCount||0} {a.videoCount===1?'class':'classes'}</p><p className="pinst">Stream instantly after purchase</p>
      <div className="pfoot"><Price a={a}/>
        {own?<Link className="btn sm" to={`/watch/${a.id}`}>Watch</Link>:<button className="btn sm" disabled={inCart} onClick={()=>addToCart(a)}>{inCart?'In cart':'Add to cart'}</button>}</div></div></div>;}

// Two-sided auth screen: photo/brand panel on the left, form on the right. Drop a picture at public/login-photo.jpg to use it as the left background.
function SiteName(){const {site}=useApp();return site.name}
export function AuthShell({admin,title,text,points,children}){
  return <div className={'as'+(admin?' admin':'')}>
    <aside className="as-photo"><a href={admin?'/admin':'/'} className="logo"><Brand/>{admin&&<span style={{opacity:.7,fontWeight:600}}> Admin</span>}</a>
      <div className="as-copy"><h2>{title}</h2><p>{text}</p>{points&&<ul>{points.map(x=><li key={x}>{x}</li>)}</ul>}</div>
      <small>© {new Date().getFullYear()} <SiteName/></small></aside>
    <main className="as-form"><div className="as-box">{children}</div></main></div>;}
