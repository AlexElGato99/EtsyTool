'use client';
import { useState } from 'react';
import { SiteIcon } from './site-icon';
export function CommunityShare() {
  const [message,setMessage] = useState('');
  async function share() { const url = window.location.origin; try { if (navigator.share) { await navigator.share({title:'PNG Scout — Free Etsy creator tools',text:'A free toolkit for product research and planning.',url}); setMessage('Share options opened.'); } else { await navigator.clipboard.writeText(url); setMessage('Website link copied.'); } } catch(error) { if ((error as Error).name !== 'AbortError') setMessage('Copy the website address from your browser to share PNG Scout.'); } }
  return <><button type="button" className="button" onClick={() => void share()}>Share PNG Scout<SiteIcon name="arrow" /></button><p role="status" style={{fontSize:12,marginTop:14}}>{message}</p></>;
}
