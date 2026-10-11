export type ResourceSection = {
  id: string;
  title: string;
  paragraphs: string[];
  items?: string[];
  note?: string;
};

export type ResourceEntry = {
  kind: 'article' | 'guide';
  slug: string;
  category: string;
  title: string;
  summary: string;
  icon: 'search' | 'keywords' | 'bookmark' | 'history' | 'file' | 'lock' | 'info';
  sections: ResourceSection[];
  related: string[];
};

export const articles: ResourceEntry[] = [
  {
    kind: 'article', slug: 'build-a-useful-research-shortlist', category: 'Product research',
    title: 'Build a shortlist that helps you make a decision',
    summary: 'Turn an open-ended search into a small set of useful references, with a reason for every listing you save.',
    icon: 'bookmark', related: ['/help/search-listings', '/help/saved-listings'],
    sections: [
      { id: 'start-with-a-question', title: 'Start with one question', paragraphs: ['A productive research session starts with something you want to learn. Instead of collecting every attractive result, choose a question: which formats appear for a wedding invitation, how prices differ across bundles, or how sellers describe a particular style.', 'Enter a specific starting phrase in Listing explorer. Compare a broader phrase with a narrower one, keeping the rest of your search settings consistent. An empty Marketplace search is useful for browsing; a keyword helps you investigate a particular idea.'] },
      { id: 'compare-like-with-like', title: 'Compare similar products', paragraphs: ['A single illustration and a large clipart bundle can both appear in the same search. Their prices are difficult to compare without checking what each listing actually contains. Open the details and follow View on Etsy when you need to confirm formats, quantity, or usage terms.'], items: ['Check whether the listing is a digital download or a physical product.', 'Compare the size and intended use of the product, rather than price alone.', 'Keep currency and search filters consistent across comparisons.', 'Use the listing title and tags to understand how the seller describes the item.'] },
      { id: 'save-with-intention', title: 'Save references with a reason', paragraphs: ['The bookmark action saves a listing to your account. Choose references that answer different parts of your question rather than filling the watchlist with near-identical results. Keep your observations in your own notes alongside the listing link.', 'PNG Scout supports up to 100 saved listings. That is a storage limit, not a research target. Remove references that no longer help your decision so the collection stays useful.'] },
      { id: 'choose-an-original-direction', title: 'Turn observations into your own direction', paragraphs: ['A shortlist should help you decide what to make, not supply designs to reproduce. Look for a use case you can serve, a format you can explain clearly, or a style you can develop through your own work.', 'Favorites and listing counts give context, but they do not establish sales or demand. Finish your session with a small next step you can test, such as an original sketch, a clearer product description, or a comparison of two possible formats.'], note: 'Search results can be cached for 15 minutes. Confirm current details on the original Etsy listing before relying on them.' },
    ],
  },
  {
    kind: 'article', slug: 'understand-keyword-competition', category: 'Keyword research',
    title: 'What keyword competition can actually tell you',
    summary: 'Read matching listing counts and related tags without mistaking them for search volume, sales, or a ranking forecast.',
    icon: 'keywords', related: ['/help/keyword-research', '/help/research-data'],
    sections: [
      { id: 'what-is-counted', title: 'A listing count measures available supply', paragraphs: ['Keyword research reports the number of matching listings returned by the Etsy API for a phrase. A large result count means there are many matching listings. It does not tell you how many people search for that phrase, how often they buy, or whether their needs are already met.', 'The competition indicator compresses that count into a score. Its formula is 100 × matching listings / (matching listings + 10,000), rounded to a whole number. The low, medium, and high labels describe this formula; they are not an independent assessment of opportunity.'] },
      { id: 'related-tags', title: 'Related tags are a starting point', paragraphs: ['PNG Scout collects tags from the returned listing page and selects up to four related terms that recur in that sample. Those terms help you explore how listings are described. They are not a complete list of buyer searches or the most popular words on Etsy.', 'Compare related phrases one at a time. A phrase that looks narrower may still match many listings, and a small count may reflect unusual wording rather than an unmet need.'] },
      { id: 'make-a-comparison', title: 'Make the comparison useful', paragraphs: ['Choose phrases that describe the same kind of item at different levels of detail. For example, start with a format, then add a theme, intended recipient, or occasion. These are illustrative research approaches, not recommended keywords with verified demand.'], items: ['Check the matching listing count for each phrase.', 'Explore the listings behind the count to see whether they fit your idea.', 'Compare titles, formats, and tags before choosing your own wording.', 'Write descriptions that accurately explain your product rather than repeating unrelated tags.'] },
      { id: 'keep-your-judgment', title: 'Keep the number in its place', paragraphs: ['Use competition as one observation alongside the actual products you see. It can help organize a comparison, but it cannot predict rank, revenue, or the success of a new listing.', 'PNG Scout does not provide verified keyword search volume, conversion rates, or sales estimates. If a decision needs one of those measures, do not substitute a competition score for it.'] },
    ],
  },
  {
    kind: 'article', slug: 'compare-digital-product-prices', category: 'Product research',
    title: 'Compare digital product prices with more context',
    summary: 'A useful price comparison starts with the product format, bundle contents, currency, and the details on the original listing.',
    icon: 'search', related: ['/help/search-listings', '/help/research-data'],
    sections: [
      { id: 'define-the-comparison', title: 'Define what you are comparing', paragraphs: ['A price is meaningful only when you understand what is included. Compare similar product types, file formats, bundle sizes, and intended uses. A printable invitation template and a finished physical invitation are different offers even when their titles share the same words.', 'The listing-type filter in PNG Scout applies to the results already loaded on the current page. Selecting Digital downloads helps you inspect that page; it does not change the marketplace total into a count of digital-only products.'] },
      { id: 'use-filters-carefully', title: 'Use filters to focus the question', paragraphs: ['Marketplace advanced filters can narrow the request by price range, category, and shop location, with currency and buyer-country options. Start with only the filters needed for your question, then broaden them if the returned sample is too narrow.', 'Sorting by price is useful for seeing the spread within your chosen search. It does not turn every result into a comparable product, and it does not tell you why one seller charges more.'] },
      { id: 'check-the-source', title: 'Check the details that a table cannot explain', paragraphs: ['Follow View on Etsy to read the current listing. Confirm what the buyer receives and review the seller’s terms, especially if your comparison involves different usage rights or bundle formats.', 'Where Etsy provides a converted price, PNG Scout displays that value and currency. Some records may use the original listing currency. Check the currency beside each price before comparing amounts; a missing conversion is not a reason to treat different currencies as equivalent.'] },
      { id: 'decide-from-your-costs', title: 'Use the comparison to inform your own offer', paragraphs: ['Research can show how products are presented, but your own price also needs to account for the work, permissions, support, and costs involved in your offer. Fee and profit planners calculate from the inputs you supply; public research does not report actual shop profit or recommend a selling price.', 'Use a comparison to clarify the value of your original product. A small difference in listed price is less useful than understanding the format, audience, and scope of what you plan to deliver.'] },
    ],
  },
  {
    kind: 'article', slug: 'make-sense-of-listing-snapshots', category: 'Saved listings',
    title: 'Make sense of a saved listing’s snapshot history',
    summary: 'Understand what a manual price and favorite snapshot records, what gaps mean, and why a change does not prove a sale.',
    icon: 'history', related: ['/help/saved-listings', '/help/research-data'],
    sections: [
      { id: 'what-is-a-snapshot', title: 'A snapshot is one observation', paragraphs: ['Saving or manually refreshing a listing records the price, currency, and favorite count returned at that time. Open a saved listing’s details to review its recorded history.', 'The history uses a recent 30-day cleanup window. There is no scheduled background monitor: an observation appears because a listing was saved or refreshed. If nobody records a listing on a particular day, that day does not have a new observation.'] },
      { id: 'one-record-a-day', title: 'Repeated refreshes do not create a full activity log', paragraphs: ['Snapshots are keyed by listing and UTC date. Another save or refresh on the same UTC day updates that day’s record. A history view is therefore not a record of every price change during the day.', 'Public snapshots are stored by listing rather than as a separate timeline for each user. If another user records the same listing, that observation may be part of its available history. Your watchlist membership remains associated with your own account.'] },
      { id: 'read-changes-carefully', title: 'Read the changes carefully', paragraphs: ['An increase in favorites means the recorded favorite count changed between observations. It does not prove that a purchase occurred. Likewise, a price change does not establish why a seller changed their offer.', 'Always compare the currency with the price. If the currency differs between observations, the numeric difference is not a like-for-like price change.'] },
      { id: 'use-history-for-context', title: 'Use history to revisit your question', paragraphs: ['Snapshots are useful for a simple question such as whether the displayed price differs from your earlier reference. They are less useful for claims about continuous activity, demand, or sales.', 'Before acting on an older observation, refresh the listing or visit the original Etsy page. The record is historical context, not a guarantee of the current listing state.'] },
    ],
  },
  {
    kind: 'article', slug: 'research-without-copying', category: 'Creative practice',
    title: 'Research other listings while protecting your own originality',
    summary: 'Use marketplace observations to understand a use case and product format while keeping another creator’s work separate from your own.',
    icon: 'file', related: ['/etsy-disclaimer', '/help/search-listings'],
    sections: [
      { id: 'observe-the-problem', title: 'Observe the problem a product solves', paragraphs: ['A productive reference tells you something about an intended use: organizing a planner, decorating an invitation, or preparing artwork for a particular format. Focus on that use case and on how clearly the product is explained.', 'You can compare file types, product scope, wording, and presentation without tracing or reproducing a design. A useful note records the problem and the format, not instructions for copying a seller’s work.'] },
      { id: 'separate-reference-and-source', title: 'Separate a reference from an asset source', paragraphs: ['A listing image is evidence of how a product is presented. Viewing it in a research workspace does not grant permission to download, redistribute, or incorporate it into your own product.', 'If your project needs artwork, fonts, or other assets, create them yourself or obtain an appropriate license from their owner. Check the permissions for your intended use rather than assuming that a marketplace listing implies a broad reuse license.'] },
      { id: 'make-your-own-brief', title: 'Write a brief before designing', paragraphs: ['Turn your findings into a brief that can stand without any one reference. Describe the audience, format, delivery requirements, and the original visual direction you want to develop.'], items: ['State the task your product should help someone complete.', 'List the file formats and practical constraints you will support.', 'Describe your own visual approach in words.', 'Keep reference links for research rather than importing their artwork.'] },
      { id: 'be-accurate', title: 'Keep the finished offer accurate', paragraphs: ['When you write your own title and tags, describe what you made and what a buyer will receive. Research can help you notice useful vocabulary, but copying a title or adding unrelated tags is not a substitute for a clear description.', 'PNG Scout organizes public information. It does not grant intellectual property rights, provide legal advice, or determine whether a proposed design is permitted. Ask the relevant rights holder or an appropriate adviser when a specific permission is unclear.'] },
    ],
  },
];

