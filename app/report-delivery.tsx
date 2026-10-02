'use client';
import {useEffect,useRef,useState} from 'react';
import {Download,FileText,Share2,MessageCircle,CheckCheck,RefreshCw,X,ExternalLink} from 'lucide-react';
import {money,type Day} from '@/lib/model';
import {dayAccounting} from '@/lib/accounting';
import {reportFilename,reportMessage,reportRecipients,whatsappLink} from '@/lib/report-sharing';

export function ReportDialog({day,onClose,justClosed=false}:{day:Day;onClose:()=>void;justClosed?:boolean}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{ref.current?.showModal();return()=>ref.current?.close();},[]);
 return <dialog ref={ref} className="delivery-dialog" aria-label="Reporte de cierre" onCancel={onClose}>
  <header className="dialog-head"><div><span className="eyebrow">LUCIANOS / REPORTE DE CIERRE</span><h2>{justClosed?'Jornada cerrada y guardada.':'Reporte de la jornada.'}</h2></div><button className="icon-button" aria-label="Cerrar reporte" onClick={onClose}><X size={20}/></button></header>
  <ReportDelivery day={day} justClosed={justClosed}/>
  <div className="dialog-foot"><button className="secondary full" onClick={onClose}>{justClosed?'Listo · volver al salón':'Volver al historial'}</button></div>
 </dialog>;
}

