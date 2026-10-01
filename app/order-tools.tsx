'use client';
import {useState,useRef,useEffect,type ReactNode} from 'react';
import {Check,CheckCheck,ChefHat,Plus,Minus,X,Search,Wallet,Receipt,UtensilsCrossed} from 'lucide-react';
import {catalog,money,total,paid,served,balance,type Day,type Order,type Line} from '@/lib/model';
import {dayAccounting,stages,orderStage,stageLabel,stageColor,type Stage} from '@/lib/accounting';

const clock=(s:string)=>new Date(s).toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit',timeZone:'America/Lima'});
const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const cents=(s:string)=>Math.round(Number(s)*100);
const amount=(n:number)=>(n/100).toFixed(2);
function Field({label,children}:{label:string;children:ReactNode}){return <label className="field"><span>{label}</span>{children}</label>}
type Save=(action:any)=>Promise<boolean>;
export type OrderCallbacks={onOpen:(o:Order)=>void;onEdit:(o:Order)=>void;onPay:(o:Order)=>void;onServe:(o:Order,l:Line,qty:number)=>void;onServeAll:(o:Order)=>void};

export function ServiceLine({order,line,active,busy,onServe}:{order:Order;line:Line;active:boolean;busy:boolean;onServe:OrderCallbacks['onServe']}){
 const done=line.served===line.qty;
 return <div className={'service-line '+(done?'is-served':'')}>
  <label className="serve-check"><input type="checkbox" checked={done} disabled={!active||busy} onChange={()=>onServe(order,line,done?0:line.qty)} aria-label={`Marcar ${line.name} servido en pedido ${order.number}`}/><span><Check size={14}/></span></label>
  <div className="service-line-content"><strong>{line.qty} × {line.name}</strong>{line.notes&&<p className="dish-note">{line.notes}</p>}
   <div className="service-progress"><span>{line.served}/{line.qty} servidos</span>{active&&!done&&line.qty>1&&<button disabled={busy} onClick={()=>onServe(order,line,line.served+1)}><Plus size={12}/>Servir 1</button>}</div>
  </div>
 </div>;
}
export function ServiceCard({order:o,active,busy,...actions}:OrderCallbacks&{order:Order;active:boolean;busy:boolean}){
 const done=served(o),due=total(o)-paid(o),remaining=o.lines.reduce((n,l)=>n+l.qty-l.served,0);
 return <article className={'order-card service-card '+stageColor(o)}>
  <div className="order-top"><button className="order-title" onClick={()=>actions.onOpen(o)}><span className="table-mini">{String(o.table).padStart(2,'0')}</span><span><strong>Mesa {o.table}</strong><small>#{String(o.number).padStart(3,'0')} · {clock(o.at)}</small></span></button><b>{money(total(o))}</b>
   {active&&!done&&<button className="quick-serve" disabled={busy} onClick={()=>actions.onServeAll(o)} aria-label={`Marcar pedido ${o.number} atendido`} title="Marcar todo el pedido atendido"><CheckCheck size={20}/></button>}
  </div>
  <span className={'badge status-label '+stageColor(o)}>{stageLabel(o)}</span>
  <div className="service-items">{o.lines.map(l=><ServiceLine key={l.id} order={o} line={l} active={active} busy={busy} onServe={actions.onServe}/>)}</div>
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
 const products=catalog.filter(p=>p.days.includes(day.menu)&&normalize(p.name).includes(normalize(q))&&(cat==='Todos'||p.category===cat));
 const available=(id:string)=>day.stock[id]===null?null:day.stock[id]+(order?.lines.filter(l=>l.productId===id).reduce((n,l)=>n+l.qty,0)??0)-lines.filter(l=>l.productId===id).reduce((n,l)=>n+l.qty,0);
 const product=catalog.find(p=>p.id===selected),qty=Number(quantity),remaining=product?available(product.id):null;
 const invalidQty=!Number.isInteger(qty)||qty<1||qty>1000||remaining!==null&&qty>remaining;
 function choose(id:string){setSelected(id);setQuantity('1');setDetail('');}
 function add(){if(!product||invalidQty)return;const note=detail.trim();const price=day.prices[product.id];const same=lines.find(l=>l.productId===product.id&&l.price===price&&(l.notes??'')===note&&l.qty+qty<=1000);setLines(same?lines.map(l=>l.id===same.id?{...l,qty:l.qty+qty}:l):[...lines,{id:crypto.randomUUID(),productId:product.id,name:product.name,category:product.category,qty,price,served:0,notes:note}]);setSelected(null);setQuantity('1');setDetail('');}
 const fullyPaid=!!order&&paid(order)===total(order);
 return <form onSubmit={e=>{e.preventDefault();void onSave({type:'order',orderId:order?.id,table,lines,notes})}}>
  <div className="dialog-body order-builder"><section className="product-browser"><span className="eyebrow">01 · ELIGE LOS PRODUCTOS</span><Field label="Mesa"><select value={table} onChange={e=>setTable(Number(e.target.value))}>{Array.from({length:13},(_,i)=><option key={i} value={i+1}>Mesa {i+1}</option>)}</select></Field>
   <div className="filters compact">{['Todos','Platos','Bebidas','Adicionales'].map(c=><button type="button" key={c} className={cat===c?'active':''} onClick={()=>setCat(c)}>{c}</button>)}</div>
   <label className="search full"><Search size={18}/><input autoFocus placeholder="Busca un plato, bebida o adicional" value={q} onChange={e=>setQ(e.target.value)}/></label>
   <div className="picker product-picker">{products.map(p=><button type="button" key={p.id} className={selected===p.id?'chosen-product':''} disabled={available(p.id)!==null&&available(p.id)!<=0} onClick={()=>choose(p.id)} aria-label={`Seleccionar ${p.name}`}><span><strong>{p.name}</strong><small>{available(p.id)===null?p.category:available(p.id)===0?'Agotado':available(p.id)+' disponibles'}</small></span><b>{money(day.prices[p.id])}</b><Plus size={17}/></button>)}{!products.length&&<p className="helper">No se encontraron productos.</p>}</div>
   {product&&<section ref={configRef} className="product-config"><div className="product-config-head"><div><small>{product.category}</small><h3>{product.name}</h3></div><button type="button" className="icon-button" onClick={()=>setSelected(null)} aria-label="Cerrar selección de producto"><X size={18}/></button></div><div className="product-config-quantity"><Field label="Cantidad a agregar"><div className="quantity-stepper"><button type="button" disabled={qty<=1||!Number.isFinite(qty)} aria-label="Reducir cantidad" onClick={()=>setQuantity(String(qty-1))}><Minus size={17}/></button><input aria-label="Cantidad a agregar" type="number" required min="1" max={remaining===null?1000:Math.min(remaining,1000)} step="1" value={quantity} onChange={e=>setQuantity(e.target.value)}/><button type="button" disabled={invalidQty||remaining!==null&&qty>=remaining||qty>=1000} aria-label="Aumentar cantidad" onClick={()=>setQuantity(String(qty+1))}><Plus size={17}/></button></div></Field><div><small>Precio unitario</small><strong>{money(day.prices[product.id])}</strong></div></div><Field label="Detalle para este plato o bebida"><textarea value={detail} maxLength={1000} rows={2} placeholder="Ej. Sin ají, sin ensalada, sin hielo…" onChange={e=>setDetail(e.target.value)}/></Field><button type="button" className="primary full" onClick={add} disabled={invalidQty}><Plus size={17}/>Agregar {invalidQty?'producto':`${qty} · ${money(qty*day.prices[product.id])}`}</button>{invalidQty&&<p className="input-hint">Ingresa una cantidad válida dentro de lo disponible.</p>}</section>}
   </section><section className="order-draft"><span className="eyebrow">02 · REVISA EL PEDIDO</span><div className="draft-heading"><h3>Productos del pedido</h3><span>{lines.reduce((n,l)=>n+l.qty,0)} unidades</span></div>
   {fullyPaid&&<p className="helper">El pago anterior se conserva. Los productos nuevos tendrán su propio saldo pendiente.</p>}
   {lines.length?lines.map((l,i)=>{const old=order?.lines.find(x=>x.id===l.id);return <div className="draft-line" key={l.id}><div className="draft-line-title"><strong>{l.qty} × {l.name}</strong><button className="icon-button" type="button" disabled={l.served>0||fullyPaid&&!!old} aria-label={`Quitar ${l.name} de línea ${i+1}`} onClick={()=>setLines(lines.filter(x=>x.id!==l.id))}><X size={17}/></button></div><div className="line-controls"><Field label={`Cantidad · ${l.name} · ${i+1}`}><input type="number" required min={Math.max(l.served,fullyPaid&&old?old.qty:1)} max="1000" step="1" value={l.qty} onChange={e=>setLines(lines.map(x=>x.id===l.id?{...x,qty:Number(e.target.value)}:x))}/></Field><Field label={`Precio unitario S/ · ${i+1}`}><input type="number" required min="0" step="0.01" disabled={fullyPaid&&!!old} value={l.price/100} onChange={e=>setLines(lines.map(x=>x.id===l.id?{...x,price:cents(e.target.value)}:x))}/></Field><b>{money(l.price*l.qty)}</b></div><Field label={`Detalle · ${l.name} · ${i+1}`}><input maxLength={1000} value={l.notes??''} placeholder="Detalle de este producto" onChange={e=>setLines(lines.map(x=>x.id===l.id?{...x,notes:e.target.value}:x))}/></Field>{l.served>0&&<small className="served-caption">{l.served} unidades ya servidas</small>}</div>}):<p className="helper">Selecciona un producto, elige su cantidad y agrégalo.</p>}
   <Field label="Detalle general del pedido"><textarea value={notes} maxLength={2000} onChange={e=>setNotes(e.target.value)} placeholder="Indicaciones para toda la mesa…" rows={2}/></Field></section>
  </div>
  <div className="dialog-foot split"><div><small>Total del pedido</small><strong>{money(lines.reduce((n,l)=>n+l.qty*l.price,0))}</strong>{order&&paid(order)>0&&<small>Abonado {money(paid(order))}</small>}</div><button className="primary" disabled={busy||!lines.length||!!selected}>{busy?'Guardando…':order?'Guardar cambios':'Registrar pedido'}</button></div>
 </form>;
}