export const guides: ResourceEntry[] = [
  {
    kind: 'guide', slug: 'connected-services', category: 'Connected services',
    title: 'Connect your own Etsy, Pinterest, and email tools', summary: 'Inspect your own shop, publish a confirmed pin, and manage consented email campaigns through your own sender.',
    icon: 'lock', related: ['/workspace?section=connections', '/privacy', '/api-docs', '/contact'],
    sections: [
      { id: 'choose-connections', title: 'Choose only the connections you need', paragraphs: ['Open Connected accounts in the signed-in workspace. Etsy, Pinterest, and the shared email test depend on the operator’s configured provider access. Personal Email campaigns use your own Resend key and verified sender, configured separately. Public planning tools and public listing research are separate from authorizing access to your own external account.', 'Etsy and Pinterest connections take you to the provider’s authorization screen. Review the requested permissions and authorize only an account you control. You then return to PNG Scout. Etsy requires a secure website address for this flow; use the live HTTPS website rather than an HTTP localhost address.'] },
      { id: 'own-shop', title: 'Read your own shop summary', paragraphs: ['A connected Etsy account can load its own shop and a bounded recent-order summary. The request covers up to 100 returned receipts from the last 30 days, with up to five recent order rows and available processing-fee records. Buyer names, email addresses, and delivery addresses are excluded from the displayed summary.', 'Totals cover only the returned paid, non-cancelled orders and can include shipping and tax. They are not profit or payout amounts. Available processing fees do not include every Etsy fee. If more matching receipts exist than were loaded, the summary is incomplete. This view is not a full accounting report or an order-management system.'] },
      { id: 'pinterest', title: 'Publish a pin when you choose to', paragraphs: ['Connect Pinterest and load an eligible board. For direct publishing, also connect the Etsy account that owns the listing. Enter your own listing link and load its details. Choose one of the returned product images, review the imported title and description, select a board, then explicitly confirm publishing.', 'PNG Scout checks that the listing belongs to the connected Etsy shop and that the image matches that listing before requesting a pin. A successful response links to the created pin. This is a user-triggered action, not a scheduled or automatic campaign.', 'The public Pinterest composer is a separate manual option. Its share action opens Pinterest for review and passes the entered listing URL, image URL, and caption to that service. It does not itself publish a pin through an API connection.'] },
      { id: 'email-test', title: 'Send a test message to yourself', paragraphs: ['When the operator has configured Resend and a sender, enable email testing in Connections. Enter a subject and message, review the recipient, and explicitly confirm sending. The server verifies your account email and limits the recipient to that signed-in email address.', 'Email testing permits one request per minute and up to ten per UTC day, subject to provider limits. It is not bulk email, subscriber management, or customer marketing automation. The public email composer can prepare a draft without sending it.'] },
      { id: 'personal-sender', title: 'Connect a personal campaign sender', paragraphs: ['Open Email campaigns and connect your own Resend API key and sender address on a domain verified in your Resend account. The sender belongs to your signed-in account and is separate from the operator’s shared email test. Credentials are encrypted on the server and stay hidden after saving.', 'The campaign manager creates a dedicated contact segment and tracks campaigns you create through PNG Scout. Your Resend account holds contacts and campaign content. Provider plans and quotas still apply; PNG Scout charges no fee and does not upgrade your provider plan.'] },
      { id: 'campaign-contacts', title: 'Keep a consented contact list', paragraphs: ['Add recipients individually after confirming that you have their permission to receive your campaign. The recorded confirmation is your assertion of consent, not an independent opt-in verification. PNG Scout supports up to 500 local contact consent records and does not import Etsy buyer emails or scraped lists.', 'Removing a member removes that contact from the dedicated segment. It does not delete the global contact in Resend or change an existing global unsubscribe. Resend controls subscription and suppression status. Do not attempt to work around an opt-out or suppressed address.'] },
      { id: 'campaign-delivery', title: 'Review a draft and confirm delivery', paragraphs: ['Create a draft with a subject of up to 150 characters, message of up to 8,000 characters, and internal name of up to 70 characters. Drafts can be edited or deleted before delivery; saving a draft does not send it. Campaigns include a Resend unsubscribe link. Include accurate sender details and any postal address required for your message.', 'Review the audience and message before confirming Send now or a schedule from 5 minutes to 30 days ahead. Up to 50 campaigns are tracked per account. Status comes from Resend and is not proof of inbox delivery. If an action’s result is uncertain, refresh its status before attempting another send.', 'Canceling a scheduled campaign can return it to draft. Canceling a queued campaign stops only its remaining deliveries; already sent emails cannot be recalled. Confirmed provider schedules can continue after you disconnect, so cancel unwanted campaigns before disconnecting or manage them in Resend afterward. Recurring workflows and campaign engagement reporting are not supplied.'] },
      { id: 'disconnect', title: 'Disconnect and revoke permissions', paragraphs: ['Disconnect removes the local stored authorization and pending connection state for that service. It stops PNG Scout from using that saved connection. It does not delete a pin already published, recall an email, or automatically revoke the provider’s remote permission grant.', 'For complete revocation, remove the app permission in your Etsy or Pinterest account settings as well. Connection tokens and provider secrets are encrypted on the server and are not returned to the browser. For an account-data deletion request, use Contact.'] },
    ],
  },
  {
    kind: 'guide', slug: 'public-planning-tools', category: 'Planning tools',
    title: 'Use the free planning tools and keep your drafts', summary: 'Work with browser-based calculators, checklists, drafts, and reminders without confusing them with automatic marketplace actions.',
    icon: 'file', related: ['/tools', '/privacy', '/free'],
    sections: [
      { id: 'inputs', title: 'Work from your own inputs', paragraphs: ['The public tools use the values you enter. Fee, profit, ad-budget, and A/B comparisons are calculations from those inputs, not live results from your Etsy shop. Listing checks help you review copy and tags; they do not predict ranking.', 'A shop-name suggestion is not a trademark or availability check. A privacy-policy draft is a starting point for review, not a determination that your shop complies with a particular law.'] },
      { id: 'drafts', title: 'Copy or download a draft', paragraphs: ['The email composer, privacy draft, and other applicable tools let you copy or download the output. Editable drafts remain in page memory unless you save a file yourself. Reloading or leaving the page can clear unsaved work.', 'The public email composer prepares a local draft. The separate signed-in Email campaigns manager connects your own Resend sender for contact management and confirmed delivery. A manual Pinterest share opens Pinterest with the details you entered for review.'] },
      { id: 'reminders', title: 'Keep followup reminders in this browser', paragraphs: ['The reminder tool saves order references, dates, notes, and completion status to this browser’s local storage. You can edit, complete, delete, and export reminders as CSV or calendar entries. They are not synchronized to your PNG Scout account or another device.', 'Use references for your own organization instead of entering buyer names, emails, or addresses. Reminders are not sent automatically. Delete items in the tool or clear the website’s browser storage to remove the local list. A downloaded file or calendar import remains wherever you saved it.'] },
    ],
  },
  {
    kind: 'guide', slug: 'create-a-free-account', category: 'Getting started',
    title: 'Create an account and sign in', summary: 'Set up your free account, confirm your email if required, and open your private research workspace.',
    icon: 'lock', related: ['/signup', '/login', '/contact'],
    sections: [
      { id: 'register', title: 'Create your account', paragraphs: ['Open Create a free account and use an email address you control. Choose a password of at least eight characters, enter it again, and review the Terms of Use and Privacy Policy before submitting.', 'Creating an account is free. There is no checkout, subscription, or payment information to enter.'] },
      { id: 'confirm-email', title: 'Confirm your email when requested', paragraphs: ['If email confirmation is enabled, the page asks you to check your inbox. Follow the confirmation message, then return to Sign in and use the same email and password.', 'If the message does not arrive, check your spam folder and confirm you entered the correct address. Contact the site operator if you still need help; there is no resend button in the current account screen.'] },
      { id: 'open-workspace', title: 'Open the workspace', paragraphs: ['After a successful sign-in, you are redirected to the workspace. An account keeps your saved listings associated with you.', 'Research can be temporarily unavailable even when sign-in works. Live listing features depend on the service’s configured Etsy access; regular users do not need to provide an Etsy API key or their Etsy password.'] },
      { id: 'account-support', title: 'Get help with account access', paragraphs: ['For a sign-in issue, check the email, password, and confirmation status. For an account deletion or privacy request, contact the operator from your registered email address.', 'The current account screens do not include a password-reset or account-deletion flow. Do not send your password or authentication tokens with a support request.'] },
    ],
  },
  {
    kind: 'guide', slug: 'search-listings', category: 'Listing explorer',
    title: 'Search listings, shops, and direct links', summary: 'Choose the right research method and understand which filters affect your search versus the loaded page.',
    icon: 'search', related: ['/workspace', '/help/research-data'],
    sections: [
      { id: 'marketplace', title: 'Marketplace search', paragraphs: ['Open Listing explorer and select Marketplace. Enter a keyword to explore a product idea, or leave it blank to browse. Use the sort controls to choose the order of the requested results.', 'Advanced filters let you set a price range, category, shop location, currency, buyer country, and mature-content setting. Change only the filters you need, then run the search again. Categories require the live research connection to be available.'] },
      { id: 'shops', title: 'Shop search', paragraphs: ['Select Shop search and enter the exact shop name, its Etsy shop link, or its numeric shop ID. A successful shop search can show active listings and the available shop sections.', 'Choose All active listings, Featured listings, or a specific section. The shop-section option becomes available after a shop with sections is loaded. An optional keyword is available for active shop listings.'] },
      { id: 'lookup', title: 'Listing lookup', paragraphs: ['Select Listing lookup and paste an Etsy listing link or a numeric listing ID. You can look up multiple listings by separating their links or IDs with commas or whitespace, up to 100 inputs per request.', 'Direct lookup is useful when you already have a reference. A removed or unavailable listing may not produce a usable result. PNG Scout accepts Etsy links, not arbitrary external website links.'] },
      { id: 'page-filter', title: 'Filter and inspect the returned page', paragraphs: ['Switch between grid and list views to compare the loaded results. The Show control filters those results to digital downloads, physical listings, or all listing types. This filter applies to the loaded page rather than the complete marketplace count.', 'Open a listing to inspect its details and tags. Use View on Etsy to confirm current information or examine the original offer. Use the bookmark action to save it. Next and previous page controls request another page of results where available.'] },
    ],
  },
  {
    kind: 'guide', slug: 'keyword-research', category: 'Keyword research',
    title: 'Read keyword results and competition', summary: 'Use matching counts, related tags, and competition labels as context for your research.',
    icon: 'keywords', related: ['/workspace', '/blog/understand-keyword-competition'],
    sections: [
      { id: 'analyze', title: 'Analyze a phrase', paragraphs: ['Open Keyword research, enter a phrase between two and 100 characters, and choose Analyze keyword. The results include your phrase and up to four related tags selected from the returned listing sample.', 'The competition filter changes which loaded keyword rows are shown. Explore opens a listing search for a selected phrase. The copy action copies that phrase when your browser permits clipboard access.'] },
      { id: 'competition', title: 'Understand the indicator', paragraphs: ['The score is calculated as 100 × matching API listings / (matching API listings + 10,000), rounded. Scores up to 33 are low, up to 66 are medium, and higher scores are high.', 'This indicator summarizes matching supply. It is not keyword search volume, sales, conversion rate, or a prediction of where your own listing will rank.'] },
      { id: 'sample', title: 'Keep the sample in view', paragraphs: ['Related phrases come from tags on a single returned listing page. They may be useful terms to investigate, but they do not represent every relevant listing or the full language buyers use.', 'Searches may reuse cached results for 15 minutes. Try a more descriptive phrase if the returned terms are too broad, then inspect the underlying listings before drawing a conclusion.'] },
    ],
  },
  {
    kind: 'guide', slug: 'saved-listings', category: 'Saved listings',
    title: 'Save listings and record their history', summary: 'Keep a private shortlist, refresh listing details manually, and interpret the snapshots you have recorded.',
    icon: 'bookmark', related: ['/workspace', '/blog/make-sense-of-listing-snapshots'],
    sections: [
      { id: 'save', title: 'Save a listing', paragraphs: ['Choose the bookmark action on a result or in its detail panel. Saved listings appear in your account’s Saved listings section. The maximum is 100 listings per account.', 'Select the bookmark action again to remove a saved listing. Removing it clears its association with your account; it does not remove the original listing from Etsy.'] },
      { id: 'refresh', title: 'Refresh a saved listing', paragraphs: ['Open a saved listing and choose Refresh listing in the Price & favorite history section. This requests its current details and records a price, currency, and favorite snapshot.', 'Snapshots are created by saving or refreshing, not by a scheduled monitor. A repeat observation on the same UTC date updates that day’s record.'] },
      { id: 'history', title: 'Read the history', paragraphs: ['The history shows the available recent observations for that listing, using a 30-day cleanup window. Gaps mean no new snapshot was recorded; they do not mean the listing remained unchanged.', 'Snapshot records belong to the public listing, so another user’s refresh of the same listing may contribute an observation. A favorite change does not prove a sale. Check the currency before comparing recorded prices.'] },
    ],
  },
  {
    kind: 'guide', slug: 'research-data', category: 'Data & limits',
    title: 'Understand data, exports, and limits', summary: 'Know what the workspace reports, what a CSV export contains, and why a request may need a short pause.',
    icon: 'info', related: ['/api-docs', '/privacy', '/help/troubleshooting'],
    sections: [
      { id: 'source', title: 'Where listing information comes from', paragraphs: ['The workspace requests public listing information through the configured Etsy API connection. Titles, prices, tags, favorites, listing age, and available images come from returned records. Missing information is not replaced with invented sales or demand figures.', 'Listing age is calculated from a creation timestamp. A favorite count is the recorded number returned by Etsy; neither measure is verified sales. The workspace does not report keyword search volume.'] },
      { id: 'cache', title: 'Caching and current details', paragraphs: ['Research results may be reused from a 15-minute cache. A cached search is a recent stored response, not a new request for every listing. Category data may be cached separately.', 'Saved listing details remain a reference until refreshed. Check the capture time and visit the original listing when you need current information. Snapshot cleanup runs as records are created rather than on an exact deletion schedule.'] },
      { id: 'export', title: 'Export the loaded results', paragraphs: ['If the site operator has enabled exports, Export CSV downloads the listings currently available in the active results view. It is not a full-marketplace export or a download of product artwork.', 'The listing-type filter affects which loaded items appear in the export. Keep the original listing links and currency fields with your research so a saved file remains understandable.'] },
      { id: 'limits', title: 'Usage limits', paragraphs: ['The workspace limits saved listings to 100 per account. Research requests use a per-account limit of 15 per minute, and the upstream service has its own quotas. A single keyword analysis can request several related phrases.', 'If you receive a busy or rate-limit message, pause before trying again. Repeatedly submitting the same action does not restore access sooner. Every available tool is free; limits help keep the service usable.'] },
    ],
  },
  {
    kind: 'guide', slug: 'troubleshooting', category: 'Getting started',
    title: 'Troubleshoot an empty result or unavailable search', summary: 'Work through search inputs, filters, account access, and temporary service problems.',
    icon: 'info', related: ['/contact', '/help/search-listings', '/help/create-a-free-account'],
    sections: [
      { id: 'no-results', title: 'When no results appear', paragraphs: ['Check the research method first. Marketplace accepts a keyword, Shop search needs an exact shop name or link, and Listing lookup needs an Etsy listing link or ID.', 'Remove unnecessary advanced filters and try a broader keyword. If the loaded page has results but the view is empty, change Show back to All listing types. A page-level type filter can hide all items on that page.'] },
      { id: 'connection', title: 'When research is unavailable', paragraphs: ['Wait briefly and retry once. If the message persists, the site operator may need to resolve the research connection. Creating another account or entering your personal Etsy credentials will not fix that connection.', 'Do not paste API keys or passwords into a search or support message. Only the site operator manages the service’s approved Etsy API credentials.'] },
      { id: 'rate-limit', title: 'When a request is busy or rate limited', paragraphs: ['Pause for at least a minute before another research request. Request counters and upstream quotas are separate, so an upstream limit may last longer.', 'Avoid opening repeated searches at the same time. If a category request fails, use Reload categories when available or continue without a category filter.'] },
      { id: 'contact', title: 'When you need support', paragraphs: ['Use the Contact page and include the page or research method, a description of your steps, and the visible error message. If it concerns account access, use your registered email address.', 'Do not include passwords, authentication tokens, or API secrets. The operator can investigate a reported problem without receiving your password.'] },
    ],
  },
];

