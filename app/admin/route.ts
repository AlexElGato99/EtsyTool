import { getUser } from '../../lib/auth';
import html from "../../content/admin";
import { isOwner } from "../../lib/admin";
export const dynamic="force-dynamic";
export async function GET(request:Request){if(!await getUser())return Response.redirect(new URL("/login",request.url));if(!await isOwner())return new Response("Owner access required",{status:403,headers:{"Cache-Control":"no-store"}});return new Response(html,{headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store"}})}
