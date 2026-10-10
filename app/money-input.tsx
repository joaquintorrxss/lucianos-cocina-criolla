'use client';
import {useEffect,useRef,type InputHTMLAttributes} from 'react';

type Props=Omit<InputHTMLAttributes<HTMLInputElement>,'type'|'value'|'onChange'|'step'> & {value:string;onChange:(value:string)=>void};

// Text + decimal keyboard avoids the browser's wheel/touchpad number stepping.
// Keep required, decimal precision and bounds validation for every money field.
export function MoneyInput({value,onChange,min='0',max,...props}:Props){
 const input=useRef<HTMLInputElement>(null);
 useEffect(()=>{
  const number=Number(value);
  const valid=value===''||/^\d+(?:\.\d{1,2})?$/.test(value)&&Number.isFinite(number)&&number>=Number(min)&&(max===undefined||number<=Number(max));
  input.current?.setCustomValidity(valid?'':`Ingresa un monto válido${Number(min)>0?` desde S/ ${min}`:''}${max!==undefined?` hasta S/ ${max}`:''}, con hasta dos decimales.`);
 },[value,min,max]);
 return <input {...props} ref={input} type="text" inputMode="decimal" data-money-input="true" pattern="[0-9]+([.][0-9]{1,2})?" value={value} onChange={e=>{const next=e.target.value.replace(',','.');if(/^\d*(?:\.\d{0,2})?$/.test(next))onChange(next);}}/>;
}
