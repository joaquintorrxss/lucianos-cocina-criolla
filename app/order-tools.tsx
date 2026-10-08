'use client';
import {useState,useRef,useEffect,type ReactNode} from 'react';
import {Check,CheckCheck,ChefHat,Plus,Minus,X,Search,Wallet,Receipt,UtensilsCrossed} from 'lucide-react';
import {dayCatalog,stockSource,stockQuantity,money,total,paid,served,balance,type Day,type Order,type Line} from '@/lib/model';
import {automaticTapers} from '@/lib/takeaway';
import {dayAccounting,stages,orderStage,stageLabel,stageColor,type Stage} from '@/lib/accounting';

const clock=(s:string)=>new Date(s).toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit',timeZone:'America/Lima'});
const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const cents=(s:string)=>Math.round(Number(s)*100);
const amount=(n:number)=>(n/100).toFixed(2);
function Field({label,children}:{label:string;children:ReactNode}){return <label className="field"><span>{label}</span>{children}</label>}
type Save=(action:any)=>Promise<boolean>;
export type OrderCallbacks={onOpen:(o:Order)=>void;onEdit:(o:Order)=>void;onPay:(o:Order)=>void;onServe:(o:Order,l:Line,qty:number)=>void;onServeAll:(o:Order)=>void};

export function ServiceLine({order,line,active,busy,onServe,part}:{order:Order;line:Line;active:boolean;busy:boolean;part?:'pending'|'served';onServe:OrderCallbacks['onServe']}){
 const done=part==='served'||line.served===line.qty;const shown=part==='served'?line.served:part==='pending'?line.qty-line.served:line.qty;
 return <div className={'service-line '+(done?'is-served':'')}>
  <label className="serve-check"><input type="checkbox" checked={done} disabled={!active||busy} onChange={()=>onServe(order,line,done?0:line.qty)} aria-label={part==='served'?`Devolver ${line.name} a pendientes en pedido ${order.number}`:`Marcar ${line.name} servido en pedido ${order.number}`}/><span><Check size={14}/></span></label>
  <div className="service-line-content"><strong>{shown} × {line.name}</strong>{line.notes&&<p className="dish-note">{line.notes}</p>}
   <div className="service-progress"><span>{line.served}/{line.qty} servidos</span>{active&&!done&&shown>1&&<button disabled={busy} onClick={()=>onServe(order,line,line.served+1)}><Plus size={12}/>Servir 1</button>}</div>
  </div>
 </div>;
}
export function ServiceColumns({order,active,busy,onServe,prices=false}:{order:Order;active:boolean;busy:boolean;onServe:OrderCallbacks['onServe'];prices?:boolean}){
 const pending=order.lines.filter(l=>l.served<l.qty),done=order.lines.filter(l=>l.served>0);
 const group=(lines:Line[],part:'pending'|'served')=>lines.map(l=><div key={l.id} className="service-column-line"><ServiceLine order={order} line={l} part={part} active={active} busy={busy} onServe={onServe}/>{prices&&<b>{money(l.price*(part==='pending'?l.qty-l.served:l.served))}</b>}</div>);
 return <div className="service-columns"><section className="pending-dishes"><h4>Por servir <b>{pending.reduce((n,l)=>n+l.qty-l.served,0)}</b></h4>{group(pending,'pending')}{!pending.length&&<p className="service-empty">Todo entregado.</p>}</section><section className="served-dishes"><h4><CheckCheck size={15}/>Servidos <b>{done.reduce((n,l)=>n+l.served,0)}</b></h4>{group(done,'served')}{!done.length&&<p className="service-empty">Los platos entregados aparecerán aquí.</p>}</section></div>;
}
export function ServiceCard({order:o,active,busy,...actions}:OrderCallbacks&{order:Order;active:boolean;busy:boolean}){
 const done=served(o),due=total(o)-paid(o),remaining=o.lines.reduce((n,l)=>n+l.qty-l.served,0);
 return <article className={'order-card service-card '+stageColor(o)}>
  <div className="order-top"><button className="order-title" onClick={()=>actions.onOpen(o)}><span className="table-mini">{String(o.table).padStart(2,'0')}</span><span><strong>Mesa {o.table}</strong><small>#{String(o.number).padStart(3,'0')} · {clock(o.at)}</small></span></button><b>{money(total(o))}</b>
   {active&&!done&&<button className="quick-serve" disabled={busy} onClick={()=>actions.onServeAll(o)} aria-label={`Marcar pedido ${o.number} atendido`} title="Marcar todo el pedido atendido"><CheckCheck size={20}/></button>}
  </div>
  <span className={'badge status-label '+stageColor(o)}>{stageLabel(o)}</span>
  {o.takeaway&&<span className="takeaway-badge">Para llevar</span>}
  <ServiceColumns order={o} active={active} busy={busy} onServe={actions.onServe}/>

  {o.notes&&<p className="order-note">{o.notes}</p>}
  <div className="card-totals"><span>{done?'Todos los productos servidos':`${remaining} por servir`}</span><b>{due>0?`Por cobrar ${money(due)}`:'Pagado completo'}</b></div>
  {paid(o)>0&&due>0&&<small className="partial-payment">Abonado: {money(paid(o))}</small>}
  <div className="card-actions">{active&&<button className="secondary" onClick={()=>actions.onEdit(o)}><Plus size={15}/>Agregar platos</button>}{active&&due>0?<button className="primary" onClick={()=>actions.onPay(o)}><Wallet size={15}/>Cobrar</button>:<button className="text-button" onClick={()=>actions.onOpen(o)}>Ver detalle</button>}</div>
 </article>;
}

