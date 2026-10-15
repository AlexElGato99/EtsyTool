import { json } from '../../../../lib/admin';

export const dynamic = 'force-dynamic';
const retired = () => json({ error: 'Direct marketing provider settings have been retired. Manage existing service credentials in the provider dashboard.', code: 'FEATURE_RETIRED' }, 410);
export async function GET() { return retired(); }
export async function POST() { return retired(); }
