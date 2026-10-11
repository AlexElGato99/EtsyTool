import { credentialsAction } from '../../../../lib/auth-actions';
export async function POST(request:Request){return credentialsAction(request)}