const stageHints:Record<Stage,string>={'Por atender':'Falta servir y cobrar','Atendidos · por pagar':'Solo cobrar o agregar platos','Pagados · por atender':'Ya pagaron; falta servir','Completados':'Servidos y pagados'};
export function OrdersBoard({orders,filter,onFilter,query,onQuery,active,busy,...actions}:OrderCallbacks&{orders:Order[];filter:string;onFilter:(s:string)=>void;query:string;onQuery:(s:string)=>void;active:boolean;busy:boolean}){
 const selected=stages.includes(filter as Stage)?filter as Stage:'Por atender';
 const matching=orders.filter(o=>orderStage(o)===selected&&(!query||String(o.table)===query||String(o.number).includes(query)));
 return <>
  <div className="stage-tabs" aria-label="Estado de los pedidos">{stages.map((s,i)=>{const Icon=[ChefHat,Wallet,Receipt,CheckCheck][i];return <button key={s} className={`stage-tab ${['amber','blue','purple','settled'][i]} ${selected===s?'active':''}`} onClick={()=>onFilter(s)} aria-pressed={selected===s}><div><Icon size={20}/><b>{orders.filter(o=>orderStage(o)===s).length}</b></div><strong>{s}</strong><small>{stageHints[s]}</small></button>})}</div>
  <div className="section-heading"><div><h2>{selected}</h2><p className="helper compact-help">{stageHints[selected]}</p></div><label className="search"><Search size={18}/><input aria-label="Buscar pedidos por mesa o número" placeholder="Mesa o número de pedido" value={query} onChange={e=>onQuery(e.target.value)}/></label></div>
  {matching.length?<div className="order-grid service-grid">{matching.map(o=><ServiceCard key={o.id} order={o} active={active} busy={busy} {...actions}/>)}</div>:<div className="empty"><CheckCheck size={30}/><h3>{query?'No hay coincidencias':'Sin pedidos en esta lista'}</h3><p>{query?'Prueba otra mesa o número.':selected==='Completados'?'Aquí aparecerán los pedidos servidos y pagados.':'Los pedidos aparecerán aquí al cambiar su estado.'}</p></div>}
 </>;
}

