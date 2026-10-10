'use client';
import {useState} from 'react';
import {LogOut,UsersRound} from 'lucide-react';
export function LogoutButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function logout(switchAccount=false) {
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/auth/logout', {method: 'POST'});
      if (!res.ok) throw new Error();
      window.location.assign(switchAccount?'/login?cuenta=otra':'/login');
    } catch { setError('No se pudo cerrar sesión. Reintenta.'); setBusy(false); }
  }
  return <div className="logout-control"><div className="session-actions"><button className="secondary" disabled={busy} onClick={()=>void logout(true)}><UsersRound size={16}/>Cambiar cuenta</button><button className="secondary" disabled={busy} onClick={()=>void logout()}><LogOut size={16}/>{busy?'Saliendo…':'Cerrar sesión'}</button></div>{error&&<span role="alert">{error}</span>}</div>;
}
