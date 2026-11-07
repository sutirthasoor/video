import {useEffect,useState} from 'react';
import {NavLink,Link,Navigate,Routes,Route,useNavigate,useLocation} from 'react-router-dom';
import {signInWithEmailAndPassword,createUserWithEmailAndPassword,sendPasswordResetEmail,signOut} from 'firebase/auth';
import {collection,doc,onSnapshot,getDoc,updateDoc,writeBatch,serverTimestamp} from 'firebase/firestore';
import {db,auth} from './firebase';
import {useApp,money} from './store';
import {AuthShell,Brand} from './shared';
import {Albums,Classes,Offers,SiteSettings} from './AdminExtra';

const useCol=n=>{const [r,setR]=useState([]);useEffect(()=>onSnapshot(collection(db,n),s=>setR(s.docs.map(d=>({id:d.id,...d.data()})))),[n]);return r;};
const today=()=>new Date().toISOString().slice(0,10);
const csv=(name,rows)=>{if(!rows.length)return;const k=Object.keys(rows[0]);const t=[k.join(','),...rows.map(r=>k.map(x=>`"${String(r[x]??'').replace(/"/g,'""')}"`).join(','))].join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([t],{type:'text/csv'}));a.download=name;a.click();};

function Overview(){const albums=useCol('albums'),users=useCol('users'),orders=useCol('orders').filter(o=>o.status==='Paid');
  const revenue=orders.reduce((a,o)=>a+Number(o.total),0);
  const days=[...Array(7)].map((_,i)=>{const d=new Date(Date.now()-(6-i)*864e5).toISOString().slice(0,10);return {d,v:orders.filter(o=>o.date.slice(0,10)===d).reduce((a,o)=>a+Number(o.total),0)}});const max=Math.max(1,...days.map(x=>x.v));
  const top=Object.entries(orders.flatMap(o=>o.items).reduce((m,i)=>{m[i.albumTitle]=(m[i.albumTitle]||0)+1;return m},{})).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const stat=(l,v)=><div className="card stat"><span className="muted">{l}</span><b>{v}</b></div>;
  return <><h2>Overview</h2><div className="grid4">{stat('Revenue',money(revenue))}{stat('Orders',orders.length)}{stat('Avg order value',money(orders.length?Math.round(revenue/orders.length):0))}{stat('Customers',users.length)}{stat('Albums',albums.length)}{stat('Videos',albums.reduce((a,x)=>a+(x.videoCount||0),0))}</div>
    <div className="two"><div className="card"><b>Revenue, last 7 days</b><div className="chart">{days.map(x=><div key={x.d} className="bar-c"><span className="sm">{x.v?money(x.v):''}</span><div className="barv" style={{height:Math.max(4,x.v/max*120)}}/><span className="sm muted">{x.d.slice(5)}</span></div>)}</div></div>
    <div className="card"><b>Top selling albums</b>{!top.length?<p className="muted">No sales yet.</p>:top.map(([n,c])=><div className="row line" key={n}><span>{n}</span><b>{c} sold</b></div>)}</div></div>
    <h3>Recent orders</h3><OrderTable rows={[...orders].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6)}/></>;}

function OrderTable({rows,edit}){return <div className="scroll"><table><thead><tr><th>Order</th><th>Date</th><th>Customer</th><th>Albums</th><th>Total</th><th>Status</th></tr></thead><tbody>
  {rows.map(o=><tr key={o.orderNo}><td><a href={`/invoice/${o.orderNo}`}>{o.orderNo}</a></td><td>{o.date.slice(0,10)}</td><td>{o.name||o.email}</td><td>{o.items.map(i=>i.albumTitle).join(', ')}</td><td>{money(o.total)}</td>
  <td>{edit?<select className="mini" value={o.status} onChange={e=>updateDoc(doc(db,'orders',o.orderNo),{status:e.target.value})}><option>Paid</option><option>Refunded</option><option>Cancelled</option></select>:o.status}</td></tr>)}</tbody></table></div>;}

function Orders(){const orders=useCol('orders');const [q,setQ]=useState('');const [st,setSt]=useState('all');
  const rows=orders.filter(o=>(st==='all'||o.status===st)&&(o.orderNo+o.email+(o.name||'')).toLowerCase().includes(q.toLowerCase())).sort((a,b)=>b.date.localeCompare(a.date));
  return <><h2>Orders</h2><div className="row bar"><input placeholder="Search order no, name or email" value={q} onChange={e=>setQ(e.target.value)}/><select value={st} onChange={e=>setSt(e.target.value)}><option value="all">All statuses</option><option>Paid</option><option>Refunded</option><option>Cancelled</option></select>
    <button className="btn ghost" onClick={()=>csv('orders.csv',rows.map(o=>({order:o.orderNo,date:o.date.slice(0,10),customer:o.name,email:o.email,albums:o.items.map(i=>i.albumTitle).join('; '),total:o.total,method:o.method,status:o.status})))}>Export CSV</button></div><OrderTable rows={rows} edit/></>;}