export function OrderDetail({order:o,active,busy,onCancel,...actions}:OrderCallbacks&{order:Order;active:boolean;busy:boolean;onCancel:()=>void}){
 const due=total(o)-paid(o);
 return <div className="dialog-body"><div className="detail-meta"><b>Mesa {o.table}</b><span>{clock(o.at)}</span></div><span className={'badge status-label '+stageColor(o)}>{stageLabel(o)}</span>
  {active&&!served(o)&&<button className="serve-all-banner" disabled={busy} onClick={()=>actions.onServeAll(o)}><CheckCheck size={20}/><span><strong>Marcar todo el pedido atendido</strong><small>Todos los productos ya fueron servidos</small></span></button>}
  <div className="detail-service-items">{o.lines.map(l=><div className="detail-service-row" key={l.id}><ServiceLine order={o} line={l} active={active} busy={busy} onServe={actions.onServe}/><span>{money(l.price*l.qty)}</span></div>)}</div>
  {o.notes&&<div className="notes-box"><strong>Detalle general</strong><p>{o.notes}</p></div>}
  <div className="summary-row"><span>Total del pedido</span><b>{money(total(o))}</b></div><div className="summary-row"><span>Pagado por el cliente</span><b>{money(paid(o))}</b></div><div className="summary-total"><span>Cliente aún debe</span><strong>{money(due)}</strong></div>
  {o.payments.map(p=><div className="payment-history" key={p.id}><span>{clock(p.at)} · Efectivo {money(p.cash)} · Yape {money(p.yape)}{p.change>0?' · Vuelto '+money(p.change):''}</span>{p.cashAfter!==undefined&&<small>Caja después de este cobro: {money(p.cashAfter)}</small>}</div>)}
  {active&&<div className="dialog-actions"><button className="secondary" onClick={()=>actions.onEdit(o)}><Plus size={16}/>Agregar platos / editar</button>{due>0&&<button className="primary" onClick={()=>actions.onPay(o)}><Wallet size={18}/>Cobrar {money(due)}</button>}{paid(o)===0&&o.lines.every(l=>l.served===0)&&<button className="danger-button" disabled={busy} onClick={onCancel}>Anular pedido</button>}</div>}
 </div>;
}

