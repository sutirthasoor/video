import {useEffect,useState} from 'react';
import {Routes,Route,Link,Navigate,Outlet,useNavigate,useParams,useLocation,useSearchParams} from 'react-router-dom';
import {collection,doc,getDoc,setDoc,getDocs,writeBatch,arrayUnion,increment,serverTimestamp,query,where} from 'firebase/firestore';
import {createUserWithEmailAndPassword,signInWithEmailAndPassword,updateProfile,sendPasswordResetEmail} from 'firebase/auth';
import {auth,db} from './firebase';
import {useApp,money,effPrice} from './store';
import {Header,Footer,IC} from './Shell';
import {useAlbums,AlbumCard,ytId,AuthShell,Brand,Price} from './shared';
import {METHODS,payOnline} from './payments';
import Player from './Player';

const Ic=({d,s=20})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>;

function Home(){const {user}=useApp();const albums=useAlbums();const latest=[...(albums||[])].sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)).slice(0,6);
  return <><section className="wrap promo"><Link to="/albums" className="tile big t1"><small>Video courses</small><h2>Learn from premium video courses, streamed right in your browser</h2><p>Pick a course, pay once, and watch every class from My courses.</p><span className="btn sm">Browse courses</span></Link>
    {user?<Link to="/account" className="tile t2"><small>Your library</small><h3>My courses</h3><span className="tl">Open library →</span></Link>:<Link to="/login" state={{reg:true}} className="tile t2"><small>New here?</small><h3>Create a free account</h3><span className="tl">Get started →</span></Link>}
    {user?<Link to="/wallet" className="tile t3"><small>Faster checkout</small><h3>Top up your wallet</h3><span className="tl">Open wallet →</span></Link>:<Link to="/login" className="tile t3"><small>Already a member?</small><h3>Sign in</h3><span className="tl">Welcome back →</span></Link>}</section>
    <section className="wrap sec2"><div className="sh"><h2>New courses</h2><Link to="/albums">View all →</Link></div>
      {!albums?<p className="muted">Loading…</p>:!latest.length?<p className="muted">No courses yet. Add one from the admin panel.</p>:<div className="pgrid">{latest.map(a=><AlbumCard key={a.id} a={a}/>)}</div>}</section>
    <section className="wrap sec2"><div className="sh"><h2>How it works</h2></div><div className="steps"><div><b>Choose a course</b><span className="muted sm">Browse courses and see every class title before you buy.</span></div><div><b>Pay securely</b><span className="muted sm">Sign in, pay once, and the whole course unlocks instantly.</span></div><div><b>Watch anywhere</b><span className="muted sm">Stream in your browser on any device. No downloads, no links.</span></div></div></section>
    <section className="wrap sec2 perks"><div><Ic d={IC.play}/><b>Stream anywhere</b><p className="muted sm">Watch in your browser on phone, tablet or laptop.</p></div><div><Ic d={IC.shield}/><b>Protected videos</b><p className="muted sm">No download button and no public link.</p></div><div><Ic d={IC.zap}/><b>Instant access</b><p className="muted sm">Your course unlocks the moment you pay.</p></div></section></>;}

const sorters={name:(a,b)=>a.title.localeCompare(b.title),low:(a,b)=>a.price-b.price,high:(a,b)=>b.price-a.price,new:(a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)};
function Albums(){const albums=useAlbums();const [sp,setSp]=useSearchParams();const [n,setN]=useState(12);const q=sp.get('q')||'',so=sp.get('s')||'new';
  const list=(albums||[]).filter(a=>(a.title+(a.description||'')).toLowerCase().includes(q.toLowerCase())).sort(sorters[so]);
  const set=(k,v)=>{const x=new URLSearchParams(sp);v?x.set(k,v):x.delete(k);setSp(x)};
  return <div className="wrap sec"><div className="crumb muted sm"><Link to="/">Home</Link> / Courses</div><h2>All courses</h2>
    <div className="row bar"><input placeholder="Search courses" value={q} onChange={e=>set('q',e.target.value)}/><select value={so} onChange={e=>set('s',e.target.value)}><option value="new">Newest</option><option value="name">Name A–Z</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option></select><span className="muted sm">{list.length} results</span></div>
    {!albums?<p className="muted">Loading…</p>:!list.length?<p className="muted">No courses match.</p>:<><div className="pgrid">{list.slice(0,n).map(a=><AlbumCard key={a.id} a={a}/>)}</div>{list.length>n&&<div className="center"><button className="btn ghost" onClick={()=>setN(n+12)}>Load more</button></div>}</>}</div>;}

