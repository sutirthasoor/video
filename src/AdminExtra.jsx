import {useEffect,useState} from 'react';
import {useNavigate,useSearchParams} from 'react-router-dom';
import {collection,doc,onSnapshot,getDoc,setDoc,updateDoc,deleteDoc,writeBatch,serverTimestamp} from 'firebase/firestore';
import {db} from './firebase';
import {money} from './store';
import {ytId,fileToDataUrl} from './shared';
const useCol=n=>{const [r,setR]=useState([]);useEffect(()=>onSnapshot(collection(db,n),s=>setR(s.docs.map(d=>({id:d.id,...d.data()})))),[n]);return r;};
const em=e=>(e.message||String(e)).replace('Firebase: ','');

// ---- ALBUMS: create/edit the album shell only (name, price, summary, details, thumbnail). Classes are added in the Classes menu.
const blank={title:'',description:'',details:'',price:499,thumb:''};
export function Albums(){const albums=useCol('albums');const nav=useNavigate();const [f,setF]=useState(blank);const [id,setId]=useState(null);const [err,setErr]=useState('');const [msg,setMsg]=useState('');const [busy,setBusy]=useState(false);
  const set=k=>e=>setF({...f,[k]:e.target.value});
  const reset=()=>{setF(blank);setId(null);setErr('')};
  const pick=async e=>{const file=e.target.files[0];if(!file)return;try{setF({...f,thumb:await fileToDataUrl(file,640,'image/jpeg',.74)})}catch(x){setErr(em(x))}e.target.value=''};
  const edit=a=>{setErr('');setMsg('');setId(a.id);setF({title:a.title,description:a.description||'',details:a.details||'',price:a.price,thumb:a.thumb||''});window.scrollTo(0,0)};
  const save=async e=>{e.preventDefault();setErr('');setMsg('');if(!(Number(f.price)>=1))return setErr('Price must be at least ₹1.');setBusy(true);
    try{const ref=id?doc(db,'albums',id):doc(collection(db,'albums'));const b=writeBatch(db);
      const meta={title:f.title.trim(),description:f.description.trim(),details:f.details.trim(),price:Number(f.price),thumb:f.thumb||'',updatedAt:serverTimestamp()};
      if(id)b.set(ref,meta,{merge:true});else{b.set(ref,{...meta,videos:[],videoCount:0,discount:0,createdAt:serverTimestamp()});b.set(doc(db,'secrets',ref.id),{urls:{}})}
      await b.commit();setMsg(id?'Album updated.':'Album created. Add classes from the Classes menu.');reset();
    }catch(x){setErr(em(x))}setBusy(false)};
  const del=async a=>{if(!confirm(`Delete “${a.title}” and all its classes? Customers who bought it lose access.`))return;const b=writeBatch(db);b.delete(doc(db,'albums',a.id));b.delete(doc(db,'secrets',a.id));await b.commit();if(id===a.id)reset()};
  return <><h2>Albums</h2>
    <form className="card" onSubmit={save}><b>{id?'Edit album':'New album'}</b>
      <div className="formgrid"><input required placeholder="Album name" value={f.title} onChange={set('title')}/><input required type="number" min="1" placeholder="Price (₹)" value={f.price} onChange={set('price')}/>
        <textarea className="span" rows={2} maxLength={300} placeholder="Short summary (shown on cards and top of the album page)" value={f.description} onChange={set('description')}/>
        <textarea className="span" rows={6} placeholder="Full details (shown when the student clicks “Check details”). Use blank lines for paragraphs, start lines with - for bullet points." value={f.details} onChange={set('details')}/></div>
      <div className="thumbrow">{f.thumb?<img src={f.thumb} alt="Thumbnail preview"/>:<div className="thumbph">No thumbnail</div>}
        <div className="col"><label className="btn sm ghost">Upload thumbnail<input type="file" accept="image/*" hidden onChange={pick}/></label>{f.thumb&&<button type="button" className="btn sm ghost" onClick={()=>setF({...f,thumb:''})}>Remove</button>}<span className="muted sm">Auto-resized. 16:10 images look best.</span></div></div>
      {err&&<p className="err">{err}</p>}{msg&&<p className="ok">{msg}</p>}
      <div className="row"><button className="btn" disabled={busy}>{busy?'Saving…':id?'Save changes':'Create album'}</button>{id&&<button type="button" className="btn ghost" onClick={reset}>Cancel</button>}</div></form>
    <div className="scroll"><table><thead><tr><th></th><th>Album</th><th>Classes</th><th>Price</th><th></th></tr></thead><tbody>
      {albums.map(a=><tr key={a.id}><td>{a.thumb?<img className="tthumb" src={a.thumb} alt=""/>:'—'}</td><td>{a.title}</td><td>{a.videoCount||0}</td><td>{money(a.price)}</td><td className="row"><button className="btn sm ghost" onClick={()=>nav('/admin/classes?album='+a.id)}>Classes</button><button className="btn sm ghost" onClick={()=>edit(a)}>Edit</button><button className="btn sm ghost" onClick={()=>del(a)}>Delete</button></td></tr>)}
      {!albums.length&&<tr><td colSpan="5" className="muted">No albums yet.</td></tr>}</tbody></table></div></>;}

