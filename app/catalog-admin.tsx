'use client';
import {useEffect,useRef,useState} from 'react';
import {Plus,Search,Pencil,Archive,RotateCcw,X,RefreshCw,UtensilsCrossed} from 'lucide-react';
import {MoneyInput} from './money-input';
import {money,type Product} from '@/lib/model';
import {categories,serviceDays,type ManagedProduct} from '@/lib/catalog-model';
type Data={catalog:ManagedProduct[];catalogVersion:number};
type Draft={id:string;revision:number;name:string;category:Product['category'];price:string;days:string[];stockSourceId?:string|null;persistentStock?:boolean};
const normalized=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export default function CatalogAdmin({onChanged}:{onChanged:()=>void}){
 const [data,setData]=useState<Data|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[query,setQuery]=useState(''),[category,setCategory]=useState('Todos'),[day,setDay]=useState('Todos'),[status,setStatus]=useState('Activos');
 const [draft,setDraft]=useState<Draft|null>(null),[formError,setFormError]=useState(''),[confirm,setConfirm]=useState<ManagedProduct|null>(null),[busy,setBusy]=useState(false);
 const busyRef=useRef(false),dialog=useRef<HTMLDialogElement>(null),sequence=useRef(0);
 async function load(){const n=++sequence.current;try{const r=await fetch('/api/catalog',{cache:'no-store'});const s:any=await r.json();if(!r.ok)throw new Error(s.error);if(n===sequence.current){setData(s);setError('');}}catch(e){if(n===sequence.current)setError((e as Error).message);}}
 useEffect(()=>{void load();return()=>{sequence.current++;}},[]);
 useEffect(()=>{if(!notice)return;const id=setTimeout(()=>setNotice(''),3000);return()=>clearTimeout(id);},[notice]);
 useEffect(()=>{if(draft||confirm)dialog.current?.showModal();},[draft,confirm]);
 function close(){if(!busyRef.current){setDraft(null);setConfirm(null);setFormError('');}}
 async function save(action:unknown,message:string){
  if(busyRef.current)return;busyRef.current=true;setBusy(true);setFormError('');sequence.current++;
  try{const r=await fetch('/api/catalog',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(action)});const s:any=await r.json();if(s.catalog)setData(s);if(!r.ok)throw new Error(s.error);
   setDraft(null);setConfirm(null);setError('');setNotice(message);onChanged();
  }catch(e){setFormError((e as Error).message);}finally{busyRef.current=false;setBusy(false);}
 }
 function edit(p?:ManagedProduct){setFormError('');setDraft(p?{...p,price:(p.price/100).toFixed(2)}:{id:crypto.randomUUID(),revision:0,name:'',category:'Platos',price:'',days:[],stockSourceId:null,persistentStock:false});}
 const visible=data?.catalog.filter(p=>(status==='Activos'?p.active:!p.active)&&(category==='Todos'||p.category===category)&&(day==='Todos'||p.days.includes(day))&&normalized(p.name).includes(normalized(query)))??[];
 return <section className="catalog-admin">
  <div className="page-heading"><div><span className="eyebrow">ADMINISTRACIÓN · CARTA DEL NEGOCIO</span><h1>Tu carta, a tu gusto.</h1><p>Crea productos y define sus precios, categorías y días de atención.</p></div><button className="primary" onClick={()=>edit()} disabled={!data||busy}><Plus size={19}/>Nuevo producto</button></div>
  <div className="admin-info"><UtensilsCrossed size={23}/><p><strong>Los cambios se aplican al abrir la próxima jornada.</strong><span>La jornada abierta conserva su carta. Para ajustar un precio durante el servicio, usa «Carta del día». Los pedidos anteriores conservan sus nombres y precios.</span></p></div>
  {notice&&<div className="admin-notice" role="status"><span>{notice}</span><button className="icon-button" aria-label="Cerrar notificación" onClick={()=>setNotice('')}><X size={17}/></button></div>}
  {error&&<div className="error-banner" role="alert">{error}<button onClick={()=>void load()}>Reintentar</button></div>}
  <div className="admin-summary">{categories.map(c=><div key={c}><span>{c}</span><strong>{data?.catalog.filter(p=>p.active&&p.category===c).length??'—'}</strong><small>productos activos</small></div>)}</div>
  <div className="admin-filters"><label className="search"><Search size={18}/><input placeholder="Buscar por nombre" aria-label="Buscar productos" value={query} onChange={e=>setQuery(e.target.value)}/></label>
   <label className="field"><span>Categoría</span><select value={category} onChange={e=>setCategory(e.target.value)}>{['Todos',...categories].map(v=><option key={v}>{v}</option>)}</select></label>
   <label className="field"><span>Día de atención</span><select value={day} onChange={e=>setDay(e.target.value)}>{['Todos',...serviceDays].map(v=><option key={v}>{v}</option>)}</select></label>
   <label className="field"><span>Estado</span><select value={status} onChange={e=>setStatus(e.target.value)}><option>Activos</option><option>Retirados</option></select></label><button className="icon-button" aria-label="Actualizar productos" onClick={()=>void load()} disabled={busy}><RefreshCw size={19}/></button>
  </div>
  <div className="section-heading"><h2>{status==='Activos'?'Productos de tu carta':'Productos retirados'}</h2><span>{visible.length} resultados</span></div>
  <div className="catalog-grid">{visible.map(p=><article className={'product-card admin-product '+(!p.active?'archived':'')} key={p.id}><div className="admin-product-head"><span className="eyebrow">{p.category}</span><span className="admin-state">{p.active?'Activo':'Retirado'}</span></div><h3>{p.name}</h3><strong className="admin-price">{money(p.price)}</strong><div className="admin-days">{p.days.map(d=><span key={d}>{d}</span>)}</div><p className="stock-source-note">{p.persistentStock?'Inventario entre jornadas':p.stockSourceId?'Presas de '+data?.catalog.find(x=>x.id===p.stockSourceId)?.name:'Disponibilidad diaria'}</p><div className="admin-product-actions"><button className="text-button" onClick={()=>edit(p)} disabled={busy}><Pencil size={16}/>Editar</button><button className="text-button" disabled={busy} onClick={()=>{setFormError('');setConfirm(p);}}>{p.active?<Archive size={16}/>:<RotateCcw size={16}/>} {p.active?'Retirar':'Restaurar'}</button></div></article>)}</div>
  {data&&!visible.length&&<div className="empty"><UtensilsCrossed size={28}/><h3>No hay productos con esos filtros</h3><p>Prueba otro nombre o crea un nuevo producto.</p></div>}{!data&&!error&&<p role="status">Cargando la carta…</p>}
  {(draft||confirm)&&<dialog ref={dialog} aria-label={draft?(draft.revision?'Editar producto':'Nuevo producto'):(confirm?.active?'Retirar producto':'Restaurar producto')} onCancel={e=>{if(busy)e.preventDefault();else close();}}>
   <header className="dialog-head"><div><span className="eyebrow">LUCIANOS · ADMINISTRACIÓN</span><h2>{draft?(draft.revision?'Editar producto':'Nuevo producto'):(confirm?.active?'Retirar producto':'Restaurar producto')}</h2></div><button className="icon-button" aria-label="Cerrar formulario" disabled={busy} onClick={close}><X size={20}/></button></header>
   {draft?<form onSubmit={e=>{e.preventDefault();if(!draft.days.length){setFormError('Elige al menos un día de atención.');return;}void save({...draft,type:draft.revision?'update':'create',price:Math.round(Number(draft.price)*100)},draft.revision?'Producto actualizado.':'Producto creado.');}}><div className="dialog-body">
    <label className="field"><span>Nombre del producto</span><input autoFocus required minLength={2} maxLength={100} value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})} disabled={busy} placeholder="Ej. Seco de res"/></label>
    <div className="form-columns"><label className="field"><span>Categoría</span><select disabled={busy} value={draft.category} onChange={e=>setDraft({...draft,category:e.target.value as Product['category'],stockSourceId:null,persistentStock:false})}>{categories.map(c=><option key={c}>{c}</option>)}</select></label><label className="field"><span>Precio (S/)</span><MoneyInput min="0" max="100000" required disabled={busy} value={draft.price} onChange={value=>setDraft({...draft,price:value})} placeholder="25.00"/></label></div>
    {draft.category==='Platos'&&<label className="field"><span>Stock / presas compartidas</span><select value={draft.stockSourceId??''} disabled={busy} onChange={e=>setDraft({...draft,stockSourceId:e.target.value||null})}><option value="">Cantidad propia por jornada</option>{data?.catalog.filter(p=>p.id!==draft.id&&p.active&&p.category==='Platos'&&!p.stockSourceId&&!p.persistentStock).map(p=><option key={p.id} value={p.id}>Descontar de {p.name}</option>)}</select></label>}
    {draft.category==='Bebidas'&&<label className="inventory-toggle"><input type="checkbox" disabled={busy} checked={!!draft.persistentStock} onChange={e=>setDraft({...draft,persistentStock:e.target.checked})}/>Conservar stock entre jornadas (gaseosas)</label>}
    <fieldset className="admin-day-options"><legend>Días en los que se ofrece</legend>{serviceDays.map(d=><label key={d}><input type="checkbox" disabled={busy} checked={draft.days.includes(d)} onChange={e=>setDraft({...draft,days:e.target.checked?[...draft.days,d]:draft.days.filter(v=>v!==d)})}/>{d}</label>)}</fieldset><p className="helper">Las cantidades disponibles se registran al abrir cada jornada.</p>{formError&&<p className="error-banner" role="alert">{formError}</p>}
   </div><div className="dialog-foot"><button type="button" className="text-button" disabled={busy} onClick={close}>Cancelar</button><button className="primary" disabled={busy}>{busy?'Guardando…':'Guardar producto'}</button></div></form>:
   <><div className="dialog-body"><h3>{confirm!.name}</h3><p>{confirm!.active?'Se retirará de las próximas cartas. Podrás restaurarlo desde el filtro «Retirados». Los pedidos y la jornada abierta se conservan.':'Volverá a estar disponible al abrir una nueva jornada, con sus días y precio registrados.'}</p>{formError&&<p className="error-banner" role="alert">{formError}</p>}</div><div className="dialog-foot"><button className="text-button" disabled={busy} onClick={close}>Cancelar</button><button className="primary" disabled={busy} onClick={()=>void save({type:confirm!.active?'archive':'restore',id:confirm!.id,revision:confirm!.revision},confirm!.active?'Producto retirado de futuras cartas.':'Producto restaurado.')}>{busy?'Guardando…':confirm!.active?'Retirar producto':'Restaurar producto'}</button></div></>}
  </dialog>}
 </section>;
}