export function TableMap({day,active,busy,onNew,onTable,onServeAll}:{day:Day;active:boolean;busy:boolean;onNew:(table:number)=>void;onTable:(table:number)=>void;onServeAll:OrderCallbacks['onServeAll']}){
 const orders=day.orders.filter(o=>!o.cancelled&&orderStage(o)!=='Completados');
 const tables=Array.from({length:13},(_,i)=>{const number=i+1;const os=orders.filter(o=>o.table===number);return {number,orders:os,attended:os.length>0&&os.every(served)};});
 const ready=tables.filter(t=>t.attended),working=tables.filter(t=>!t.attended);
 function tile(t:typeof tables[number]){const os=t.orders;const prepaid=os.length>0&&os.every(o=>paid(o)===total(o));const status=!os.length?'Libre':t.attended?'Atendida · por pagar':prepaid?'Pagada · por atender':'Por atender';const color=!os.length?'free':t.attended?'blue':prepaid?'purple':'amber';return <article className={'table-card table-service '+color} key={t.number}>
  <button className="table-open" onClick={()=>os.length?onTable(t.number):active?onNew(t.number):onTable(t.number)}><div className="table-card-top"><span>MESA</span><span className={'badge '+color}>{status}</span></div><div className="table-number">{String(t.number).padStart(2,'0')}<UtensilsCrossed size={29}/></div><div className="table-card-bottom"><span>{os.length?`${os.length} pedido${os.length>1?'s':''}`:'Lista para recibir'}</span><strong>{os.length?money(os.reduce((n,o)=>n+total(o)-paid(o),0)):<Plus size={18}/>}</strong></div></button>
  {os.map(o=><div className="table-order-check" key={o.id}><button className="table-order-link" onClick={()=>onTable(t.number)}><b>#{String(o.number).padStart(3,'0')}</b><span>{served(o)?'Servido':`${o.lines.reduce((n,l)=>n+l.qty-l.served,0)} por servir`}</span></button>{active&&!served(o)?<button className="quick-serve" onClick={()=>onServeAll(o)} disabled={busy} aria-label={`Marcar pedido ${o.number} atendido desde mesa ${t.number}`} title="Marcar pedido atendido"><CheckCheck size={18}/></button>:<CheckCheck size={17}/>}</div>)}
 </article>}
 return <div className="table-zones"><section className="table-zone working"><div className="zone-heading"><div><ChefHat size={21}/><h2>Libres y por atender</h2></div><span>{working.length} {working.length===1?'mesa':'mesas'}</span></div><p className="zone-help">Marca el check de un pedido cuando esté servido.</p><div className="tables">{working.map(tile)}</div></section><section className="table-zone ready"><div className="zone-heading"><div><Wallet size={21}/><h2>Atendidas · por cobrar</h2></div><span>{ready.length} {ready.length===1?'mesa':'mesas'}</span></div><p className="zone-help">Aquí solo queda cobrar o agregar platos.</p>{ready.length?<div className="tables">{ready.map(tile)}</div>:<div className="empty small-empty"><CheckCheck size={28}/><h3>Todavía no hay mesas atendidas por cobrar</h3><p>Se moverán aquí al marcar todos sus productos como servidos.</p></div>}</section></div>;
}

export function OrderForm({day,order,initialTable,busy,onSave}:{day:Day;order?:Order;initialTable?:number;busy:boolean;onSave:Save}){
 const [table,setTable]=useState(order?.table??initialTable??1),[lines,setLines]=useState<Line[]>(order?.lines??[]),[notes,setNotes]=useState(order?.notes??''),[q,setQ]=useState(''),[cat,setCat]=useState('Todos');
 const [selected,setSelected]=useState<string|null>(null),[quantity,setQuantity]=useState('1'),[detail,setDetail]=useState('');
 const configRef=useRef<HTMLElement>(null);
 useEffect(()=>{if(selected){configRef.current?.scrollIntoView({block:'nearest'});configRef.current?.querySelector<HTMLInputElement>('input')?.focus({preventScroll:true});}},[selected]);
 const products=dayCatalog(day).filter(p=>p.days.includes(day.menu)&&normalize(p.name).includes(normalize(q))&&(cat==='Todos'||p.category===cat));
 const source=(id:string)=>stockSource(dayCatalog(day).find(p=>p.id===id)!);
 const available=(id:string)=>stockQuantity(day,id)===null?null:stockQuantity(day,id)!+(order?.lines.filter(l=>source(l.productId)===source(id)).reduce((n,l)=>n+l.qty,0)??0)-lines.filter(l=>source(l.productId)===source(id)).reduce((n,l)=>n+l.qty,0);
 const [takeaway,setTakeaway]=useState(order?.takeaway??false),[tapersManual,setTapersManual]=useState(order?.tapersManual??!!order?.lines.some(l=>l.productId==='taper'));
 const isTaper=(l:Line)=>l.productId==='taper'||l.category==='Adicionales'&&/t[aá]per/i.test(l.name);
 function updateLines(next:Line[],manual=tapersManual,toGo=takeaway){setLines(automaticTapers(next,day,toGo,manual));}

 const product=dayCatalog(day).find(p=>p.id===selected),qty=Number(quantity),remaining=product?available(product.id):null;
 const invalidQty=!Number.isInteger(qty)||qty<1||qty>1000||remaining!==null&&qty>remaining;
 function choose(id:string){setSelected(id);setQuantity('1');setDetail('');}
 function add(){if(!product||invalidQty)return;const note=detail.trim();const price=day.prices[product.id];const manual=tapersManual||product.id==='taper'||product.category==='Adicionales'&&/t[aá]per/i.test(product.name);if(manual)setTapersManual(true);const same=lines.find(l=>l.productId===product.id&&l.price===price&&(l.notes??'')===note&&l.qty+qty<=1000);updateLines(same?lines.map(l=>l.id===same.id?{...l,qty:l.qty+qty}:l):[...lines,{id:crypto.randomUUID(),productId:product.id,name:product.name,category:product.category,qty,price,served:0,notes:note}],manual);setSelected(null);setQuantity('1');setDetail('');}
 const fullyPaid=!!order&&paid(order)===total(order);
 return <form onSubmit={e=>{e.preventDefault();void onSave({type:'order',orderId:order?.id,table,lines,notes,takeaway,tapersManual})}}>
  <div className="dialog-body order-builder"><section className="product-browser"><span className="eyebrow">01 · ELIGE LOS PRODUCTOS</span><Field label="Mesa"><select value={table} onChange={e=>setTable(Number(e.target.value))}>{Array.from({length:13},(_,i)=><option key={i} value={i+1}>Mesa {i+1}</option>)}</select></Field>
   <div className="filters compact">{['Todos','Platos','Bebidas','Adicionales'].map(c=><button type="button" key={c} className={cat===c?'active':''} onClick={()=>setCat(c)}>{c}</button>)}</div>
   <label className="search full"><Search size={18}/><input autoFocus placeholder="Busca un plato, bebida o adicional" value={q} onChange={e=>setQ(e.target.value)}/></label>
   <div className="picker product-picker">{products.map(p=><button type="button" key={p.id} className={selected===p.id?'chosen-product':''} disabled={p.persistentStock&&available(p.id)===null||available(p.id)!==null&&available(p.id)!<=0} onClick={()=>choose(p.id)} aria-label={`Seleccionar ${p.name}`}><span><strong>{p.name}</strong><small>{available(p.id)===null?(p.persistentStock?'Registra el inventario':p.category):available(p.id)===0?'Agotado':available(p.id)+' disponibles'}</small></span><b>{money(day.prices[p.id])}</b><Plus size={17}/></button>)}{!products.length&&<p className="helper">No se encontraron productos.</p>}</div>
   {product&&<section ref={configRef} className="product-config"><div className="product-config-head"><div><small>{product.category}</small><h3>{product.name}</h3></div><button type="button" className="icon-button" onClick={()=>setSelected(null)} aria-label="Cerrar selección de producto"><X size={18}/></button></div><div className="product-config-quantity"><Field label="Cantidad a agregar"><div className="quantity-stepper"><button type="button" disabled={qty<=1||!Number.isFinite(qty)} aria-label="Reducir cantidad" onClick={()=>setQuantity(String(qty-1))}><Minus size={17}/></button><input aria-label="Cantidad a agregar" type="number" required min="1" max={remaining===null?1000:Math.min(remaining,1000)} step="1" value={quantity} onChange={e=>setQuantity(e.target.value)}/><button type="button" disabled={invalidQty||remaining!==null&&qty>=remaining||qty>=1000} aria-label="Aumentar cantidad" onClick={()=>setQuantity(String(qty+1))}><Plus size={17}/></button></div></Field><div><small>Precio unitario</small><strong>{money(day.prices[product.id])}</strong></div></div><details className="compact-notes"><summary>Agregar detalle de plato</summary><Field label="Detalle para este plato o bebida"><textarea value={detail} maxLength={1000} rows={2} placeholder="Ej. Sin ají, sin ensalada, sin hielo…" onChange={e=>setDetail(e.target.value)}/></Field></details><button type="button" className="primary full" onClick={add} disabled={invalidQty}><Plus size={17}/>Agregar {invalidQty?'producto':`${qty} · ${money(qty*day.prices[product.id])}`}</button>{invalidQty&&<p className="input-hint">Ingresa una cantidad válida dentro de lo disponible.</p>}</section>}
   </section><section className="order-draft"><span className="eyebrow">02 · REVISA EL PEDIDO</span><div className="draft-heading"><h3>Productos del pedido</h3><span>{lines.reduce((n,l)=>n+l.qty,0)} unidades</span></div>
   <div className="takeaway-control"><label><input type="checkbox" checked={takeaway} onChange={e=>{setTakeaway(e.target.checked);updateLines(lines,tapersManual,e.target.checked);}}/>Para llevar</label>{takeaway&&<span>{lines.filter(l=>l.category==='Platos').reduce((n,l)=>n+l.qty,0)} platos · táperes {tapersManual?'ajustados':'automáticos'}</span>}</div>
   {takeaway&&<p className="helper taper-hint">Se agrega un táper por plato. Puedes cambiar su cantidad o quitarlo si el cliente trae sus envases. {tapersManual&&<button type="button" className="text-button" onClick={()=>{setTapersManual(false);updateLines(lines,false);}}>Volver al cálculo automático</button>}</p>}
   {fullyPaid&&<p className="helper">El pago anterior se conserva. Los productos nuevos tendrán su propio saldo pendiente.</p>}
   {lines.length?lines.map((l,i)=>{const old=order?.lines.find(x=>x.id===l.id);return <div className="draft-line" key={l.id}><div className="draft-line-title"><strong>{l.qty} × {l.name}</strong><button className="icon-button" type="button" disabled={l.served>0||fullyPaid&&!!old} aria-label={`Quitar ${l.name} de línea ${i+1}`} onClick={()=>{const manual=tapersManual||isTaper(l);if(isTaper(l))setTapersManual(true);updateLines(lines.filter(x=>x.id!==l.id),manual);}}><X size={17}/></button></div><div className="line-controls"><Field label="Cantidad"><input type="number" required min={Math.max(l.served,fullyPaid&&old?old.qty:1)} max="1000" step="1" value={l.qty} onChange={e=>{const manual=tapersManual||isTaper(l);if(isTaper(l))setTapersManual(true);updateLines(lines.map(x=>x.id===l.id?{...x,qty:Number(e.target.value)}:x),manual);}}/></Field><Field label="Precio unitario (S/)"><input type="number" required min="0" step="0.01" disabled={fullyPaid&&!!old} value={l.price/100} onChange={e=>setLines(lines.map(x=>x.id===l.id?{...x,price:cents(e.target.value)}:x))}/></Field><b>{money(l.price*l.qty)}</b></div><details className="compact-notes" ><summary>{l.notes?'Detalle de plato':'Agregar detalle de plato'}</summary><Field label={`Detalle · ${l.name} · ${i+1}`}><input maxLength={1000} value={l.notes??''} placeholder="Detalle de este producto" onChange={e=>setLines(lines.map(x=>x.id===l.id?{...x,notes:e.target.value}:x))}/></Field></details>{l.served>0&&<small className="served-caption">{l.served} unidades ya servidas</small>}</div>}):<p className="helper">Selecciona un producto, elige su cantidad y agrégalo.</p>}
   <details className="compact-notes general-notes" ><summary>Agregar detalle general del pedido</summary><Field label="Detalle general del pedido"><textarea value={notes} maxLength={2000} onChange={e=>setNotes(e.target.value)} placeholder="Indicaciones para toda la mesa…" rows={2}/></Field></details></section>
  </div>
  <div className="dialog-foot split"><div><small>Total del pedido</small><strong>{money(lines.reduce((n,l)=>n+l.qty*l.price,0))}</strong>{order&&paid(order)>0&&<small>Abonado {money(paid(order))}</small>}</div><button className="primary" disabled={busy||!lines.length||!!selected}>{busy?'Guardando…':order?'Guardar cambios':'Registrar pedido'}</button></div>
 </form>;
}

export function OrderDetail({order:o,active,busy,onCancel,...actions}:OrderCallbacks&{order:Order;active:boolean;busy:boolean;onCancel:()=>void}){
 const due=total(o)-paid(o);
 return <div className="dialog-body"><div className="detail-meta"><b>Mesa {o.table}</b><span>{clock(o.at)}</span></div><span className={'badge status-label '+stageColor(o)}>{stageLabel(o)}</span>
  {active&&!served(o)&&<button className="serve-all-banner" disabled={busy} onClick={()=>actions.onServeAll(o)}><CheckCheck size={20}/><span><strong>Marcar todo el pedido atendido</strong><small>Todos los productos ya fueron servidos</small></span></button>}
  {o.takeaway&&<span className="takeaway-badge">Para llevar</span>}<ServiceColumns order={o} active={active} busy={busy} onServe={actions.onServe} prices/>

  {o.notes&&<div className="notes-box"><strong>Detalle general</strong><p>{o.notes}</p></div>}
  <div className="summary-row"><span>Total del pedido</span><b>{money(total(o))}</b></div><div className="summary-row"><span>Pagado por el cliente</span><b>{money(paid(o))}</b></div><div className="summary-total"><span>Cliente aún debe</span><strong>{money(due)}</strong></div>
  {o.payments.map(p=><div className="payment-history" key={p.id}><span>{clock(p.at)} · Efectivo {money(p.cash)} · Yape {money(p.yape)}{p.change>0?' · Vuelto '+money(p.change):''}</span>{p.cashAfter!==undefined&&<small>Caja después de este cobro: {money(p.cashAfter)}</small>}</div>)}
  {active&&<div className="dialog-actions"><button className="secondary" onClick={()=>actions.onEdit(o)}><Plus size={16}/>Agregar platos / editar</button>{due>0&&<button className="primary" onClick={()=>actions.onPay(o)}><Wallet size={18}/>Cobrar {money(due)}</button>}{paid(o)===0&&o.lines.every(l=>l.served===0)&&<button className="danger-button" disabled={busy} onClick={onCancel}>Anular pedido</button>}</div>}
 </div>;
}

// Text money fields avoid browser spinner, wheel and arrow-key changes to cents.
function MoneyInput({value,onChange,...props}:{value:string;onChange:(s:string)=>void;min?:string;required?:boolean;autoFocus?:boolean;placeholder?:string}){
 return <input {...props} type="text" inputMode="decimal" pattern="[0-9]+([.,][0-9]{1,2})?" value={value} onChange={e=>{const value=e.target.value.replace(',','.');if(/^\d*(?:\.\d{0,2})?$/.test(value))onChange(value);}}/>;
}
export function PaymentForm({order,day,busy,onSave}:{order:Order;day:Day;busy:boolean;onSave:Save}){
 const due=total(order)-paid(order);
 const [method,setMethod]=useState('Efectivo'),[paymentTotal,setPaymentTotal]=useState(amount(due)),[yape,setYape]=useState('0.00'),[tender,setTender]=useState(amount(due)),[tenderEdited,setTenderEdited]=useState(false);
 const target=cents(paymentTotal),y=method==='Yape'?target:method==='Ambos'?cents(yape):0,c=target-y,received=method==='Yape'?0:cents(tender);
 const valid=[target,c,y,received].every(n=>Number.isSafeInteger(n)&&n>=0)&&target>0&&target<=due&&received>=c&&paymentTotal!==''&&(method!=='Ambos'||yape!=='')&&(method==='Yape'||tender!=='');
 function choose(m:string){setMethod(m);setPaymentTotal(amount(due));setYape('0.00');setTender(m==='Yape'?'0.00':amount(due));setTenderEdited(false);}
 function updateTotal(value:string){setPaymentTotal(value);if(!tenderEdited&&method!=='Yape')setTender(amount(Math.max(0,cents(value)-(method==='Ambos'?cents(yape):0))));}
 function updateYape(value:string){setYape(value);if(!tenderEdited)setTender(amount(Math.max(0,target-cents(value))));}
 return <form className="payment-form" onSubmit={e=>{e.preventDefault();if(valid)void onSave({type:'payment',orderId:order.id,cash:c,yape:y,tender:received});}}><div className="dialog-body">
  <div className="summary-total"><span>Mesa {order.table} · Cliente debe</span><strong>{money(due)}</strong></div>
  {!served(order)&&<p className="prepaid-note"><ChefHat size={17}/>Si cobras todo ahora, el pedido pasará a Pagados · por atender.</p>}
  <div className="day-options">{['Efectivo','Yape','Ambos'].map(m=><button type="button" className={(method===m?'chosen ':'')+(m==='Yape'?'yape-option':'')} key={m} onClick={()=>choose(m)}>{m}</button>)}</div>
  <Field label="Monto total (S/)"><MoneyInput required value={paymentTotal} onChange={updateTotal}/></Field><p className="input-description">Total que se cobra ahora. Para un abono, ingresa una cantidad menor al saldo.</p>
  {method==='Ambos'&&<div className="yape-surface payment-yape"><Field label="Monto pagado por Yape (S/)"><MoneyInput required value={yape} onChange={updateYape}/></Field><div className="summary-row"><span>Parte en efectivo del monto total</span><b>{money(Number.isFinite(c)?Math.max(0,c):0)}</b></div></div>}
  {method!=='Yape'&&<div className="tender-field"><Field label="Efectivo recibido del cliente (S/)"><MoneyInput required value={tender} onChange={value=>{setTender(value);setTenderEdited(true);}}/></Field><p className="input-description">Dinero físico entregado por el cliente, antes del vuelto.</p></div>}
  {method==='Yape'&&<div className="yape-surface yape-payment-total"><span>Pago por Yape</span><strong>{money(Number.isFinite(y)?y:0)}</strong></div>}
  <div className="payment-preview"><div><span>Vuelto para el cliente</span><strong>{money(Number.isFinite(received-c)?Math.max(0,received-c):0)}</strong></div><div><span>Cliente aún deberá</span><strong>{money(Number.isFinite(target)?Math.max(0,due-target):due)}</strong></div><div className="cash-after"><Wallet size={22}/><div><span>Efectivo en caja después del cobro</span><strong>{money(balance(day)+(Number.isFinite(c)?Math.max(0,c):0))}</strong><small>Caja actual {money(balance(day))} + cobro neto {money(Number.isFinite(c)?Math.max(0,c):0)}</small></div></div></div>
  {target>due&&<p className="payment-error" role="alert">El monto total supera el saldo. El dinero entregado para dar vuelto va en «Efectivo recibido».</p>}{c<0&&<p className="payment-error" role="alert">Yape no puede superar el monto total.</p>}{received<c&&<p className="payment-error" role="alert">Falta efectivo: el cliente debe entregar al menos {money(c)}.</p>}
  <p className="helper">El vuelto se descuenta del efectivo recibido. Yape se registra por separado.</p>
 </div><div className="dialog-foot"><button className="primary full" disabled={busy||!valid}>{busy?'Guardando…':'Confirmar cobro · '+money(Number.isFinite(target)?target:0)}</button></div></form>;
}

export function CloseForm({day,busy,onSave}:{day:Day;busy:boolean;onSave:Save}){
 const [step,setStep]=useState('review'),[counted,setCounted]=useState(''),[countedYape,setCountedYape]=useState('');const report=dayAccounting(day);
 const outstanding=day.orders.filter(o=>!o.cancelled&&(!served(o)||paid(o)<total(o)));
 const ratio=report.collected?report.cashSales/report.collected*100:0;
 return <form onSubmit={e=>{e.preventDefault();if(step==='count'&&!outstanding.length)void onSave({type:'close',counted:cents(counted),countedYape:cents(countedYape)})}}><div className="dialog-body close-dashboard">
  <div className="close-step"><span className={step==='review'?'current':''}>1. Revisar ingresos</span><span className={step==='count'?'current':''}>2. Contar y cerrar</span></div>
  <div className="close-metrics"><div><span>Efectivo de ventas</span><strong>{money(report.cashSales)}</strong></div><div className="yape-surface"><span>Yape recibido</span><strong>{money(report.yape)}</strong></div><div className="expected"><span>Efectivo esperado en caja</span><strong>{money(report.expected)}</strong></div></div>
  {step==='review'?<><section className="close-section"><h3>Ingresos por categoría</h3><div className="category-ledger"><div className="category-row head"><span>Categoría</span><span>Ventas</span><span>Efectivo</span><span>Yape</span></div>{report.breakdown.map(r=><div className="category-row" key={r.category}><span><strong>{r.category}</strong><small>{r.qty} unidades</small></span><span>{money(r.sales)}</span><b>{money(r.cash)}</b><b>{money(r.yape)}</b></div>)}<div className="category-row total"><b>Total</b><b>{money(report.sales)}</b><b>{money(report.cashSales)}</b><b>{money(report.yape)}</b></div></div><p className="helper small-help">En pedidos con varias categorías, los cobros se distribuyen según el valor de los productos.</p></section>
  <section className="close-section"><h3>Cobros del día</h3><div className="payment-share"><span className="cash-share" style={{width:ratio+'%'}}/><span className="yape-share" style={{width:(report.collected?100-ratio:0)+'%'}}/></div><div className="share-labels"><span><i/>Efectivo {money(report.cashSales)}</span><span><i/>Yape {money(report.yape)}</span></div></section>
  <section className="close-section"><h3>Así queda tu caja</h3>{[['Efectivo inicial',report.opening],['Cobros en efectivo (netos)',report.cashSales],['Otros ingresos de caja',report.movementsIn],['Salidas de caja',-report.movementsOut]].map(([label,value])=><div className="summary-row" key={label}><span>{label}</span><b>{money(value as number)}</b></div>)}<div className="summary-total"><span>Total de efectivo esperado</span><strong>{money(report.expected)}</strong></div><p className="helper small-help">Se entregaron {money(report.change)} en vueltos. Ya están descontados de los cobros netos.</p></section></>:<><div className="count-instruction"><Wallet size={24}/><h3>Cuenta el dinero físico de la caja</h3><p>Incluye la caja inicial y los cobros en efectivo. El saldo de Yape se revisa por separado.</p></div><Field label="Efectivo contado en caja (S/)"><MoneyInput autoFocus required value={counted} onChange={setCounted} placeholder="0.00"/></Field>{counted!==''&&<div className={'count-difference '+(cents(counted)===report.expected?'balanced':'')}><span>Diferencia con lo esperado</span><strong>{money(cents(counted)-report.expected)}</strong></div>}<section className="yape-surface counted-yape"><h3>Conteo manual de Yape</h3><p>Revisa los cobros de esta jornada en Yape e ingresa el total comprobado.</p><Field label="Yape contado / comprobado (S/)"><MoneyInput required value={countedYape} onChange={setCountedYape} placeholder="0.00"/></Field><div className="summary-row"><span>Yape esperado de pedidos</span><b>{money(report.yape)}</b></div>{countedYape!==''&&<div className="count-difference"><span>Diferencia de Yape</span><strong>{money(cents(countedYape)-report.yape)}</strong></div>}</section><p className="helper">El cierre guardará ambos conteos y sus diferencias. El PDF mostrará solo los pedidos.</p></>}
  {outstanding.length>0&&<div className="warning">Quedan {outstanding.length} pedidos por atender o cobrar: {outstanding.map(o=>'#'+o.number+' · Mesa '+o.table).join(', ')}. Completa esos pedidos antes de finalizar.</div>}
 </div><div className="dialog-foot">{step==='review'?<button className="primary full" type="button" disabled={outstanding.length>0} onClick={()=>setStep('count')}>Continuar con arqueo de caja</button>:<div className="dialog-actions"><button type="button" className="secondary" disabled={busy} onClick={()=>setStep('review')}>Volver al resumen</button><button className="primary" disabled={busy||outstanding.length>0||counted===''||countedYape===''}>{busy?'Cerrando…':'Confirmar cierre de jornada'}</button></div>}</div></form>;
}
