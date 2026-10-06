import {ArrowUpRight,History,ArrowRight} from 'lucide-react';
import type {Product} from '@/lib/model';

export function Brand(){
 return <div className="brand"><svg className="brand-mark" viewBox="0 0 48 48" fill="none" aria-hidden="true"><rect x="4" y="4" width="40" height="40" rx="10" stroke="currentColor"/><path d="M17 14h8m-5-1v22h14v-6M16 35h7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/><path d="M31 13l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3Z" fill="currentColor"/></svg><div className="brand-copy">Lucianos<small>Cocina criolla</small></div></div>;
}

function TableSetting(){
 return <svg className="table-setting" viewBox="0 0 360 310" fill="none" aria-hidden="true">
  <path d="M35 58h290v204H35z" fill="url(#cloth)"/><defs><pattern id="cloth" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M0 0h12v12H0zM12 12h12v12H12z" fill="currentColor" opacity=".08"/></pattern></defs>
  <circle cx="180" cy="156" r="91" fill="#fcf7ec" stroke="currentColor" strokeWidth="1.2"/><circle cx="180" cy="156" r="78" stroke="currentColor" strokeWidth="1.2"/><circle cx="180" cy="156" r="63" stroke="currentColor" strokeOpacity=".3"/>
  <path d="M180 109v90h35v-13M166 109h28M164 199h30" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
  <path d="M68 95v121m-10-119v37c0 9 20 9 20 0V97m-10 0v45M289 97v119m0-121c-15 23-16 42 0 50" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
  <path d="M228 30c-7 10-7 13 0 22m-24-26c-9 13-9 18 0 31m-24-27c-7 10-7 13 0 22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  <path d="M115 274h130M148 286h64" stroke="currentColor" strokeOpacity=".45" strokeLinecap="round"/>
 </svg>;
}

export function Welcome({onOpen,onHistory,products}:{products:Product[];onOpen:(menu?:string)=>void;onHistory:()=>void}){
 const menus=[{day:'Domingo',caption:'El sabor de casa',detail:'Pato, cabrito, cuy y nuestra carta criolla.'},{day:'Lunes',caption:'La tradición del lunes',detail:'Shámbar y patita en fiambre.'},{day:'Jueves',caption:'Un jueves bien servido',detail:'Patasquita y patita en fiambre.'}];
 return <section className="opening">
  <div className="opening-hero"><div><span className="eyebrow">DE NUESTRA COCINA A TU MESA</span><h1>La mesa<br/>está lista<span className="brand-period">.</span></h1><p>Un nuevo día en Lucianos. Elige la carta, prepara la caja y comencemos el servicio.</p><div className="opening-steps"><span><b>01</b>La carta</span><span><b>02</b>La caja</span><span><b>03</b>El servicio</span></div></div><div className="opening-art"><span className="art-caption">HECHO EN CASA</span><TableSetting/><span className="art-caption">SERVIDO CON CARIÑO</span></div></div>
  <div className="opening-section-heading"><div><span className="eyebrow">EL PRIMER PASO</span><h2>¿Qué carta servimos hoy?</h2></div><span>Domingo · Lunes · Jueves</span></div>
  <div className="menu-launch-grid">{menus.map((menu,index)=><button className={'menu-launch menu-'+index} key={menu.day} onClick={()=>onOpen(menu.day)} aria-label={`Abrir jornada de ${menu.day}`}><div className="menu-launch-top"><span>CARTA {String(index+1).padStart(2,'0')}</span><ArrowUpRight size={22}/></div><small>{menu.caption}</small><h3>{menu.day}</h3><p>{menu.detail}</p><div className="menu-launch-bottom"><span>{products.filter(p=>p.days.includes(menu.day)&&p.category==='Platos').length} platos en la carta</span><span className="launch-arrow"><ArrowRight size={19}/></span></div></button>)}</div>
  <div className="opening-archive"><div><History size={20}/><span>Tu cocina tiene historia.<small>Las jornadas cerradas y sus registros están guardados.</small></span></div><button className="text-button" onClick={onHistory}>Ver historial<ArrowUpRight size={16}/></button></div>
 </section>;
}