function DetailsModal({a,onClose}){const txt=(a.details||a.description||'No further details have been added for this course.').trim();
  const blocks=txt.split(/\n\s*\n/).map(b=>b.trim()).filter(Boolean);
  useEffect(()=>{const k=e=>e.key==='Escape'&&onClose();addEventListener('keydown',k);return()=>removeEventListener('keydown',k)},[onClose]);
  return <div className="modal" onClick={onClose}><div className="mbox" role="dialog" aria-modal="true" onClick={e=>e.stopPropagation()}><div className="mhead"><div><small className="muted">Course details</small><h3>{a.title}</h3></div><button className="btn sm ghost" onClick={onClose} aria-label="Close">✕</button></div>
    <div className="mbody">{blocks.map((b,i)=>{const L=b.split('\n');return L.every(l=>/^\s*[-•*]\s+/.test(l))?<ul key={i}>{L.map((l,j)=><li key={j}>{l.replace(/^\s*[-•*]\s+/,'')}</li>)}</ul>:<p key={i}>{b}</p>})}</div>
    <div className="mfoot"><span className="muted sm">{a.videoCount||0} {a.videoCount===1?'class':'classes'}</span><Price a={a}/></div></div></div>;}

function Detail(){const {id}=useParams();const [a,setA]=useState();const {user,owns,addToCart,cart}=useApp();const nav=useNavigate();const [show,setShow]=useState(false);
  useEffect(()=>{getDoc(doc(db,'albums',id)).then(s=>setA(s.exists()?{id:s.id,...s.data()}:null))},[id]);
  if(a===undefined)return <div className="wrap sec muted">Loading…</div>;if(!a)return <div className="wrap sec">Course not found.</div>;
  const own=owns(a.id),inCart=cart.some(c=>c.id===a.id);const buyNow=()=>{addToCart(a);nav(user?'/checkout':'/login',{state:{from:'/checkout'}})};
  return <div className="wrap sec detail"><div><Link to="/albums" className="muted sm">← All courses</Link>{a.thumb&&<img className="dthumb" src={a.thumb} alt=""/>}<h1>{a.title}</h1>{a.description&&<p className="summary">{a.description}</p>}<button className="btn sm ghost" onClick={()=>setShow(true)}>Check details</button>
    <h3 className="cl">{a.videoCount||0} {a.videoCount===1?'class':'classes'} in this course</h3><ol className="vlist">{(a.videos||[]).map(v=><li key={v.id}>{v.title}</li>)}</ol>{show&&<DetailsModal a={a} onClose={()=>setShow(false)}/>}</div>
    <aside className="card buy"><Price a={a}/>
      {own?<Link className="btn lg" to={`/watch/${a.id}`}>Watch now</Link>:<><button className="btn lg" onClick={buyNow}>Buy now</button><button className="btn lg ghost" disabled={inCart} onClick={()=>addToCart(a)}>{inCart?'In cart':'Add to cart'}</button>{!user&&<p className="muted sm">You’ll sign in before paying.</p>}</>}
      <p className="muted sm">Streaming only — classes can’t be downloaded.</p></aside></div>;}

