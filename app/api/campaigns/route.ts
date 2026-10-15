import { json } from '../../../lib/admin';
export const dynamic = 'force-dynamic';
const retired = () => json({ error: 'Campaign delivery is no longer part of podadd. Manage existing contacts and scheduled messages directly in your email provider.', code: 410 }, 410);
export async function GET() { return retired(); }
export async function POST() { return retired(); }