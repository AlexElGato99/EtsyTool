'use strict';
const input = document.getElementById('site');
const status = document.getElementById('status');
const button = document.getElementById('open');
function siteOrigin(value) {
  const url = new URL(value);
  if (url.username || url.password || (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost','127.0.0.1','[::1]'].includes(url.hostname)))) throw Error('Use an HTTPS website address, or HTTP on localhost.');
  return url.origin;
}
chrome.storage.local.get('siteOrigin').then(saved => { input.value = saved.siteOrigin || 'http://localhost:3000'; }).catch(() => { input.value = 'http://localhost:3000'; });
document.getElementById('settings').addEventListener('submit', async event => {
  event.preventDefault();
  try { const origin = siteOrigin(input.value.trim()); await chrome.storage.local.set({siteOrigin:origin}); input.value = origin; status.textContent = 'Website address saved.'; }
  catch(error) { status.textContent = error.message; }
});
button.addEventListener('click', async () => {
  button.disabled = true;
  try {
    const origin = siteOrigin(input.value.trim());
    const [tab] = await chrome.tabs.query({active:true,currentWindow:true});
    const listing = new URL(tab?.url || '');
    if (listing.protocol !== 'https:' || !['etsy.com','www.etsy.com'].includes(listing.hostname) || !/\/listing\/[1-9]\d*(?:\/|$)/.test(listing.pathname)) throw Error('Open an Etsy listing in this tab, then try again.');
    const path = new URL('/workspace', origin); path.searchParams.set('section','listings'); path.searchParams.set('mode','listing'); path.searchParams.set('q',listing.origin + listing.pathname);
    await chrome.storage.local.set({siteOrigin:origin}); await chrome.tabs.create({url:path.toString()}); window.close();
  } catch(error) { status.textContent = error.message || 'Could not open this listing. Please try again.'; }
  finally { button.disabled = false; }
});