// The only place videos are played. Needs login + purchase: Firestore rules block the secrets doc otherwise.
function Watch(){const {id}=useParams();const {user,profile,owns}=useApp();const [a,setA]=useState();const [urls,setUrls]=useState(null);const [i,setI]=useState(0);const [denied,setDenied]=useState(false);
  useEffect(()=>{if(!user)return;getDoc(doc(db,'albums',id)).then(s=>setA(s.exists()?{id:s.id,...s.data()}:null));
    getDoc(doc(db,'secrets',id)).then(s=>s.exists()?setUrls(s.data().urls||{}):setDenied(true)).catch(()=>setDenied(true))},[id,user]);
  if(!user)return <Navigate to="/login" state={{from:`/watch/${id}`}}/>;
  if(a===undefined||(!urls&&!denied))return <div className="wrap sec muted">Loading…</div>;
  if(!a)return <div className="wrap sec">Course not found.</div>;
  if(denied||!urls)return <div className="wrap sec narrow"><div className="card"><h2>{a.title}</h2><p className="muted">You haven’t bought this course yet.</p><Link className="btn lg" to={`/albums/${id}`}>View course</Link></div></div>;
  const vids=(a.videos||[]).filter(v=>ytId(urls[v.id])),cur=vids[i];
  return <div className="wrap sec"><Link to="/account" className="muted sm">← My courses</Link><h2>{a.title}</h2>
    {!cur?<p className="muted">No classes in this course yet.</p>:<div className="watch"><div><Player key={cur.id} vid={ytId(urls[cur.id])} mark={profile?.email||user.email} onEnd={()=>i<vids.length-1&&setI(i+1)}/><h3>{i+1}. {cur.title}</h3></div>
      <div className="card plist">{vids.map((v,k)=><button key={v.id} className={'pli'+(k===i?' on':'')} onClick={()=>setI(k)}><i>{k+1}</i><span>{v.title}</span></button>)}</div></div>}</div>;}

function Cart(){const {cart,removeFromCart,user}=useApp();const total=cart.reduce((x,c)=>x+Number(c.price),0);
  return <div className="wrap sec"><h2>Cart</h2>{!cart.length?<p className="muted">Your cart is empty. <Link to="/albums">Browse courses</Link></p>:
    <div className="cartbox card">{cart.map(c=><div className="row line" key={c.id}><div><b>{c.title}</b><div className="muted sm">{c.count} classes</div></div><div className="row"><b>{money(c.price)}</b><button className="btn sm ghost" onClick={()=>removeFromCart(c.id)}>Remove</button></div></div>)}
      <div className="row line total"><b>Total</b><b>{money(total)}</b></div>
      <Link className="btn lg" to={user?'/checkout':'/login'} state={{from:'/checkout'}}>{user?'Checkout':'Sign in to checkout'}</Link></div>}</div>;}

