'use client';
import {useState, type FormEvent} from 'react';
import {ArrowRight, LockKeyhole} from 'lucide-react';
import {Brand} from '@/app/brand';
export default function LoginForm() {
  const [username, setUsername] = useState('lucianos@sistema.com');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const res = await fetch('/api/auth/login', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({username, password})});
      const data = await res.json() as {error?: string};
      if (!res.ok) { setError(data.error ?? 'No se pudo iniciar sesión.'); setBusy(false); return; }
      window.location.assign('/');
    } catch { setError('No se pudo conectar. Intenta nuevamente.'); setBusy(false); }
  }
  return <main className="login-screen"><section className="login-card"><Brand/><div className="login-title"><span className="eyebrow">BIENVENIDO A CASA</span><h1>Tu cocina,<br/>lista para empezar.</h1><p>Ingresa para gestionar mesas, pedidos y caja.</p></div><form onSubmit={submit}><label htmlFor="username">Usuario</label><input id="username" name="username" autoComplete="username" inputMode="email" value={username} onChange={e=>setUsername(e.target.value)} required maxLength={120}/><label htmlFor="password">Contraseña</label><input id="password" name="password" type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required maxLength={256}/><div className="login-error" role="alert">{error}</div><button className="login-submit" disabled={busy}>{busy?'Ingresando…':'Entrar a Lucianos'}<ArrowRight size={18}/></button></form><a className="account-back" href="/acceso">¿Olvidaste tu contraseña?</a><p className="login-foot"><LockKeyhole size={15}/>Acceso del equipo de Lucianos</p></section></main>;
}