export function PaymentForm({order,day,busy,onSave}:{order:Order;day:Day;busy:boolean;onSave:Save}){
 const due=total(order)-paid(order);
 const [method,setMethod]=useState('Efectivo'),[cash,setCash]=useState(amount(due)),[yape,setYape]=useState('0.00'),[tender,setTender]=useState(amount(due)),[tenderEdited,setTenderEdited]=useState(false);
 const c=method==='Yape'?0:cents(cash),y=method==='Efectivo'?0:cents(yape),received=method==='Yape'?0:cents(tender);
 const valid=[c,y,received].every(n=>Number.isSafeInteger(n)&&n>=0)&&c+y>0&&c+y<=due&&received>=c;
 function choose(m:string){setMethod(m);setCash(m==='Yape'?'0.00':amount(due));setYape(m==='Yape'?amount(due):'0.00');setTender(m==='Yape'?'0.00':amount(due));setTenderEdited(false)}
 return <form onSubmit={e=>{e.preventDefault();if(valid)void onSave({type:'payment',orderId:order.id,cash:c,yape:y,tender:received})}}><div className="dialog-body">
  <div className="summary-total"><span>Mesa {order.table} · Cliente debe</span><strong>{money(due)}</strong></div>
  {!served(order)&&<p className="prepaid-note"><ChefHat size={17}/>Si cobras todo ahora, el pedido pasará a Pagados · por atender.</p>}
  <div className="day-options">{['Efectivo','Yape','Ambos'].map(m=><button type="button" className={method===m?'chosen':''} key={m} onClick={()=>choose(m)}>{m}</button>)}</div>
  {method!=='Yape'&&<Field label="Monto del pedido pagado en efectivo (S/)"><input type="number" min="0" step="0.01" max={due/100} required value={cash} onChange={e=>{setCash(e.target.value);if(!tenderEdited)setTender(e.target.value)}}/></Field>}
  {method!=='Efectivo'&&<Field label="Monto pagado por Yape (S/)"><input type="number" min="0" step="0.01" max={due/100} required value={yape} onChange={e=>setYape(e.target.value)}/></Field>}
  {method!=='Yape'&&<Field label="Efectivo recibido del cliente (S/)"><input type="number" min={Number.isFinite(c)?c/100:0} step="0.01" required value={tender} onChange={e=>{setTender(e.target.value);setTenderEdited(true)}}/></Field>}
  <div className="payment-preview"><div><span>Vuelto para el cliente</span><strong>{money(Number.isFinite(received-c)?Math.max(0,received-c):0)}</strong></div><div><span>Cliente aún deberá</span><strong>{money(Number.isFinite(c+y)?due-c-y:due)}</strong></div><div className="cash-after"><Wallet size={22}/><div><span>Efectivo en caja después del cobro</span><strong>{money(balance(day)+(Number.isFinite(c)?c:0))}</strong><small>Caja actual {money(balance(day))} + cobro neto {money(Number.isFinite(c)?c:0)}</small></div></div></div>
  <p className="helper">El vuelto ya se descuenta del efectivo recibido. Yape se registra por separado y no aumenta el dinero físico de la caja.</p>
 </div><div className="dialog-foot"><button className="primary full" disabled={busy||!valid}>{busy?'Guardando…':'Confirmar cobro · '+money(Number.isFinite(c+y)?c+y:0)}</button></div></form>;
}

