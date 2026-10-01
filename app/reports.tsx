'use client';
import {useEffect,useRef,useState} from 'react';
import {CalendarDays,ChartNoAxesCombined,ClipboardList,History,RefreshCw,Wallet,X,ArrowLeft} from 'lucide-react';
import {money,total,paid,type Day,type Order} from '@/lib/model';
import {dayAccounting,stages,orderStage} from '@/lib/accounting';
import {businessReport,filterDays,reportOrders,cashLedger,type ReportFilters} from '@/lib/reports';
import {ServiceCard,OrderDetail,type OrderCallbacks} from './order-tools';

const dateLabel=(date:string)=>new Date(date+'T12:00:00-05:00').toLocaleDateString('es-PE',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'America/Lima'});
const clock=(at:string)=>new Date(at).toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit',timeZone:'America/Lima'});
const tabs=['Resumen','Pedidos','Caja','Jornadas'] as const;
type Tab=typeof tabs[number];
type Detail=(day:Day,order?:Order)=>void;

export default function Reports({initialTab,refresh}:{initialTab:Tab;refresh:number}){
 const [days,setDays]=useState<Day[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const [tab,setTab]=useState<Tab>(initialTab),[filters,setFilters]=useState<ReportFilters>({date:'',menu:'Todos',status:initialTab==='Jornadas'?'Cerradas':'Todas'});
 const [detail,setDetail]=useState<{day:Day;order?:Order}|null>(null);
 useEffect(()=>{
  let disposed=false;let controller:AbortController|undefined;
  async function read(){
   controller?.abort();controller=new AbortController();
   try{const r=await fetch('/api/history',{cache:'no-store',signal:controller.signal});const data=await r.json() as {days:Day[];error?:string};if(!r.ok)throw new Error(data.error);if(!disposed){setDays(data.days);setError('');}}
   catch(e){if(!disposed&&(e as Error).name!=='AbortError')setError((e as Error).message);}
   finally{if(!disposed)setLoading(false);}
  }
  void read();const interval=setInterval(()=>void read(),30000);
  return()=>{disposed=true;controller?.abort();clearInterval(interval);};
 },[refresh]);
 const selected=filterDays(days,filters);
 const onDetail:Detail=(day,order)=>setDetail({day,order});
 return <section className="reports">
  <div className="page-heading"><div><span className="eyebrow">CONSULTAS DEL NEGOCIO</span><h1>{initialTab==='Jornadas'?'Historial de jornadas.':'El negocio, a simple vista.'}</h1><p>Consulta fechas anteriores sin ocupar el salón de la jornada actual.</p></div></div>
  <div className="report-filters">
   <label className="field"><span><CalendarDays size={16}/>Fecha calendario</span><select aria-label="Filtrar por fecha calendario" value={filters.date} onChange={e=>setFilters({...filters,date:e.target.value})}><option value="">Todas las fechas</option>{days.map(day=><option key={day.id} value={day.date}>{dateLabel(day.date)}</option>)}</select></label>
   <label className="field"><span>Día de atención</span><select aria-label="Filtrar por día de atención" value={filters.menu} onChange={e=>setFilters({...filters,menu:e.target.value})}>{['Todos','Domingo','Lunes','Jueves'].map(menu=><option key={menu}>{menu}</option>)}</select></label>
   <label className="field"><span>Jornadas incluidas</span><select aria-label="Filtrar por estado de jornada" value={filters.status} onChange={e=>setFilters({...filters,status:e.target.value as ReportFilters['status']})}>{['Todas','Cerradas','Abiertas'].map(status=><option key={status}>{status}</option>)}</select></label>
   <button className="secondary" onClick={()=>setFilters({date:'',menu:'Todos',status:'Todas'})}>Ver todo el negocio</button>
  </div>
  <div className="report-scope" aria-live="polite"><strong>{filters.date?dateLabel(filters.date):filters.menu!=='Todos'?`Atención de ${filters.menu.toLowerCase()}`:'Todo el negocio'}{filters.date&&filters.menu!=='Todos'?` · ${filters.menu}`:''}</strong><span>{selected.length} jornada{selected.length===1?'':'s'} · {filters.status.toLowerCase()}</span></div>
  <div className="report-tabs" aria-label="Consultas del historial">{tabs.map((name,i)=>{const Icon=[ChartNoAxesCombined,ClipboardList,Wallet,History][i];return <button key={name} className={tab===name?'active':''} aria-pressed={tab===name} onClick={()=>setTab(name)}><Icon size={18}/>{name}</button>;})}</div>
  {error&&<div className="error-banner">{error}</div>}
  {loading?<div className="empty"><RefreshCw size={24}/><p>Cargando jornadas guardadas…</p></div>:!selected.length?<div className="empty"><CalendarDays size={28}/><h3>No hay jornadas con estos filtros</h3><p>Elige otra fecha, día de atención o consulta todo el negocio.</p></div>:<>
   {tab==='Resumen'&&<SummaryView days={selected}/>}
   {tab==='Pedidos'&&<OrdersView days={selected} onDetail={onDetail}/>}
   {tab==='Caja'&&<CashView days={selected}/>}
   {tab==='Jornadas'&&<JournalList days={selected} onDetail={onDetail}/>}
  </>}
  {detail&&<ArchiveDialog day={detail.day} initialOrder={detail.order} onClose={()=>setDetail(null)}/>}
 </section>;
}

function SummaryView({days}:{days:Day[]}){
 const r=businessReport(days),maxSales=Math.max(1,...days.map(d=>dayAccounting(d).sales));
 return <>
  <div className="stats report-stats"><div><span>Ventas registradas</span><strong>{money(r.sales)}</strong><small>{r.orders} pedido{r.orders===1?'':'s'} · {r.days} jornada{r.days===1?'':'s'}</small></div><div><span>Efectivo de ventas</span><strong>{money(r.cash)}</strong><small>Después de entregar vueltos</small></div><div><span>Yape recibido</span><strong>{money(r.yape)}</strong><small>Cobros digitales registrados</small></div><div><span>Total cobrado</span><strong>{money(r.collected)}</strong><small>Por cobrar {money(r.pending)}</small></div></div>
  <div className="report-summary-note">{r.closed} jornada{r.closed===1?' cerrada':'s cerradas'} · {r.open} abierta{r.open===1?' incluida':'s incluidas'}. Los fondos iniciales de caja y otros movimientos se muestran aparte de las ventas.</div>
  <div className="summary-grid">
   <section className="panel"><h2>Lo más vendido</h2><p>Cantidad vendida en las jornadas seleccionadas</p>{['Platos','Bebidas','Adicionales'].map(category=>{const products=r.products.filter(p=>p.category===category);return <div className="chart-group" key={category}><h3>{category}</h3>{products.length?products.map(p=><div className="chart-row" key={p.id}><div><span>{p.name}</span><b>{p.qty}</b></div><div className="track"><div style={{width:p.qty/products[0].qty*100+'%'}}/></div></div>):<p className="helper">Sin ventas en esta categoría.</p>}</div>;})}</section>
   <section className="panel"><h2>Ingresos por categoría</h2><div className="report-table-wrap"><table className="report-table"><thead><tr><th>Categoría</th><th>Ventas</th><th>Efectivo</th><th>Yape</th></tr></thead><tbody>{r.breakdown.map(b=><tr key={b.category}><th>{b.category}<small>{b.qty} unidades</small></th><td>{money(b.sales)}</td><td className="cash-text">{money(b.cash)}</td><td className="yape-text">{money(b.yape)}</td></tr>)}</tbody><tfoot><tr><th>Total</th><td>{money(r.sales)}</td><td>{money(r.cash)}</td><td>{money(r.yape)}</td></tr></tfoot></table></div><p className="helper small-help">En pedidos con varias categorías, los cobros se distribuyen según el valor de los productos.</p><h3 className="report-subheading">Cobros y movimientos</h3>{[['Por cobrar',r.pending],['Otros ingresos de caja',r.movementsIn],['Salidas de caja',r.movementsOut],['Vueltos entregados',r.change],['Diferencias de jornadas cerradas',r.closedVariance]].map(([name,value])=><div className="summary-row" key={name}><span>{name}</span><b>{money(value as number)}</b></div>)}<p className="helper small-help">Los vueltos ya están descontados del efectivo de ventas.</p></section>
  </div>
  <div className="summary-grid report-lower-grid">
   <section className="panel"><h2>Ventas por fecha</h2><p>Según la fecha calendario de cada jornada</p>{[...days].reverse().map(d=>{const a=dayAccounting(d);return <div className="chart-row" key={d.id}><div><span>{dateLabel(d.date)} · {d.menu}{!d.closed?' · abierta':''}</span><b>{money(a.sales)}</b></div><div className="track"><div style={{width:a.sales/maxSales*100+'%'}}/></div></div>;})}</section>
   <section className="panel"><h2>Por día de atención</h2><p>Domingo, lunes y jueves según la carta elegida</p><div className="report-table-wrap"><table className="report-table"><thead><tr><th>Atención</th><th>Jornadas</th><th>Ventas</th></tr></thead><tbody>{r.attendance.map(a=><tr key={a.menu}><th>{a.menu}</th><td>{a.days}</td><td>{money(a.sales)}</td></tr>)}</tbody></table></div></section>
  </div>
 </>;
}

function OrdersView({days,onDetail}:{days:Day[];onDetail:Detail}){
 const [status,setStatus]=useState('Todos'),[query,setQuery]=useState('');
 const records=reportOrders(days).filter(({order:o})=>(status==='Todos'||status==='Anulados'?status==='Todos'||o.cancelled:!o.cancelled&&orderStage(o)===status)&&(!query||String(o.table)===query||String(o.number).includes(query)));
 return <><div className="filters archive-order-filters">{['Todos',...stages,'Anulados'].map(s=><button className={status===s?'active':''} onClick={()=>setStatus(s)} key={s}>{s}</button>)}<label className="search"><input aria-label="Buscar en pedidos históricos" placeholder="Mesa o número" value={query} onChange={e=>setQuery(e.target.value)}/></label></div><p className="helper">Consulta de pedidos guardados. Los cambios de atención y cobro se realizan en la jornada abierta.</p>{records.length?<div className="order-grid service-grid archive-orders">{records.map(({day,order})=><div key={order.id}><div className="archive-order-date">{dateLabel(day.date)} · {day.menu} · {day.closed?'Cerrada':'Abierta'}</div>{order.cancelled?<article className="order-card cancelled-card"><strong>Pedido #{order.number} · Mesa {order.table}</strong><span className="badge">Anulado</span><p>Importe original {money(total(order))}. Excluido de las ventas.</p><button className="text-button" onClick={()=>onDetail(day,order)}>Ver detalle</button></article>:<ServiceCard order={order} active={false} busy={false} onOpen={()=>onDetail(day,order)} onEdit={()=>{}} onPay={()=>{}} onServe={()=>{}} onServeAll={()=>{}}/>}</div>)}</div>:<div className="empty"><h3>No hay pedidos con estos filtros</h3></div>}</>;
}

function CashView({days}:{days:Day[]}){
 const r=businessReport(days),rows=cashLedger(days);
 return <>
  <div className="stats report-stats"><div><span>Efectivo de ventas</span><strong>{money(r.cash)}</strong><small>No incluye aperturas</small></div><div><span>Salidas de caja</span><strong>{money(r.movementsOut)}</strong><small>Retiros y gastos registrados</small></div><div><span>Yape recibido</span><strong>{money(r.yape)}</strong><small>Separado del efectivo</small></div><div><span>Otros ingresos</span><strong>{money(r.movementsIn)}</strong><small>Movimientos adicionales</small></div></div>
  {days.length===1&&<div className="archive-cash-balance"><Wallet size={22}/><span>Efectivo esperado · {dateLabel(days[0].date)}</span><strong>{money(dayAccounting(days[0]).expected)}</strong></div>}
  <div className="section-heading"><h2>Registro de caja y Yape</h2></div><p className="helper">Las aperturas aparecen como fondos iniciales, no como ventas. El efectivo esperado y contado se consulta por jornada en la pestaña Jornadas.</p>
  <div className="report-table-wrap ledger-report"><table className="report-table"><thead><tr><th>Fecha / atención</th><th>Motivo</th><th>Recibido</th><th>Vuelto</th><th>Efectivo neto</th><th>Yape</th></tr></thead><tbody>{rows.map(row=><tr key={row.id}><th>{dateLabel(row.date)}<small>{row.menu} · {clock(row.at)}</small></th><td>{row.reason}</td><td>{money(row.tender)}</td><td>{money(row.change)}</td><td className={row.cash<0?'negative':'cash-text'}>{money(row.cash)}</td><td className="yape-text">{money(row.yape)}</td></tr>)}</tbody></table></div>
 </>;
}

function JournalList({days,onDetail}:{days:Day[];onDetail:Detail}){
 return <div className="journal-list">{days.map(day=>{const r=dayAccounting(day);return <article className="journal-card" key={day.id}><div className="journal-heading"><div><span className="eyebrow">{day.menu}</span><h2>{dateLabel(day.date)}</h2></div><span className={'badge '+(day.closed?'settled':'amber')}>{day.closed?'Cerrada':'En servicio'}</span></div><div className="journal-metrics"><div><span>Ventas</span><b>{money(r.sales)}</b></div><div><span>Efectivo de ventas</span><b>{money(r.cashSales)}</b></div><div><span>Yape</span><b>{money(r.yape)}</b></div><div><span>Caja esperada</span><b>{money(r.expected)}</b></div><div><span>Caja contada</span><b>{day.counted!==null?money(day.counted):'Sin cierre'}</b></div><div><span>Diferencia de cierre</span><b>{day.counted!==null?money(day.counted-r.expected):'—'}</b></div></div><button className="secondary full" onClick={()=>onDetail(day)} aria-label={`Ver jornada del ${dateLabel(day.date)}`}>Ver jornada y sus registros</button></article>;})}</div>;
}

function ArchiveDialog({day,initialOrder,onClose}:{day:Day;initialOrder?:Order;onClose:()=>void}){
 const ref=useRef<HTMLDialogElement>(null);const [tab,setTab]=useState<Tab>('Resumen'),[order,setOrder]=useState<Order|undefined>(initialOrder);
 useEffect(()=>{ref.current?.showModal();return()=>ref.current?.close();},[]);
 const actions:OrderCallbacks={onOpen:setOrder,onEdit:()=>{},onPay:()=>{},onServe:()=>{},onServeAll:()=>{}};
 return <dialog ref={ref} className="archive-dialog" aria-label={`Consulta de jornada ${dateLabel(day.date)}`} onCancel={onClose}>
  <header className="dialog-head"><div><h2>{order?`Pedido #${order.number} · Mesa ${order.table}`:`Jornada del ${dateLabel(day.date)}`}</h2><p className="helper compact-help">{day.menu} · {day.closed?'Cerrada':'En servicio'} · Consulta de registros</p></div><button className="icon-button" aria-label="Cerrar consulta" onClick={onClose}><X size={20}/></button></header>
  <div className="dialog-body">{order?<><button className="text-button archive-back" onClick={()=>setOrder(undefined)}><ArrowLeft size={16}/>Volver a jornada</button>{order.cancelled&&<div className="warning">Pedido anulado. No se incluye en las ventas.</div>}<OrderDetail order={order} active={false} busy={false} {...actions} onCancel={()=>{}}/></>:<><div className="report-tabs">{['Resumen','Pedidos','Caja'].map(name=><button key={name} aria-pressed={tab===name} className={tab===name?'active':''} onClick={()=>setTab(name as Tab)}>{name}</button>)}</div>{tab==='Resumen'&&<SummaryView days={[day]}/>} {tab==='Pedidos'&&<OrdersView days={[day]} onDetail={(_,o)=>setOrder(o)}/>} {tab==='Caja'&&<CashView days={[day]}/>}</>}</div>
 </dialog>;
}