function Checkout(){const {user,profile,cart,setCart}=useApp();const nav=useNavigate();const [m,setM]=useState('gateway'),[busy,setBusy]=useState(false),[perr,setPerr]=useState('');const [code,setCode]=useState(''),[cp,setCp]=useState(null),[cerr,setCerr]=useState('');
  const sub=cart.reduce((x,c)=>x+Number(c.price),0),wallet=Number(profile?.wallet||0);
  const disc=cp?Math.min(sub,cp.type==='percent'?Math.round(sub*cp.value/100):cp.value):0,total=Math.max(0,sub-disc);
  if(!user)return <Navigate to="/login" state={{from:'/checkout'}}/>;if(!cart.length)return <Navigate to="/cart"/>;
  const apply=async()=>{setCerr('');setCp(null);const c=code.trim().toUpperCase();if(!c)return;
    try{const s=await getDoc(doc(db,'coupons',c));if(!s.exists())return setCerr('Invalid coupon code.');const d=s.data();
      if(!d.active)return setCerr('This coupon is not active.');if(d.expiry&&d.expiry<new Date().toISOString().slice(0,10))return setCerr('This coupon has expired.');
      if(d.maxUses&&(d.used||0)>=d.maxUses)return setCerr('This coupon has reached its usage limit.');if(d.minOrder&&sub<d.minOrder)return setCerr(`Minimum order for this coupon is ${money(d.minOrder)}.`);
      setCp({code:c,type:d.type,value:Number(d.value)})}catch{setCerr('Could not check the coupon. Try again.')}};
  const pay=async()=>{setBusy(true);setPerr('');const date=new Date().toISOString(),day=date.slice(0,10),no='VV'+Date.now().toString().slice(-9);
    if(m!=='wallet'&&total>0){try{await payOnline({orderNo:no,amount:total})}catch(x){setPerr(x.message);setBusy(false);return}} // payments.js: simulated now, Paytm later
    try{const b=writeBatch(db);
    b.set(doc(db,'orders',no),{orderNo:no,uid:user.uid,email:user.email,name:profile?.name||'',items:cart.map(c=>({albumId:c.id,albumTitle:c.title,price:Number(c.price)})),subtotal:sub,discount:disc,coupon:cp?cp.code:'',total,method:total===0?'coupon':m,status:'Paid',date,createdAt:serverTimestamp()});
    b.set(doc(db,'users',user.uid),{purchases:arrayUnion(...cart.map(c=>({albumId:c.id,albumTitle:c.title,price:Number(c.price),date:day,orderNo:no}))),purchasedIds:arrayUnion(...cart.map(c=>c.id)),...(m==='wallet'&&total>0?{wallet:increment(-total)}:{})},{merge:true});
    if(cp)b.update(doc(db,'coupons',cp.code),{used:increment(1)});
    await b.commit();setCart([]);nav('/orders',{state:{paid:no}});}catch(x){setPerr((x.message||'Could not place order').replace('Firebase: ',''));setBusy(false)}};
  return <div className="wrap sec narrow"><h2>Checkout</h2><div className="card">{cart.map(c=><div className="row line" key={c.id}><span>{c.title}</span><b>{money(c.price)}</b></div>)}
    <div className="coupon"><input placeholder="Coupon code" value={code} onChange={e=>setCode(e.target.value)}/><button type="button" className="btn sm ghost" onClick={apply}>Apply</button></div>{cerr&&<p className="err">{cerr}</p>}{cp&&<p className="ok">Coupon {cp.code} applied.</p>}
    {disc>0&&<div className="row line"><span>Subtotal</span><span>{money(sub)}</span></div>}{disc>0&&<div className="row line"><span>Coupon discount</span><b className="free">−{money(disc)}</b></div>}
    <div className="row line total"><b>Total</b><b>{money(total)}</b></div>
    {total>0&&METHODS.map(x=><label key={x.id} className={'opt'+(x.enabled?'':' off')}><input type="radio" disabled={!x.enabled} checked={m===x.id} onChange={()=>setM(x.id)}/> {x.label}{x.soon&&<span className="soon">Coming soon</span>}</label>)}
    {total>0&&<label className="opt"><input type="radio" disabled={wallet<total} checked={m==='wallet'} onChange={()=>setM('wallet')}/> Wallet balance {money(wallet)}{wallet<total&&<span className="muted"> (not enough) · <Link to="/wallet">Top up</Link></span>}</label>}
    {perr&&<p className="err">{perr}</p>}<button className="btn lg" disabled={busy} onClick={pay}>{busy?'Processing…':total===0?'Place order (free)':`Pay ${money(total)}`}</button><p className="muted sm">Demo checkout — no real money is charged. Paytm payments are coming soon.</p></div></div>;}

function Login(){const loc=useLocation();const [reg,setReg]=useState(!!loc.state?.reg);const [f,setF]=useState({name:'',email:'',password:''});const [err,setErr]=useState('');const nav=useNavigate();const {user}=useApp();
  const submit=async e=>{e.preventDefault();setErr('');try{
    if(reg){const c=await createUserWithEmailAndPassword(auth,f.email,f.password);await updateProfile(c.user,{displayName:f.name});
      await setDoc(doc(db,'users',c.user.uid),{name:f.name,email:f.email,wallet:0,purchases:[],purchasedIds:[],createdAt:serverTimestamp()});}
    else await signInWithEmailAndPassword(auth,f.email,f.password);nav(loc.state?.from||'/albums');}catch(x){setErr(x.message.replace('Firebase: ',''))}};
  const reset=async()=>{if(!f.email)return setErr('Enter your email first.');try{await sendPasswordResetEmail(auth,f.email);setErr('Password reset email sent. Check your inbox.')}catch(x){setErr(x.message.replace('Firebase: ',''))}};
  const set=k=>e=>setF({...f,[k]:e.target.value});
  if(user)return <Navigate to={loc.state?.from||'/albums'} replace/>;
  return <AuthShell title="Learn at your own pace, from anywhere." text="Premium video courses, streamed securely in your browser the moment you buy." points={['Instant access after payment','Watch on phone, tablet or laptop','One purchase, yours to rewatch']}>
    <Link to="/" className="back">← Back to store</Link><h2>{reg?'Create your account':'Welcome back'}</h2><p className="muted">{reg?'Sign up to buy and watch courses.':'Sign in to watch your courses.'}</p>
    <form className="as-box" style={{padding:0}} onSubmit={submit}>
      {reg&&<><label>Full name</label><input required placeholder="Your name" value={f.name} onChange={set('name')}/></>}
      <label>Email</label><input required type="email" placeholder="you@example.com" value={f.email} onChange={set('email')}/>
      <label>Password</label><input required type="password" minLength={6} placeholder="At least 6 characters" value={f.password} onChange={set('password')}/>
      {err&&<p className="err">{err}</p>}<button className="btn lg">{reg?'Create account':'Sign in'}</button>
      {!reg&&<button type="button" className="link" onClick={reset}>Forgot password?</button>}<button type="button" className="link" onClick={()=>setReg(!reg)}>{reg?'Have an account? Sign in':'New here? Create an account'}</button></form></AuthShell>;}

