import {PDFDocument, rgb, type PDFFont, type PDFPage} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {type Day, type Order, total, paid} from './model.ts';
import {stageLabel} from './accounting.ts';
const soles=(value:number)=>`S/ ${(value/100).toFixed(2)}`;
const date=(value:string)=>new Date(value+'T12:00:00-05:00').toLocaleDateString('es-PE',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'America/Lima'});
const clock=(value:string)=>new Date(value).toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit',timeZone:'America/Lima'});
const ink=rgb(.18,.13,.13),wine=rgb(.48,.12,.14),muted=rgb(.38,.34,.33),paper=rgb(.98,.96,.93),border=rgb(.85,.8,.76);
type Row={name:string[];note:string[];category:string;qty:number;price:number};
type Layout={rows:Row[];notes:string[];width:number;height:number;tall:boolean};

// Every order owns a page. Long orders use a larger sheet instead of losing notes
// or shrinking the text below its readable size. Normal orders remain A4.
export async function createOrderReport(day:Day,fontBytes:Uint8Array,boldFontBytes:Uint8Array=fontBytes){
 if(!day.closed||day.counted===null)throw new Error('Finaliza el arqueo y cierra la jornada antes de generar el reporte.');
 const doc=await PDFDocument.create();doc.registerFontkit(fontkit);
 const font=await doc.embedFont(fontBytes,{subset:true});
 const boldFont=await doc.embedFont(boldFontBytes,{subset:true});
 const glyphs=new Set(font.getCharacterSet());let unicodeCodes=false;
 const clean=(s:string)=>Array.from(s.normalize('NFC').replace(/\r\n?/g,'\n').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g,' ')).map(c=>{
  if(c==='\n'||glyphs.has(c.codePointAt(0)!))return c;
  unicodeCodes=true;return `[U+${c.codePointAt(0)!.toString(16).toUpperCase()}]`;
 }).join('');
 const wrap=(s:string,width:number,size:number)=>wrapText(clean(s),font,width,size);
 function layout(order:Order,width:number):Layout {
  const rows=order.lines.map(l=>({name:wrap(l.name,width-260,10),note:l.notes?wrap('Detalle: '+l.notes,width-260,9):[],category:l.category,qty:l.qty,price:l.price}));
  const notes=order.notes?wrap('Observaciones: '+order.notes,width-80,9):[];
  const body=rows.reduce((n,r)=>n+Math.max(34,r.name.length*14+r.note.length*12+22),0);
  const height=Math.max(841.89,body+notes.length*12+440);
  return {rows,notes,width,height,tall:height>842||width>596};
 }
 const orders=[...day.orders].sort((a,b)=>a.number-b.number);
 const layouts=orders.map(order=>{
  let result=layout(order,595.28);
  while(result.height>14000&&result.width<14000)result=layout(order,result.width*1.5);
  if(result.height>14400)throw new Error(`El pedido #${order.number} excede el tamaño admitido para una sola página.`);
  return result;
 });
 const warnings:string[]=[];
 if(layouts.some(l=>l.tall))warnings.push('Los pedidos extensos usan una página más larga que A4 para conservar todos sus detalles.');
 if(unicodeCodes)warnings.push('Los símbolos que no admite la fuente se muestran mediante su código Unicode, por ejemplo [U+1F600].');
 const created=new Date(day.closed);doc.setCreationDate(created);doc.setModificationDate(created);
 doc.setTitle(`Lucianos - pedidos ${day.date}`);doc.setAuthor('Lucianos Cocina Criolla');doc.setSubject('Pedidos de jornada cerrada');
 const face=(size:number,color:typeof ink)=>size>=11||color===wine?boldFont:font;
 const text=(page:PDFPage,s:string,x:number,y:number,size=10,color=ink)=>page.drawText(clean(s),{x,y,size,font:face(size,color),color});
 const right=(page:PDFPage,s:string,x:number,y:number,size=10,color=ink)=>text(page,s,x-face(size,color).widthOfTextAtSize(clean(s),size),y,size,color);
 function heading(page:PDFPage,width:number,height:number,index:number){
  page.drawRectangle({x:0,y:height-110,width,height:110,color:paper});
  page.drawRectangle({x:34,y:height-78,width:44,height:44,color:wine});text(page,'L',47,height-66,28,rgb(1,1,1));
  text(page,'LUCIANOS',93,height-52,21,wine);text(page,'COCINA CRIOLLA',94,height-72,9,muted);
  right(page,date(day.date),width-34,height-50,13,wine);right(page,`${day.menu} - jornada cerrada`,width-34,height-71,9,muted);
  text(page,'REPORTE DE PEDIDOS / REVISION DE CIERRE',34,height-99,8,muted);
  page.drawLine({start:{x:34,y:height-112},end:{x:width-34,y:height-112},thickness:1,color:border});
  text(page,`Cierre ${clock(day.closed!)} - ${day.id.slice(0,8)}`,34,25,8,muted);
  right(page,`Pagina ${index+1} de ${Math.max(orders.length,1)}`,width-34,25,8,muted);
 }
 if(!orders.length){
  const page=doc.addPage([595.28,841.89]);heading(page,595.28,841.89,0);
  text(page,'Jornada sin pedidos',34,680,22,wine);text(page,'No se registraron pedidos en esta jornada.',34,650,11,muted);
 }
 orders.forEach((order,index)=>{
  const l=layouts[index];const page=doc.addPage([l.width,l.height]);heading(page,l.width,l.height,index);
  let y=l.height-149;
  text(page,`PEDIDO #${String(order.number).padStart(3,'0')}`,34,y,23,wine);right(page,`MESA ${order.table}`,l.width-34,y,17,wine);
  y-=25;text(page,`${clock(order.at)}${order.takeaway?' - PARA LLEVAR':''} - ${order.cancelled?'ANULADO / EXCLUIDO DE LAS VENTAS':stageLabel(order)}`,34,y,10,order.cancelled?wine:muted);
  y-=34;page.drawRectangle({x:34,y:y-10,width:l.width-68,height:28,color:wine});
  text(page,'PRODUCTO / DETALLE',44,y,9,rgb(1,1,1));right(page,'CANT.',l.width-203,y,9,rgb(1,1,1));right(page,'PRECIO',l.width-119,y,9,rgb(1,1,1));right(page,'SUBTOTAL',l.width-44,y,9,rgb(1,1,1));y-=29;
  l.rows.forEach((row,i)=>{
   const height=Math.max(34,row.name.length*14+row.note.length*12+22);
   if(i%2===0)page.drawRectangle({x:34,y:y-height+14,width:l.width-68,height,color:paper});
   row.name.forEach((line,j)=>text(page,line,44,y-j*14,10));
   right(page,String(row.qty),l.width-203,y,12,wine);right(page,soles(row.price),l.width-119,y,10);right(page,soles(row.qty*row.price),l.width-44,y,11,wine);
   let ny=y-row.name.length*14;row.note.forEach(line=>{text(page,line,44,ny,9,muted);ny-=12;});text(page,row.category,44,ny-1,8,muted);
   y-=height;
  });
  y-=9;l.notes.forEach(line=>{text(page,line,34,y,9,muted);y-=12;});
  y-=26;
  text(page,`${order.lines.filter(x=>x.category==='Platos').reduce((n,x)=>n+x.qty,0)} platos / ${order.lines.reduce((n,x)=>n+x.qty,0)} productos en total`,34,y,10,muted);
  right(page,order.cancelled?'IMPORTE ANULADO':'TOTAL DEL PEDIDO',l.width-34,y+20,9,wine);right(page,soles(total(order)),l.width-34,y-3,22,wine);
  y-=36;const cash=order.payments.reduce((n,p)=>n+p.cash,0),yape=order.payments.reduce((n,p)=>n+p.yape,0),change=order.payments.reduce((n,p)=>n+p.change,0);
  text(page,`Efectivo: ${soles(cash)} / Yape: ${soles(yape)} / Vuelto: ${soles(change)}`,34,y,10);
  y-=18;text(page,order.cancelled?'Este pedido no suma a las ventas.':`Cobrado: ${soles(paid(order))} / Saldo pendiente: ${soles(total(order)-paid(order))}`,34,y,9,muted);

 });
 return {bytes:await doc.save(),pages:doc.getPageCount(),warnings};
}

function wrapText(s:string,font:PDFFont,width:number,size:number):string[]{
 const lines:string[]=[];
 for(const paragraph of s.split('\n')){
  let line='';
  for(const word of paragraph.split(/\s+/).filter(Boolean)){
   const candidate=line?line+' '+word:word;
   if(font.widthOfTextAtSize(candidate,size)<=width){line=candidate;continue;}
   if(line){lines.push(line);line='';}
   // Split long unbroken words too; notes can contain long references or URLs.
   for(const char of Array.from(word)){
    if(line&&font.widthOfTextAtSize(line+char,size)>width){lines.push(line);line='';}line+=char;
   }
  }
  lines.push(line);
 }
 return lines;
}
