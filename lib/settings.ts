import 'server-only';
import { db } from './supabase';
export const defaults={name:'PNG Scout',defaultView:'grid',allowExport:true,showEstimates:true};
export async function readSetting(key:string){const rows=await db<{value:any}[]>('app_settings',{params:{key:'eq.'+key,select:'value',limit:'1'}});return rows[0]?.value??null}
export async function writeSetting(key:string,value:unknown){await db('app_settings',{method:'POST',body:{key,value},prefer:'resolution=merge-duplicates,return=minimal'})}
export async function publicSettings(){return {...defaults,...await readSetting('app')}}
async function encryptionKey(usages:KeyUsage[]){const raw=process.env.SETTINGS_ENCRYPTION_KEY;if(!raw)throw Error('SETTINGS_ENCRYPTION_KEY missing');const bytes=Uint8Array.from(Buffer.from(raw,'base64'));if(bytes.length!==32)throw Error('Encryption key must be 32 bytes');return crypto.subtle.importKey('raw',bytes,'AES-GCM',false,usages)}
export async function encryptCredentials(value:unknown){const key=await encryptionKey(['encrypt']);const iv=crypto.getRandomValues(new Uint8Array(12));const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(JSON.stringify(value)));return {iv:Buffer.from(iv).toString('base64'),ciphertext:Buffer.from(encrypted).toString('base64')}}
export async function decryptCredentials(){const value=await readSetting('etsy_credentials');if(!value)return null;const bytes=await crypto.subtle.decrypt({name:'AES-GCM',iv:Uint8Array.from(Buffer.from(value.iv,'base64'))},await encryptionKey(['decrypt']),Uint8Array.from(Buffer.from(value.ciphertext,'base64')));return JSON.parse(new TextDecoder().decode(bytes)) as {key:string;secret:string}}