function Account(){const {user,profile}=useApp();
  if(!user)return <Navigate to="/login" state={{from:'/account'}}/>;
  const ps=profile?.purchases||[];
  return <div className="wrap sec"><h2>My courses</h2>{!ps.length?<p className="muted">No courses yet. <Link to="/albums">Browse courses</Link></p>:
    ps.map((p,i)=><div className="card" key={i}><div className="row line"><div><b>{p.albumTitle}</b><div className="muted sm">Bought {p.date} · {money(p.price)}</div></div><Link className="btn sm" to={`/watch/${p.albumId}`}>▶ Watch</Link></div></div>)}</div>;}

function Orders(){const {user}=useApp();const loc=useLocation();const [o,setO]=useState(null);
  useEffect(()=>{if(user)getDocs(query(collection(db,'orders'),where('uid','==',user.uid))).then(s=>setO(s.docs.map(d=>d.data()).sort((a,b)=>b.date.localeCompare(a.date)))).catch(()=>setO([]))},[user]);
  if(!user)return <Navigate to="/login" state={{from:'/orders'}}/>;
  return <div className="wrap sec"><h2>My orders</h2>{loc.state?.paid&&<p className="ok">Order {loc.state.paid} placed. Open <Link to="/account">My courses</Link> to start watching.</p>}
    {!o?<p className="muted">Loading…</p>:!o.length?<p className="muted">No orders yet.</p>:<div className="scroll"><table><thead><tr><th>Order</th><th>Date</th><th>Courses</th><th>Total</th><th>Status</th><th></th></tr></thead><tbody>{o.map(x=><tr key={x.orderNo}><td>{x.orderNo}</td><td>{x.date.slice(0,10)}</td><td>{x.items.map(i=>i.albumTitle).join(', ')}</td><td>{money(x.total)}</td><td><span className="tag">{x.status}</span></td><td><Link to={`/invoice/${x.orderNo}`}>Invoice</Link></td></tr>)}</tbody></table></div>}</div>;}

function Invoice(){const {no}=useParams();const {user}=useApp();const [o,setO]=useState();
  useEffect(()=>{getDoc(doc(db,'orders',no)).then(s=>setO(s.exists()?s.data():null)).catch(()=>setO(null))},[no]);
  if(!user)return <Navigate to="/login"/>;if(o===undefined)return <div className="wrap sec muted">Loading…</div>;if(!o)return <div className="wrap sec">Invoice not found.</div>;
  return <div className="wrap sec narrow"><div className="card invoice"><div className="row line"><div className="logo"><Brand/></div><b>Invoice {o.orderNo}</b></div>
    <p className="muted sm">Date {o.date.slice(0,10)} · Billed to {o.name||o.email} ({o.email}) · Payment: {o.method} · Status: {o.status}</p>
    <table><thead><tr><th>Course</th><th>Price</th></tr></thead><tbody>{o.items.map((i,k)=><tr key={k}><td>{i.albumTitle}</td><td>{money(i.price)}</td></tr>)}</tbody></table>
    <div className="row line total"><b>Total</b><b>{money(o.total)}</b></div><button className="btn noprint" onClick={()=>window.print()}>Print / save as PDF</button></div></div>;}

