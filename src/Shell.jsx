import {useState} from 'react';
import {Link,NavLink,useNavigate} from 'react-router-dom';
import {signOut} from 'firebase/auth';
import {auth} from './firebase';
import {useApp,money} from './store';
import {Brand} from './shared';
const I=({d,s=17})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>;
export const IC={
  search:<><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></>,
  bag:<><path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></>,
  home:<><path d="M4 11 12 4l8 7v9H4z"/><path d="M10 20v-6h4v6"/></>,
  grid:<><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></>,
  down:<><path d="M12 4v11"/><path d="m7 11 5 5 5-5"/><path d="M5 20h14"/></>,
  wallet:<><path d="M4 7h15a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M4 7l12-3v3"/><circle cx="16" cy="13.5" r="1"/></>,
  zap:<><path d="M13 3 5 13h6l-1 8 8-10h-6z"/></>,
  shield:<><path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z"/><path d="m9 12 2 2 4-4"/></>,
  play:<><circle cx="12" cy="12" r="9"/><path d="m10 8.5 5 3.5-5 3.5z"/></>
};
export function Header(){const {user,profile,cart}=useApp();const nav=useNavigate();const [q,setQ]=useState('');
  return <header className="hdr2">
    <div className="wrap hdr2-in"><Link to="/" className="logo"><Brand/></Link>
      <form className="search2" onSubmit={e=>{e.preventDefault();nav('/albums?q='+encodeURIComponent(q))}}><I d={IC.search} s={15}/><input type="search" aria-label="Search" placeholder="Search courses" value={q} onChange={e=>setQ(e.target.value)}/></form>
      <div className="hdr2-r">
        <Link to="/cart" className="iconbtn" aria-label={`Cart (${cart.length})`}><I d={IC.bag} s={18}/>{cart.length>0&&<i className="cnt">{cart.length}</i>}</Link>
        {user?<><Link to="/wallet" className="wallet">{money(profile?.wallet)}</Link>
          <div className="menu"><button className="hl link">{profile?.name?.split(' ')[0]||'Account'} ▾</button><div className="dd"><Link to="/account">My courses</Link><Link to="/orders">My orders</Link><Link to="/wallet">Wallet</Link><button onClick={()=>signOut(auth).then(()=>nav('/'))}>Sign out</button></div></div></>
        :<div className="auth"><Link to="/login" className="btn ghost sm">Sign in</Link><Link to="/login" state={{reg:true}} className="btn sm">Register</Link></div>}
      </div></div>
    <div className="subnav" role="navigation"><div className="wrap"><NavLink to="/" end>Home</NavLink><NavLink to="/albums">Courses</NavLink>{user&&<NavLink to="/account">My courses</NavLink>}</div></div>
  </header>;}
function MobileBar(){const {cart,user}=useApp();
  const it=(to,ic,l,end)=><NavLink to={to} end={end} className="mb-i"><I d={ic} s={19}/><span>{l}</span></NavLink>;
  return <><div className="mb-pad"/><div className="mbar" role="navigation">{it('/',IC.home,'Home',true)}{it('/albums',IC.grid,'Courses')}{user&&it('/account',IC.down,'My courses')}{user&&it('/wallet',IC.wallet,'Wallet')}{!user&&it('/login',IC.shield,'Sign in')}<NavLink to="/cart" className="mb-i"><span className="rel"><I d={IC.bag} s={19}/>{cart.length>0&&<i className="cnt">{cart.length}</i>}</span><span>Cart</span></NavLink></div></>;}
export function Footer(){const {user,site}=useApp();
  return <><footer className="ftr"><div className="wrap fgrid">
    <div><Link to="/" className="logo"><Brand/></Link><p className="muted sm">Premium video courses, streamed securely in your browser after purchase.</p></div>
    <div><b>Shop</b><Link to="/albums">All courses</Link><Link to="/cart">Cart</Link></div>
    <div><b>Company</b><Link to="/page/about">About us</Link><Link to="/page/contact">Contact</Link><Link to="/page/faq">FAQ</Link></div>
    <div><b>Legal</b><Link to="/page/terms">Terms of use</Link><Link to="/page/privacy">Privacy policy</Link><Link to="/page/refund">Refund policy</Link></div>
    <div><b>Account</b>{user?<><Link to="/account">My courses</Link><Link to="/orders">My orders</Link><Link to="/wallet">Wallet</Link></>:<><Link to="/login">Sign in</Link><Link to="/login" state={{reg:true}}>Create account</Link></>}</div></div>
    <div className="wrap fbase"><span>© {new Date().getFullYear()} {site.name}</span><span>Videos are for streaming only.</span></div>
    <div className="fwarn" role="note">Recording, copying or sharing these videos is not allowed. Accounts found doing so are blocked without refund.</div></footer><MobileBar/></>;}
