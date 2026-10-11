import { getUser } from '../lib/auth';
import html from "../content/research";
export const dynamic="force-dynamic";
export async function GET(request:Request){if(!await getUser())return Response.redirect(new URL("/login",request.url));return new Response(html,{headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store"}})}