export function getResource(kind: ResourceEntry['kind'], slug: string) {
  return (kind === 'article' ? articles : guides).find(entry => entry.slug === slug);
}

export function resourceHref(entry: ResourceEntry) {
  return `/${entry.kind === 'article' ? 'blog' : 'help'}/${entry.slug}`;
}

export const brandIconSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><rect x="8" y="8" width="240" height="240" rx="60" fill="#4d50ce"/><circle cx="128" cy="128" r="78" fill="none" stroke="#fff" stroke-width="12"/><path d="m166 90-23 53-53 23 23-53 53-23Z" fill="#fff"/><circle cx="128" cy="128" r="9" fill="#4d50ce"/><path d="M128 39v13M217 128h-13M128 217v-13M39 128h13" stroke="#fff" stroke-width="8" stroke-linecap="round"/></svg>';
export const brandWordmarkSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="160" viewBox="0 0 640 160"><rect x="8" y="16" width="128" height="128" rx="32" fill="#4d50ce"/><circle cx="72" cy="80" r="41" fill="none" stroke="#fff" stroke-width="7"/><path d="m93 59-13 29-29 13 13-29 29-13Z" fill="#fff"/><circle cx="72" cy="80" r="5" fill="#4d50ce"/><text x="164" y="100" fill="#1e2440" font-family="Arial,Helvetica,sans-serif" font-size="64" font-weight="700" letter-spacing="-2">PNG Scout<tspan fill="#4d50ce">.</tspan></text></svg>';
export function svgDownload(svg: string) { return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); }
