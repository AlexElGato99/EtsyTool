import { readSetting } from '../../../lib/settings';
import { userAccess,errorResponse } from '../../../lib/api';
import { json } from '../../../lib/admin';
export const dynamic='force-dynamic';
export async function GET(){try{await userAccess();return json({configured:!!await readSetting('etsy_credentials'),salesAvailable:false,trafficAvailable:false})}catch(e){return errorResponse(e)}}
