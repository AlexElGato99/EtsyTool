import { json } from '../../../lib/admin';
export const dynamic = 'force-dynamic';
export async function GET() { return json({ error: 'This research feature has been retired. Use the manual listing-preparation workspace.', code: 'FEATURE_RETIRED' }, 410); }
export async function POST() { return GET(); }