const PAGES={about:['About VideoVault','VideoVault sells premium video albums. Buy an album once and stream every video in it from your browser, any time.'],
 contact:['Contact us','Email support@videovault.example with your order number and a short description of the problem. We reply within one business day.'],
 faq:['Frequently asked questions','How do I watch? Buy an album, then open My downloads and press Watch. Can I download videos? No, videos are stream-only. Where is my invoice? Open My orders and choose Invoice.'],
 terms:['Terms of use','Videos are licensed for personal viewing only. Recording, copying, re-uploading or sharing your account is not allowed and may lead to your account being blocked.'],
 privacy:['Privacy policy','We store your name, email, orders and wallet balance to run your account. Passwords are handled by Firebase Authentication. Your email is shown faintly over videos you watch. We do not sell your data.'],
 refund:['Refund policy','Because videos unlock instantly, purchases are generally non-refundable. If an album is broken or not as described, contact support within 7 days.']};
function Info(){const {slug}=useParams();const {site}=useApp();const p=PAGES[slug];const t=s=>s.replace(/VideoVault/g,site.name).replace(/albums?/g,m=>m==='album'?'course':'courses').replace(/My downloads/g,'My courses');return <div className="wrap sec narrow"><h1 className="h1s">{p?t(p[0]):'Page not found'}</h1><p className="lead">{p?t(p[1]):'This page does not exist.'}</p></div>;}

function Wallet(){const {user,profile}=useApp();const [amt,setAmt]=useState(500);const [busy,setBusy]=useState(false);const [ok,setOk]=useState('');
  if(!user)return <Navigate to="/login" state={{from:'/wallet'}}/>;
  const add=async()=>{const a=Number(amt);if(!(a>0))return;setBusy(true);setOk('');await new Promise(r=>setTimeout(r,1200)); // SIMULATED gateway
    await setDoc(doc(db,'users',user.uid),{wallet:increment(a),walletHistory:arrayUnion({amount:a,date:new Date().toISOString(),note:'Demo top-up'})},{merge:true});setBusy(false);setOk(`${money(a)} added to your wallet.`)};
  const hist=[...(profile?.walletHistory||[])].reverse();
  return <div className="wrap sec narrow"><h2>My wallet</h2><div className="card"><span className="muted">Available balance</span><b className="big price">{money(profile?.wallet)}</b></div>
    <div className="card"><b>Add money (demo)</b><div className="row">{[100,500,1000,2000].map(a=><button key={a} className={'btn sm '+(Number(amt)===a?'':'ghost')} onClick={()=>setAmt(a)}>{money(a)}</button>)}</div>
      <input type="number" min="1" value={amt} onChange={e=>setAmt(e.target.value)} placeholder="Amount"/><button className="btn lg" disabled={busy} onClick={add}>{busy?'Processing…':`Add ${money(amt)}`}</button>{ok&&<p className="ok">{ok}</p>}
      <p className="muted sm">Demo mode: no real money is charged.</p></div>
    <div className="card"><b>History</b>{!hist.length?<p className="muted">No top-ups yet.</p>:hist.map((h,i)=><div className="row line" key={i}><span>{h.note}<span className="muted sm"> · {h.date.slice(0,10)}</span></span><b className="free">+{money(h.amount)}</b></div>)}</div></div>;}

export default function App(){const {ready}=useApp();if(!ready)return null;
  return <Routes><Route path="/login" element={<Login/>}/><Route element={<><Header/><Outlet/><Footer/></>}>
    <Route path="/" element={<Home/>}/><Route path="/albums" element={<Albums/>}/><Route path="/albums/:id" element={<Detail/>}/><Route path="/watch/:id" element={<Watch/>}/>
    <Route path="/cart" element={<Cart/>}/><Route path="/checkout" element={<Checkout/>}/><Route path="/account" element={<Account/>}/><Route path="/wallet" element={<Wallet/>}/><Route path="/orders" element={<Orders/>}/><Route path="/invoice/:no" element={<Invoice/>}/><Route path="/page/:slug" element={<Info/>}/>
    <Route path="*" element={<div className="wrap sec">Page not found.</div>}/></Route></Routes>;}
