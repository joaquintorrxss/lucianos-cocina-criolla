import Workspace from './workspace';
import {getCurrentUser} from './auth';
import {redirect} from 'next/navigation';
export const dynamic='force-dynamic';
export default async function Page(){if(!await getCurrentUser())redirect('/login');return <Workspace/>;}