function ReportDelivery({day,justClosed}:{day:Day;justClosed:boolean}){
 const [file,setFile]=useState<File|null>(null),[url,setUrl]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(true),[attempt,setAttempt]=useState(0),[warnings,setWarnings]=useState<string[]>([]),[pages,setPages]=useState(0),[canShare,setCanShare]=useState(false),[sharing,setSharing]=useState(false),[notice,setNotice]=useState('');
 const a=dayAccounting(day),difference=(day.counted??0)-a.expected;
 useEffect(()=>{
  const controller=new AbortController();let disposed=false;setBusy(true);setError('');setFile(null);
  void (async()=>{
   try{
    const response=await fetch('/api/report?dayId='+encodeURIComponent(day.id),{cache:'no-store',signal:controller.signal});
    if(!response.ok){const data=await response.json() as {error?:string};throw new Error(data.error??'No se pudo preparar el reporte.');}
    if(!response.headers.get('content-type')?.includes('application/pdf'))throw new Error('La sesión no está disponible. Vuelve a iniciar sesión y abre el reporte desde Historial.');
    const blob=await response.blob();if(disposed)return;
    setFile(new File([blob],reportFilename(day),{type:'application/pdf'}));setPages(Number(response.headers.get('X-Report-Pages')??0));
    setWarnings(JSON.parse(decodeURIComponent(response.headers.get('X-Report-Warnings')??'%5B%5D')));
   }catch(e){if(!disposed&&(e as Error).name!=='AbortError')setError((e as Error).message);}
   finally{if(!disposed)setBusy(false);}
  })();return()=>{disposed=true;controller.abort();};
 },[day.id,attempt]);
 useEffect(()=>{
  if(!file){setUrl('');setCanShare(false);return;}
  const objectURL=URL.createObjectURL(file);setUrl(objectURL);
  setCanShare(typeof navigator.share==='function'&&typeof navigator.canShare==='function'&&navigator.canShare({files:[file]}));
  return()=>URL.revokeObjectURL(objectURL);
 },[file]);
 async function share(){
  if(!file||sharing)return;setSharing(true);setNotice('');
  try{await navigator.share({files:[file],title:'Lucianos · reporte de cierre',text:reportMessage(day)});setNotice('Archivo compartido con la aplicación elegida. Revisa en WhatsApp los destinatarios y confirma el envío.');}
  catch(e){if((e as Error).name!=='AbortError')setNotice('Este dispositivo no pudo compartir el archivo. Descarga el PDF y adjúntalo en los chats de abajo.');}
  finally{setSharing(false);}
 }
 return <div className="dialog-body report-delivery">
  <div className="delivery-saved"><CheckCheck size={23}/><div><strong>{day.menu} · {new Date(day.date+'T12:00:00-05:00').toLocaleDateString('es-PE',{timeZone:'America/Lima'})}</strong><p>{justClosed?'El salón está listo para la siguiente jornada.':'Arqueo y pedidos guardados en Historial.'} Puedes recuperar este reporte cuando lo necesites.</p></div></div>
  <div className="delivery-totals"><div><span>Efectivo de ventas</span><strong>{money(a.cashSales)}</strong></div><div><span>Yape recibido</span><strong>{money(a.yape)}</strong></div><div><span>Caja esperada</span><strong>{money(a.expected)}</strong></div><div><span>Caja contada</span><strong>{money(day.counted??0)}</strong></div></div>
  <p className={'delivery-difference '+(difference!==0?'has-difference':'')}>{difference===0?'Caja cuadrada. Diferencia: ':difference>0?'Sobrante de caja: ':'Faltante de caja: '}<b>{money(Math.abs(difference))}</b><span>Incluye fondo inicial y movimientos. Yape se muestra aparte.</span></p>
  <section className="delivery-document"><div className="delivery-doc-heading"><FileText size={26}/><div><h3>Los pedidos del día, en PDF</h3><p>{busy?'Preparando desde los registros guardados…':file?`${pages} página${pages===1?'':'s'} · cantidades, precios, detalles y totales`:'El cierre está guardado. Puedes reintentar el PDF.'}</p></div></div>
   {error&&<div className="error-banner" role="alert">{error}<button onClick={()=>setAttempt(n=>n+1)}>Reintentar PDF</button></div>}
   {busy?<p className="delivery-loading" role="status"><RefreshCw size={17}/>Generando reporte…</p>:file&&url&&<>
    <div className="delivery-actions"><a className="primary" href={url} download={file.name} onClick={()=>setNotice('PDF listo para descargar. Para enviarlo, adjunta el archivo en cada chat de WhatsApp.')}><Download size={18}/>Descargar PDF</a>{canShare&&<button className="secondary" disabled={sharing} onClick={()=>void share()}><Share2 size={18}/>{sharing?'Compartiendo…':'Compartir archivo'}</button>}</div>
    <details className="delivery-preview"><summary>Vista previa del reporte</summary><p>Un pedido por página, en orden de registro. Los anulados aparecen identificados.</p><iframe title="Vista previa PDF de pedidos" src={url} /><a href={url} target="_blank" rel="noopener noreferrer" className="text-button"><ExternalLink size={15}/>Abrir PDF en otra pestaña</a></details>
   </>}
   {warnings.map(w=><p className="delivery-warning" key={w}>{w}</p>)}
  </section>
  <section className="delivery-whatsapp"><span className="eyebrow">REVISIÓN DE LA PERSONA ENCARGADA</span><h3><MessageCircle size={22}/>Compartir por WhatsApp</h3><p>Descarga el PDF, abre cada chat y adjunta el archivo como documento. Si aparece <b>Compartir archivo</b>, elige WhatsApp y selecciona los destinatarios.</p>
   <div className="delivery-contacts">{reportRecipients.map(r=><div key={r.number}><div><span>Contacto de revisión</span><strong>{r.label}</strong></div>{file?<a className="secondary" href={whatsappLink(day,r.number)} target="_blank" rel="noopener noreferrer"><MessageCircle size={17}/>Abrir chat</a>:<button className="secondary" disabled>Abrir chat</button>}</div>)}</div>
   <p className="delivery-manual-note">El chat incluye un resumen escrito. El PDF debes adjuntarlo y confirmar su envío en WhatsApp.</p>
  </section>
  {notice&&<div className="delivery-notice" role="status">{notice}</div>}
  <details className="delivery-automatic"><summary>Sobre el envío automático</summary><p>Para enviar el PDF directamente a ambos números desde este sistema hace falta configurar una cuenta emisora de WhatsApp Business Platform y una plantilla aprobada. Los contactos de revisión pueden seguir usando sus cuentas personales. Por ahora el envío se confirma en tu WhatsApp.</p></details>
 </div>;
}
