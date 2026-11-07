import {createContext,useContext,useEffect,useState} from 'react';
import {onAuthStateChanged} from 'firebase/auth';
import {doc,getDoc,onSnapshot} from 'firebase/firestore';
import {auth,db} from './firebase';
const Ctx=createContext();export const useApp=()=>useContext(Ctx);
export const effPrice=a=>Math.max(1,Math.round(Number(a.price)*(1-(Number(a.discount)||0)/100)));
export const money=n=>'₹'+Number(n||0).toLocaleString('en-IN');
export function AppProvider({children}){
  const [user,setUser]=useState(null),[profile,setProfile]=useState(null),[isAdmin,setAdmin]=useState(false),[ready,setReady]=useState(false);
  const [site,setSite]=useState({name:'VideoVault',logo:''});
  useEffect(()=>onSnapshot(doc(db,'settings','site'),s=>{const d=s.exists()?s.data():{};setSite({name:d.name||'VideoVault',logo:d.logo||''})},()=>{}),[]);
  useEffect(()=>{document.title=site.name},[site.name]);
  const [cart,setCart]=useState(()=>{try{return JSON.parse(localStorage.getItem('vcart')||'[]')}catch{return[]}});
  useEffect(()=>{localStorage.setItem('vcart',JSON.stringify(cart))},[cart]);
  useEffect(()=>onAuthStateChanged(auth,async u=>{
    setUser(u);
    if(u){try{setAdmin((await getDoc(doc(db,'admins',u.uid))).exists())}catch{setAdmin(false)}}else{setAdmin(false);setProfile(null)}
    setReady(true);
  }),[]);
  useEffect(()=>{if(!user)return;return onSnapshot(doc(db,'users',user.uid),s=>setProfile(s.exists()?s.data():null))},[user]);
  const addToCart=a=>setCart(c=>c.some(x=>x.id===a.id)?c:[...c,{id:a.id,title:a.title,price:effPrice(a),orig:Number(a.price),count:a.videoCount||0}]);
  const removeFromCart=id=>setCart(c=>c.filter(x=>x.id!==id));
  const owns=id=>!!profile?.purchasedIds?.includes(id);
  return <Ctx.Provider value={{user,profile,isAdmin,ready,site,cart,setCart,addToCart,removeFromCart,owns}}>{children}</Ctx.Provider>;
}