// ---- CLASSES: pick an album, add/edit/reorder its classes (title + unlisted YouTube URL).
const newVid=()=>({id:Math.random().toString(36).slice(2,10),title:''});
export function Classes(){const albums=useCol('albums');const [sp,setSp]=useSearchParams();const aid=sp.get('album')||'';const [vids,setVids]=useState([]);const [urls,setUrls]=useState({});const [loaded,setLoaded]=useState(false);const [err,setErr]=useState('');const [msg,setMsg]=useState('');const [busy,setBusy]=useState(false);
  useEffect(()=>{setLoaded(false);setErr('');setMsg('');if(!aid)return;let on=true;
    Promise.all([getDoc(doc(db,'albums',aid)),getDoc(doc(db,'secrets',aid))]).then(([a,s])=>{if(!on)return;setVids(a.data()?.videos||[]);setUrls(s.data()?.urls||{});setLoaded(true)}).catch(x=>setErr(em(x)));return()=>{on=false}},[aid]);
  const setVid=(i,v)=>setVids(vids.map((x,j)=>j===i?{...x,title:v}:x));
  const move=(i,d)=>{const v=[...vids],j=i+d;if(j<0||j>=v.length)return;[v[i],v[j]]=[v[j],v[i]];setVids(v)};
  const drop=i=>{const v=vids[i];setVids(vids.filter((_,j)=>j!==i));setUrls(({[v.id]:_,...r})=>r)};
  const save=async()=>{setErr('');setMsg('');for(const [i,v] of vids.entries()){if(!v.title.trim())return setErr(`Class ${i+1} needs a title.`);if(!ytId(urls[v.id]))return setErr(`Class ${i+1} needs a valid YouTube URL.`)}
    setBusy(true);try{const clean={};vids.forEach(v=>{clean[v.id]=urls[v.id].trim()});const b=writeBatch(db);
      b.update(doc(db,'albums',aid),{videos:vids.map(v=>({id:v.id,title:v.title.trim()})),videoCount:vids.length,updatedAt:serverTimestamp()});b.set(doc(db,'secrets',aid),{urls:clean});await b.commit();setMsg('Classes saved.');
    }catch(x){setErr(em(x))}setBusy(false)};
  return <><h2>Classes</h2>
    <div className="card"><b>Choose album</b><select value={aid} onChange={e=>setSp(e.target.value?{album:e.target.value}:{})}><option value="">Select an album…</option>{albums.map(a=><option key={a.id} value={a.id}>{a.title}</option>)}</select></div>
    {aid&&loaded&&<div className="card"><div className="hint"><b>Use “Unlisted” YouTube videos.</b> A “Private” video can’t be embedded. Only students who bought the album receive the link.</div>
      <b>Classes ({vids.length})</b>
      {vids.map((v,i)=><div className="vrow" key={v.id}><input placeholder={`Class ${i+1} title`} value={v.title} onChange={e=>setVid(i,e.target.value)}/><input placeholder="YouTube URL (unlisted)" value={urls[v.id]||''} onChange={e=>setUrls({...urls,[v.id]:e.target.value})}/>
        <div className="row"><button type="button" className="btn sm ghost" onClick={()=>move(i,-1)} aria-label="Move up">↑</button><button type="button" className="btn sm ghost" onClick={()=>move(i,1)} aria-label="Move down">↓</button><button type="button" className="btn sm ghost" onClick={()=>drop(i)}>Remove</button></div></div>)}
      <div className="row"><button type="button" className="btn ghost" onClick={()=>setVids([...vids,newVid()])}>+ Add class</button></div>
      {err&&<p className="err">{err}</p>}{msg&&<p className="ok">{msg}</p>}<div className="row"><button className="btn" disabled={busy} onClick={save}>{busy?'Saving…':'Save classes'}</button></div></div>}
    {aid&&!loaded&&!err&&<p className="muted">Loading…</p>}{!aid&&<p className="muted">Pick an album above to add or edit its classes.</p>}{!loaded&&err&&<p className="err">{err}</p>}</>;}

