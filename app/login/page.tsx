import {redirect} from 'next/navigation';
import {getCurrentUser} from '@/app/auth';
import LoginForm from './login-form';
export const dynamic = 'force-dynamic';
export default async function LoginPage({searchParams}:{searchParams:Promise<{cuenta?:string}>}) {
  if (await getCurrentUser()) redirect('/');
  return <LoginForm switchAccount={(await searchParams).cuenta==='otra'}/>;
}