export function CloseForm({day,busy,onSave}:{day:Day;busy:boolean;onSave:Save}){
 const [step,setStep]=useState('review'),[counted,setCounted]=useState('');const report=dayAccounting(day);
 const outstanding=day.orders.filter(o=>!o.cancelled&&(!served(o)||paid(o)<total(o)));
 const ratio=report.collected?report.cashSales/report.collected*100:0;
 return <form onSubmit={e=>{e.preventDefault();if(step==='count'&&!outstanding.length)void onSave({type:'close',counted:cents(counted)})}}><div className="dialog-body close-dashboard">
  <div className="close-step"><span className={step==='review'?'current':''}>1. Revisar ingresos</span><span className={step==='count'?'current':''}>2. Contar y cerrar</span></div>
  <div className="close-metrics"><div><span>Efectivo de ventas</span><strong>{money(report.cashSales)}</strong></div><div><span>Yape recibido</span><strong>{money(report.yape)}</strong></div><div className="expected"><span>Efectivo esperado en caja</span><strong>{money(report.expected)}</strong></div></div>
  {step==='review'?<><section className="close-section"><h3>Ingresos por categoría</h3><div className="category-ledger"><div className="category-row head"><span>Categoría</span><span>Ventas</span><span>Efectivo</span><span>Yape</span></div>{report.breakdown.map(r=><div className="category-row" key={r.category}><span><strong>{r.category}</strong><small>{r.qty} unidades</small></span><span>{money(r.sales)}</span><b>{money(r.cash)}</b><b>{money(r.yape)}</b></div>)}<div className="category-row total"><b>Total</b><b>{money(report.sales)}</b><b>{money(report.cashSales)}</b><b>{money(report.yape)}</b></div></div><p className="helper small-help">En pedidos con varias categorías, los cobros se distribuyen según el valor de los productos.</p></section>
  <section className="close-section"><h3>Cobros del día</h3><div className="payment-share"><span className="cash-share" style={{width:ratio+'%'}}/><span className="yape-share" style={{width:(report.collected?100-ratio:0)+'%'}}/></div><div className="share-labels"><span><i/>Efectivo {money(report.cashSales)}</span><span><i/>Yape {money(report.yape)}</span></div></section>
  <section className="close-section"><h3>Así queda tu caja</h3>{[['Efectivo inicial',report.opening],['Cobros en efectivo (netos)',report.cashSales],['Otros ingresos de caja',report.movementsIn],['Salidas de caja',-report.movementsOut]].map(([label,value])=><div className="summary-row" key={label}><span>{label}</span><b>{money(value as number)}</b></div>)}<div className="summary-total"><span>Total de efectivo esperado</span><strong>{money(report.expected)}</strong></div><p className="helper small-help">Se entregaron {money(report.change)} en vueltos. Ya están descontados de los cobros netos.</p></section></>:<><div className="count-instruction"><Wallet size={24}/><h3>Cuenta el dinero físico de la caja</h3><p>Incluye la caja inicial y los cobros en efectivo. El saldo de Yape se revisa por separado.</p></div><Field label="Efectivo contado en caja (S/)"><input autoFocus type="number" required min="0" step="0.01" value={counted} onChange={e=>setCounted(e.target.value)} placeholder="0.00"/></Field>{counted!==''&&<div className={'count-difference '+(cents(counted)===report.expected?'balanced':'')}><span>Diferencia con lo esperado</span><strong>{money(cents(counted)-report.expected)}</strong></div>}<p className="helper">El cierre conservará este resumen, los pagos y los movimientos de la jornada.</p></>}
  {outstanding.length>0&&<div className="warning">Quedan {outstanding.length} pedidos por atender o cobrar: {outstanding.map(o=>'#'+o.number+' · Mesa '+o.table).join(', ')}. Completa esos pedidos antes de finalizar.</div>}
 </div><div className="dialog-foot">{step==='review'?<button className="primary full" type="button" disabled={outstanding.length>0} onClick={()=>setStep('count')}>Continuar con arqueo de caja</button>:<div className="dialog-actions"><button type="button" className="secondary" disabled={busy} onClick={()=>setStep('review')}>Volver al resumen</button><button className="primary" disabled={busy||outstanding.length>0||counted===''}>{busy?'Cerrando…':'Confirmar cierre de jornada'}</button></div>}</div></form>;
}
