import { PiArrowSquareOutBold, PiCaretDownBold, PiImageBold } from 'react-icons/pi';
import './own-listing-review.css';

export type OwnListingReviewData = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  state: string;
  url: string;
  images: { url: string; alt: string }[];
  price: { amount: number; currency: string } | null;
};

function priceText(price: OwnListingReviewData['price']) {
  if (!price || !Number.isFinite(price.amount)) return 'No price available';
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency: price.currency, currencyDisplay: 'code', minimumFractionDigits: 2 }).format(price.amount);
  } catch {
    return `${price.amount.toFixed(2)} ${price.currency}`.trim();
  }
}

export function OwnListingReview({ listing }: { listing: OwnListingReviewData }) {
  const image = listing.images[0];
  const isActive = listing.state === 'active';
  return <article className="olr-card">
    {image ? <img className="olr-image" src={image.url} alt={image.alt || listing.title} loading="lazy" /> : <div className="olr-image olr-no-image"><PiImageBold aria-hidden="true" /><span>No preview image</span></div>}
    <div className="olr-heading"><span className="olr-state">{isActive ? 'Active listing' : 'Draft listing'}</span><h3>{listing.title || 'Untitled listing'}</h3></div>
    <details className="olr-details">
      <summary><span>Review listing details<span className="olr-sr-only">: {listing.title || 'Untitled listing'}</span></span><PiCaretDownBold aria-hidden="true" /></summary>
      <div className="olr-content">
        <dl><div><dt>Price</dt><dd>{priceText(listing.price)}</dd></div></dl>
        <section aria-label="Listing description"><h4>Description</h4>{listing.description.trim() ? <div className="olr-description" role="region" aria-label="Full listing description" tabIndex={0}><p>{listing.description}</p></div> : <p className="olr-empty">No description was returned.</p>}</section>
        <section aria-label="Listing tags"><h4>Tags</h4>{listing.tags.length ? <ul className="olr-tags">{listing.tags.map((tag, index) => <li key={index}>{tag}</li>)}</ul> : <p className="olr-empty">No tags were returned.</p>}</section>
        <p className="olr-note">Read-only reference from your own shop. Review changes and publish through Etsy Shop Manager.</p>
      </div>
    </details>
    {isActive ? <a className="olr-link" href={listing.url} target="_blank" rel="noopener noreferrer">Review on Etsy<span className="olr-sr-only">: {listing.title || 'Untitled listing'}</span><PiArrowSquareOutBold aria-hidden="true" /></a> : <p className="olr-draft-note">Drafts are private. Open Etsy Shop Manager to edit or publish this listing.</p>}
  </article>;
}