function Customers(){const users=useCol('users');const [q,setQ]=useState('');const [msg,setMsg]=useState('');
  const rows=users.filter(u=>((u.name||'')+(u.email||'')).toLowerCase().includes(q.toLowerCase()));
  const reset=async u=>{try{await sendPasswordResetEmail(auth,u.email);setMsg(`Password reset email sent to ${u.email}.`)}catch(x){setMsg(x.message.replace('Firebase: ',''))}};
  return <><h2>Customers</h2><p className="muted sm">Passwords are encrypted by Firebase Authentication and can’t be read back. Use “Send reset” to let a customer set a new one.</p>{msg&&<p className="ok">{msg}</p>}
    <div className="row bar"><input placeholder="Search customers" value={q} onChange={e=>setQ(e.target.value)}/><button className="btn ghost" onClick={()=>csv('customers.csv',rows.map(u=>({name:u.name,email:u.email,albums:(u.purchases||[]).map(x=>x.albumTitle).join('; '),purchase_dates:(u.purchases||[]).map(x=>x.date).join('; '),wallet:u.wallet||0})))}>Export CSV</button></div>
    <div className="scroll"><table><thead><tr><th>Name</th><th>Email</th><th>Password</th><th>Albums purchased</th><th>Purchase date</th><th>Wallet (₹)</th></tr></thead><tbody>
    {rows.map(u=>{const p=u.purchases||[];return <tr key={u.id}><td>{u.name}</td><td>{u.email}</td><td>••••••••<br/><button className="btn sm ghost" onClick={()=>reset(u)}>Send reset</button></td>
      <td>{p.length?p.map((x,i)=><div key={i}>{x.albumTitle}</div>):'—'}</td><td>{p.length?p.map((x,i)=><div key={i}>{x.date}</div>):'—'}</td>
      <td><input className="mini" type="number" defaultValue={u.wallet||0} onBlur={e=>updateDoc(doc(db,'users',u.id),{wallet:Number(e.target.value)})}/></td></tr>})}</tbody></table></div></>;}

const ADM={title:'Run your video store.',text:'Create albums, add private videos, and track every sale from one console.',points:['Courses with unlisted YouTube classes','Orders, invoices and customers','Changes go live instantly']};
export function AdminRegister(){const [f,setF]=useState({name:'',email:'',password:''});const [err,setErr]=useState('');const [open,setOpen]=useState(null);const nav=useNavigate();
  useEffect(()=>{getDoc(doc(db,'meta','adminLock')).then(s=>setOpen(!s.exists())).catch(()=>setOpen(false))},[]);
  const submit=async e=>{e.preventDefault();setErr('');try{
    const c=await createUserWithEmailAndPassword(auth,f.email,f.password);const b=writeBatch(db);
    b.set(doc(db,'admins',c.user.uid),{name:f.name,email:f.email,createdAt:serverTimestamp()});b.set(doc(db,'meta','adminLock'),{by:c.user.uid,at:serverTimestamp()});await b.commit();nav('/admin');
  }catch(x){setErr(x.message.replace('Firebase: ',''))}};
  const set=k=>e=>setF({...f,[k]:e.target.value});
  return <AuthShell admin {...ADM}><a href="/" className="back">← Back to store</a><h2>Create first admin</h2>
    {open===null?<p className="muted">Checking…</p>:!open?<><p className="muted">Admin setup is closed. Sign in with your admin account.</p><Link to="/admin/login" className="btn lg">Admin sign in</Link></>:
    <form className="as-box" style={{padding:0}} onSubmit={submit}><p className="muted sm">One-time setup. It locks after the first admin is created.</p>
      <label>Full name</label><input required placeholder="Your name" value={f.name} onChange={set('name')}/><label>Admin email</label><input required type="email" placeholder="admin@example.com" value={f.email} onChange={set('email')}/><label>Password</label><input required type="password" minLength={6} placeholder="Min 6 characters" value={f.password} onChange={set('password')}/>
      {err&&<p className="err">{err}</p>}<button className="btn lg">Create admin account</button><Link to="/admin/login" className="link">Already an admin? Sign in</Link></form>}</AuthShell>;}

export function AdminLogin(){const [f,setF]=useState({email:'',password:''});const [err,setErr]=useState('');const nav=useNavigate();
  const submit=async e=>{e.preventDefault();setErr('');try{
    const c=await signInWithEmailAndPassword(auth,f.email,f.password);
    if(!(await getDoc(doc(db,'admins',c.user.uid))).exists()){await signOut(auth);setErr('This account does not have admin access.');return}
    nav('/admin');}catch(x){setErr(x.message.replace('Firebase: ',''))}};
  return <AuthShell admin {...ADM}><a href="/" className="back">← Back to store</a><h2>Admin sign in</h2><p className="muted">Enter your admin credentials to continue.</p>
    <form className="as-box" style={{padding:0}} onSubmit={submit}><label>Email</label><input required type="email" placeholder="admin@example.com" value={f.email} onChange={e=>setF({...f,email:e.target.value})}/><label>Password</label><input required type="password" placeholder="Your password" value={f.password} onChange={e=>setF({...f,password:e.target.value})}/>
      {err&&<p className="err">{err}</p>}<button className="btn lg">Sign in</button><Link to="/admin/register" className="link">Create admin account</Link></form></AuthShell>;}

