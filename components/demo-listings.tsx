import { SiteIcon } from './site-icon';
const examples = [
  { title: 'Wildflower PNG collection', detail: 'Floral · Digital download', tone: 'blue', price: '$4.50', favorites: '128', age: '42 days' },
  { title: 'Minimal botanical clipart', detail: 'Botanical · Digital download', tone: 'purple', price: '$3.20', favorites: '86', age: '18 days' },
  { title: 'Retro flower design bundle', detail: 'Retro · Digital download', tone: 'indigo', price: '$6.00', favorites: '214', age: '67 days' },
  { title: 'Hand-lettered garden quotes', detail: 'Typography · Digital download', tone: 'blue', price: '$4.00', favorites: '52', age: '12 days' },
];
function FileBadge({ tone }: { tone: string }) {
  return <span className={`file-badge ${tone}`}><SiteIcon name="file" /><span>PNG</span></span>;
}
export function ProductRows() {
  return <>{examples.map(p => <tr key={p.title}><td><div className="listing"><FileBadge tone={p.tone} /><div><strong>{p.title}</strong><small>{p.detail}</small></div></div></td><td>{p.price}</td><td>{p.favorites}</td><td>{p.age}</td><td><span className="type-pill">Digital</span></td></tr>)}</>;
}
export function SavedRows() {
  return <>{examples.slice(0, 3).map(p => <div className="saved-row" key={p.title}><FileBadge tone={p.tone} /><div><strong>{p.title}</strong><small>Saved to your private watchlist</small></div><span>{p.price}</span><span className="saved-mark"><SiteIcon name="bookmark" /></span></div>)}</>;
}
