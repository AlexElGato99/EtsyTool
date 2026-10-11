import { publicSettings } from '../../../lib/settings';
import { json } from '../../../lib/admin';
export const dynamic='force-dynamic';
export async function GET(){return json(await publicSettings())}
