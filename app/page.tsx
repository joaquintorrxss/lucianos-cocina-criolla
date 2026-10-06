import Workspace from './workspace';
import {getCurrentUser} from './auth';
import {redirect} from 'next/navigation';
export const dynamic='force-dynamic';
export default async function Page(){const user=await getCurrentUser();if(!user)redirect('/login');return <Workspace user={user}/>;}
