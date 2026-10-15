import { json } from '../../../../../lib/admin';
export const dynamic = 'force-dynamic';
export async function POST() { return json({ error: 'Direct marketing integrations have been retired. Use the independent manual preparation tools.', code: 'FEATURE_RETIRED' }, 410); }
