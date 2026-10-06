'use client';
import {useState} from 'react';
import {LogOut} from 'lucide-react';
export function LogoutButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function logout() {
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/auth/logout', {method: 'POST'});
      if (!res.ok) throw new Error();
      window.location.assign('/login');
    } catch { setError('No se pudo cerrar sesión. Reintenta.'); setBusy(false); }
  }
  return <div className="logout-control"><button className="icon-button" aria-label="Cerrar sesión" title="Cerrar sesión" disabled={busy} onClick={logout}><LogOut size={18}/></button>{error&&<span role="alert">{error}</span>}</div>;
}