// ---- DISCOUNTS & COUPONS
const cb={code:'',type:'percent',value:10,minOrder:0,maxUses:0,expiry:''};
export function Offers(){const albums=useCol('albums');const coupons=useCol('coupons');const [f,setF]=useState(cb);const [err,setErr]=useState('');const [msg,setMsg]=useState('');
  const set=k=>e=>setF({...f,[k]:e.target.value});
  const add=async e=>{e.preventDefault();setErr('');setMsg('');const code=f.code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g,'');if(!code)return setErr('Enter a code (letters and numbers).');if(!(Number(f.value)>0))return setErr('Value must be above 0.');if(f.type==='percent'&&Number(f.value)>100)return setErr('Percent cannot exceed 100.');
    try{await setDoc(doc(db,'coupons',code),{code,type:f.type,value:Number(f.value),minOrder:Number(f.minOrder)||0,maxUses:Number(f.maxUses)||0,expiry:f.expiry||'',active:true,used:0,createdAt:serverTimestamp()});setMsg(`Coupon ${code} created.`);setF(cb)}catch(x){setErr(em(x))}};
  const setDisc=async(a,v)=>{const d=Math.min(95,Math.max(0,Number(v)||0));try{await updateDoc(doc(db,'albums',a.id),{discount:d})}catch(x){setErr(em(x))}};
  return <><h2>Discounts & coupons</h2>
    <div className="card"><b>Album discounts</b><span className="muted sm">Percent off shown on the store (original price struck through). 0 = no discount.</span>
      <div className="scroll"><table><thead><tr><th>Album</th><th>Price</th><th>Discount %</th><th>Selling price</th></tr></thead><tbody>
      {albums.map(a=><tr key={a.id}><td>{a.title}</td><td>{money(a.price)}</td><td><input className="mini" type="number" min="0" max="95" defaultValue={a.discount||0} onBlur={e=>setDisc(a,e.target.value)}/></td><td>{money(Math.max(1,Math.round(a.price*(1-(a.discount||0)/100))))}</td></tr>)}
      {!albums.length&&<tr><td colSpan="4" className="muted">No albums yet.</td></tr>}</tbody></table></div></div>
    <form className="card" onSubmit={add}><b>New coupon</b>
      <div className="formgrid"><input required placeholder="CODE (e.g. WELCOME10)" value={f.code} onChange={set('code')}/><select value={f.type} onChange={set('type')}><option value="percent">Percent off (%)</option><option value="flat">Flat off (₹)</option></select>
        <input required type="number" min="1" placeholder="Value" value={f.value} onChange={set('value')}/><input type="number" min="0" placeholder="Min order ₹ (0 = none)" value={f.minOrder} onChange={set('minOrder')}/>
        <input type="number" min="0" placeholder="Max uses (0 = unlimited)" value={f.maxUses} onChange={set('maxUses')}/><input type="date" title="Expiry (optional)" value={f.expiry} onChange={set('expiry')}/></div>
      {err&&<p className="err">{err}</p>}{msg&&<p className="ok">{msg}</p>}<div className="row"><button className="btn">Create coupon</button></div></form>
    <div className="scroll"><table><thead><tr><th>Code</th><th>Discount</th><th>Min order</th><th>Used</th><th>Expiry</th><th>Status</th><th></th></tr></thead><tbody>
      {coupons.map(c=><tr key={c.id}><td><b>{c.code}</b></td><td>{c.type==='percent'?c.value+'%':money(c.value)}</td><td>{c.minOrder?money(c.minOrder):'—'}</td><td>{c.used||0}{c.maxUses?` / ${c.maxUses}`:''}</td><td>{c.expiry||'—'}</td><td>{c.active?'Active':'Off'}</td>
      <td className="row"><button className="btn sm ghost" onClick={()=>updateDoc(doc(db,'coupons',c.id),{active:!c.active})}>{c.active?'Disable':'Enable'}</button><button className="btn sm ghost" onClick={()=>confirm(`Delete ${c.code}?`)&&deleteDoc(doc(db,'coupons',c.id))}>Delete</button></td></tr>)}
      {!coupons.length&&<tr><td colSpan="7" className="muted">No coupons yet.</td></tr>}</tbody></table></div></>;}

// ---- SITE SETTINGS: name + logo
export function SiteSettings(){const [name,setName]=useState('');const [logo,setLogo]=useState('');const [ok,setOk]=useState(false);const [msg,setMsg]=useState('');const [err,setErr]=useState('');
  useEffect(()=>{getDoc(doc(db,'settings','site')).then(s=>{const d=s.data()||{};setName(d.name||'VideoVault');setLogo(d.logo||'');setOk(true)}).catch(()=>setOk(true))},[]);
  const pick=async e=>{const file=e.target.files[0];if(!file)return;try{setLogo(await fileToDataUrl(file,256,'image/png'))}catch(x){setErr(em(x))}e.target.value=''};
  const save=async e=>{e.preventDefault();setErr('');setMsg('');if(!name.trim())return setErr('Site name is required.');try{await setDoc(doc(db,'settings','site'),{name:name.trim(),logo,updatedAt:serverTimestamp()},{merge:true});setMsg('Saved. The store and admin now use the new name and logo.')}catch(x){setErr(em(x))}};
  if(!ok)return <p className="muted">Loading…</p>;
  return <><h2>Site settings</h2><form className="card" onSubmit={save}><b>Site name</b><input required value={name} onChange={e=>setName(e.target.value)} placeholder="Site name"/>
    <b>Logo</b><div className="thumbrow">{logo?<img className="logoprev" src={logo} alt="Logo preview"/>:<div className="thumbph">Default mark</div>}<div className="col"><label className="btn sm ghost">Upload logo<input type="file" accept="image/*" hidden onChange={pick}/></label>{logo&&<button type="button" className="btn sm ghost" onClick={()=>setLogo('')}>Use default</button>}<span className="muted sm">Square PNG with transparent background works best.</span></div></div>
    {err&&<p className="err">{err}</p>}{msg&&<p className="ok">{msg}</p>}<div className="row"><button className="btn">Save settings</button></div></form></>;}