const Ic=({d,s=18})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="ad-ic">{d}</svg>;
const ICONS={
  overview:<><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></>,
  customers:<><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.8c1.7.7 2.8 2.3 3 5.2"/></>,
  albums:<><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 9 5 3-5 3z"/></>,
  orders:<><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/></>,
  bell:<><path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9"/><path d="M10 20a2 2 0 0 0 4 0"/></>,
  logout:<><path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4"/><path d="M16 8l4 4-4 4M20 12H9"/></>,
  menu:<><path d="M4 7h16M4 12h16M4 17h10"/></>,
  classes:<><circle cx="12" cy="12" r="9"/><path d="m10 8.5 5 3.5-5 3.5z"/></>,
  offers:<><path d="M20 12 12 20 4 12V4h8z"/><circle cx="8.5" cy="8.5" r="1.2"/></>,
  settings:<><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/></>,
  store:<><path d="M4 9l1.5-5h13L20 9"/><path d="M4 9a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0A2.7 2.7 0 0 0 20 9v11H4z"/></>
};
const NAV=[['Overview',[['/admin','Overview','overview',true]]],['Management',[['/admin/customers','Customers','customers'],['/admin/albums','Albums','albums'],['/admin/classes','Classes','classes']]],['Sales',[['/admin/orders','Orders','orders'],['/admin/offers','Discounts & coupons','offers']]],['Settings',[['/admin/settings','Site settings','settings']]]];
const TITLES={'/admin':'Overview','/admin/customers':'Customers','/admin/albums':'Albums','/admin/classes':'Classes','/admin/orders':'Orders','/admin/offers':'Discounts & coupons','/admin/settings':'Site settings'};

function AdminShell({user}){const nav=useNavigate();const loc=useLocation();const [open,setOpen]=useState(true);const [bell,setBell]=useState(false);
  const orders=useCol('orders');const recent=[...orders].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);const todayCount=orders.filter(o=>o.date?.slice(0,10)===today()).length;
  const name=user.displayName||user.email?.split('@')[0]||'Admin';const initials=name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2);
  const title=TITLES[loc.pathname.replace(/\/$/,'')]||'Admin';const out=()=>signOut(auth).then(()=>nav('/admin/login'));
  return <div className={'ad'+(open?'':' collapsed')}>
    <aside className="ad-side"><div className="ad-brand"><Brand/></div>
      <div className="ad-nav">{NAV.map(([g,items])=><div key={g}><div className="ad-group">{g}</div>{items.map(([to,label,ic,end])=><NavLink key={to} to={to} end={end} title={label} className="ad-link"><Ic d={ICONS[ic]}/><span>{label}</span></NavLink>)}</div>)}</div>
      <div className="ad-user"><div className="ad-av">{initials}</div><div className="ad-ui"><b>{name}</b><span className="ad-badge">Admin</span></div><button className="ad-out" onClick={out} title="Sign out" aria-label="Sign out"><Ic d={ICONS.logout} s={16}/></button></div></aside>
    <div className="ad-main"><header className="ad-top"><button className="ad-ico" onClick={()=>setOpen(!open)} aria-label="Toggle menu"><Ic d={ICONS.menu}/></button><h1>{title}</h1><div className="ad-sp"/>
      <a href="/" className="ad-store"><Ic d={ICONS.store} s={16}/>View store</a>
      <div className="ad-pop"><button className="ad-ico" onClick={()=>setBell(!bell)} aria-label="Notifications"><Ic d={ICONS.bell}/>{todayCount>0&&<i className="ad-dot"/>}</button>
        {bell&&<div className="ad-drop" onClick={()=>setBell(false)}><b>Recent orders</b>{!recent.length?<p className="muted sm">No orders yet.</p>:recent.map(o=><a key={o.orderNo} href={`/invoice/${o.orderNo}`}><span>{o.name||o.email}</span><small>{o.orderNo} · {money(o.total)}</small></a>)}</div>}</div>
      <div className="ad-me"><div className="ad-av sm">{initials}</div><span>{name}</span></div></header>
      <main className="ad-content"><Routes><Route index element={<Overview/>}/><Route path="customers" element={<Customers/>}/><Route path="albums" element={<Albums/>}/><Route path="classes" element={<Classes/>}/><Route path="offers" element={<Offers/>}/><Route path="settings" element={<SiteSettings/>}/><Route path="orders" element={<Orders/>}/></Routes></main>
      <footer className="ad-foot">Admin console · Changes apply to the live store immediately</footer></div></div>;}

export default function Admin(){const {user,isAdmin}=useApp();const nav=useNavigate();
  if(!user)return <Navigate to="/admin/login"/>;
  if(!isAdmin)return <div className="alogin"><div className="card"><h2>Admins only</h2><p className="muted">Your account ({user.uid}) is not an admin. Create a document in the <code>admins</code> collection with this UID as its ID, then refresh.</p><button className="btn" onClick={()=>signOut(auth).then(()=>nav('/admin/login'))}>Sign out</button></div></div>;
  return <AdminShell user={user}/>;}
