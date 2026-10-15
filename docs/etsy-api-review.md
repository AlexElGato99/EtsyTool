# podadd: private Etsy API implementation review

Prepared October 15, 2026. Repository documentation only; not a public route, an approval certificate, legal advice, or an external message. Do not add private review correspondence, credentials, or account identifiers here.

## Scope and identity

The existing submitted application name is `png-scout`; the current public name is `podadd`. The previous purpose was marketplace/product research. The user selected a change to **seller-owned listing preparation and manual shop tools**, for the same application. The legal operator name supplied by the user is **AYOUB CHIBANE**. The support email is `elgatoa82@gmail.com`. Both remain editable in the owner dashboard. No company registration, legal address, or organization type has been asserted.

Supported work: manually entered listing drafts, local text/tag checks, entered fee/profit assumptions, name suggestions, privacy/email drafts, and local task reminders. Future approved access provides a read-only view of the connected seller's own active and draft listings: title, description, tags, and price for manual review while preparing independent drafts and editing notes. Retrieved catalogue content is separate from manually entered drafts; podadd does not publish edits to Etsy.

The initial API connection is restricted to the operator's podadd account after actual approval and valid seller authorization. Request **Personal App review for limited developer-managed testing** of this same application, because the public free application is intended for future use by other sellers. Other users can use manual tools and drafts without getting API access. An active Etsy shop owned by the operator has not been established; do not claim eligibility for the registered-own-shop-only Seller App path.

Retired work: marketplace/competitor research, keyword analytics, favorites/price history, API watchlists, Etsy order/receipt reporting, the Etsy-linked extension, API Pinterest publishing, and email campaigns. Changing their labels would not resolve the former functionality.

## Public policy basis

The complete [API Terms, sections 1–10](https://www.etsy.com/legal/api/) were read; the page identifies August 18, 2026 as its update. The [third-party index](https://www.etsy.com/legal/section/third-party) links policies; it does not grant additional permission. Linked [Trademark](https://www.etsy.com/legal/trademarks/) and [IP](https://www.etsy.com/legal/ip/) policies were also read.

Compact rule references: [§1](https://www.etsy.com/legal/api/#:~:text=1.%20License) covers branding/independence; [§2](https://www.etsy.com/legal/api/#:~:text=2.%20Your%20Developer) credentials/access; [§3](https://www.etsy.com/legal/api/#:~:text=3.%20Application%20Requirements) approved purpose, support, user terms and warranty allocation; [§4](https://www.etsy.com/legal/api/#:~:text=4.%20Your%20Privacy) privacy; [§5](https://www.etsy.com/legal/api/#:~:text=5.%20Use) purpose, freshness, minimum data and restrictions; [§6](https://www.etsy.com/legal/api/#:~:text=6.%20Termination) suspension/termination; [§7](https://www.etsy.com/legal/api/#:~:text=7.%20Disclaimer) incident notification; [§§8–10](https://www.etsy.com/legal/api/#:~:text=8.%20Feedback) feedback, independence and written exceptions.

In §5, marketing connections and order notifications are restricted; extension/automated access and analytics need express written authorization. Listing freshness is six hours, other content 24 hours. §7 specifies breach notification within 24 hours. Written purpose approval and revised public claims matter; a free label is insufficient.

[Current access documentation](https://developers.etsy.com/documentation/#personal-apps-and-commercial-access) allows reviewed limited-scale Personal Apps and later Commercial Access for broader seller adoption; Seller Apps serve the operator's own registered shop. Do not rely on obsolete fixed-shop-count guidance. [Authentication documentation](https://developers.etsy.com/documentation/essentials/authentication/) specifies HTTPS callbacks, PKCE, scopes, and seller consent.

## Public pages for review

Keep Home (`/`), About (`/about`), Contact (`/contact`), Terms (`/terms`), and Privacy (`/privacy`), with working public tools and account access. Home/About explain the actual purpose and operator; Contact displays a monitored support address. Terms/Privacy describe the user agreement, developer responsibilities, data use and controls; the account flow records explicit acceptance. The exact Etsy independence notice is displayed in About's independent-service section and beside the workspace shop connection; Section 1 requires prominent display within the application without specifying the footer. Old optional documentation, guide, feature-promotion and review-explanation URLs redirect to these retained pages or the tools.

Sections 1, 3 and 4 require the underlying disclosures and behavior, not this exact page count or these names. A separate public API documentation, application-purpose, or Etsy-disclaimer page is unnecessary. Do not copy Etsy's API Terms into podadd's Terms. These private notes are not published as a review page.

## Implementation matrix

| Review point | Repository behavior and evidence | Remaining operator/deployment step |
| --- | --- | --- |
| Real purpose change (§3/§5) | Research/history/watchlist and marketing APIs are retired; workspace becomes manual listing preparation. | Deploy the revised version and accurately disclose the former research purpose. |
| Same application (§2/§3) | Owner review UI identifies `png-scout` → `podadd` and requires same-application confirmation. | Update/request reconsideration of the existing application, rather than register a replacement to evade review. |
| Default access gate (§3/§6) | `lib/etsy-access.ts` blocks calls without purpose/key-bound approval. Saving credentials alone cannot enable calls. | Obtain actual approval; recording an operator assertion is not independent verification. |
| Access mode (§2) | Review record distinguishes seller/personal/commercial. Initial API testing is restricted to the declaring operator's podadd account; this is an implementation limit, not Etsy's definition of Personal Access. Broader account access in this version requires the commercial declaration. | Request Personal App review for limited developer-managed testing, accurately describe the future public audience, and confirm Etsy's approved scope before enabling access. Use the Seller path only if actual own-shop eligibility is established. |
| Least privilege (§5) | `lib/connections.ts` requests only `listings_r`; own listing route derives seller ownership from the grant. No receipt/payment/buyer requests. | Register the exact HTTPS callback and authorize an eligible own seller account only after approval. |
| Legacy grants (§4/§6) | Credential changes, revised approval, withdrawal, and observed access denial remove stored Etsy seller grants and pending state. Purpose binding blocks older grants. | Deploy the changes, remove legacy research records through owner cleanup, and revoke obsolete remote grants where appropriate. |
| Freshness (§5) | Own catalogue has no research-database persistence and expires within six hours. Connection status uses a generic label rather than redisplaying an indefinitely stored shop name. New/refreshed grants do not retain that name; catalogue names come from current requests. | Verify deployed expiry, reconnect legacy grants where needed, and remove obsolete stored records. |
| Stored Etsy data (§4/§5/§6) | Explicit owner purge covers legacy cache/history/watchlist and Etsy authorization state, not manually entered drafts. | Perform reviewed cleanup on the actual deployment; source updates alone do not delete cloud data. |
| Browser table access (§4) | Upgrade SQL closes legacy authenticated watchlist reads. | Apply `supabase/etsy-review-migration.sql` and test Supabase Data API permissions on the real project. |
| Enforceable acceptance (§3) | Server validates current-version signup acceptance; existing users reaccept through `/api/terms`. Timestamp/version records are stored per account. | Ensure legal/operator details are accurate; technical receipts do not establish universal legal enforceability. |
| Operator/support (§3) | Dynamic public contact uses supplied legal operator name `AYOUB CHIBANE` and support email `elgatoa82@gmail.com`. Old product-name defaults normalize to the supplied legal name; custom operator settings stay editable. | Actually monitor the chosen inbox and supply any additional identity information Etsy requests. |
| Warranty allocation (§3) | Terms use original wording identifying the operator as provider and excluding Etsy as app provider/warrantor. | Review applicable local requirements before publication. |
| Privacy (§4) | Public policy describes encrypted manual drafts, acceptance records, grant state, temporary own catalogue and deletion choices. | Confirm hosting regions/retention in the deployed services and process verified privacy requests. |
| Content rights/brand (§1/§5) | Original podadd branding; own/manual content controls; independent-service notice. No copied assets or approval claims. | Remove retired feature promotion and verify all live routes/downloads match the new scope. |
| Third-party promotion (§5) | Direct Pinterest and campaign APIs are unavailable; public email tool only edits owned text locally. | Review obsolete provider/campaign records in server settings separately; manage old remote pins/campaign schedules directly with those providers. |
| Withdrawal/incident operations (§3/§6/§7) | Owner can withdraw access; revoked-state gate prevents continued use. | Maintain an incident contact process, promptly handle seller requests, and follow Etsy's applicable withdrawal/notification procedure. |

## Concise portal description

Use this description only after verifying that the deployed version matches it. Submit it as an update to the existing `png-scout` application record; the public name is now `podadd`.

> podadd is a free listing-preparation application operated by AYOUB CHIBANE, previously submitted as png-scout. We request Personal App review for limited developer-managed testing. With approval and OAuth listings_r, the operator's podadd account can review its authorized shop's active and draft listing titles, descriptions, tags, and prices alongside independently entered drafts and editing notes. Access is read-only. Marketplace research, analytics, scraping, API watchlists, marketing integrations, and order/buyer data access are retired. Future access for other sellers requires review and authorization appropriate to the intended scale.

The live HTTPS review URL, exact callback URL, and existing application identifier remain operator-supplied fields. Verify them in the same Developer Portal record. Do not describe a functioning live connection, a deployed migration, or approval unless it has actually been verified.

## Unsent draft for reconsideration

Complete placeholders and verify the actual deployed behavior before sending this yourself. This draft is based on current application facts and contains no quotation from private correspondence.

Subject: Revised purpose and name for existing application png-scout / podadd

Hello Etsy Developer Support,

I am requesting review of a revised purpose for my existing application previously submitted as png-scout. Its public name is now podadd. This is a change to the same application, not a second application.

The earlier description proposed public listing search, matching-result counts, keyword research, and product watchlists for digital downloads. I have changed the implementation to seller-owned listing preparation and manual planning tools. The account workspace stores the seller's manually entered draft title, description, tags, notes, and optional reference link. Public tools use user-entered text or financial assumptions.

Marketplace/competitor research, API keyword analytics, historical metric tracking, the Etsy-linked extension, order/receipt reporting, API Pinterest publishing, and email campaigns are unavailable in the revised application.

The proposed API purpose is read-only review of the authorizing seller's own active and draft listings. Titles, descriptions, tags, and prices are shown temporarily so the seller can review their current listing text while preparing independent manual drafts and editing notes. Only listings_r is requested. podadd does not publish listing changes, request buyer emails or order/payment data, persist the retrieved catalogue as drafts, send Etsy content to marketing services, or use it for AI training.

I request Personal App review for limited developer-managed testing. The public manual tools and private draft workspace are free and are intended for future use by other sellers. Initially, the API connection is restricted to my operator account in podadd, after approval and valid seller authorization. Public signup does not enable API access for other accounts. I am not claiming eligibility for the registered-own-shop-only Seller App path. I will request the appropriate authorization before expanding API access to a broader audience.

Etsy access is disabled by default. The revised server gate requires approval covering the purpose and current application credentials. Seller OAuth uses HTTPS callbacks, PKCE and single-use state. Updated Terms and Privacy require explicit server-recorded acceptance. The operator provides support, and the terms distinguish the operator's service responsibilities from Etsy's role.

Please advise how to update and reconsider the existing application record for this revised purpose and confirm whether Personal App review is the appropriate path for this limited initial testing scope.

Review URL: [LIVE_HTTPS_URL]
Purpose/operator: [LIVE_HTTPS_URL]/about
Support: [LIVE_HTTPS_URL]/contact
Application terms and privacy: [LIVE_HTTPS_URL]/terms and [LIVE_HTTPS_URL]/privacy
Operator/contact: AYOUB CHIBANE / elgatoa82@gmail.com
Current application identifier: [EXISTING_APPLICATION_IDENTIFIER]
Initial API audience: the operator's podadd account only, after approval and valid seller authorization.
Future API audience: other consenting sellers, only after authorization appropriate to the intended scale.

Thank you.

## Before submission

Verify actual deployment, terms reacceptance, default blocked access, revoked-state behavior, own-draft isolation, expired-view handling, all retired API/download routes, and applied database permissions. Execute legacy cleanup deliberately through the owner control if records exist. Confirm the revised name/purpose in the same Developer Portal record and document the intended approved audience. Do not claim a purge, live connection test, or written approval was completed if it was not. No external communications or live provider/database writes were made during development.

**Not performed by the source update:** production deployment, execution of `supabase/etsy-review-migration.sql` against the real Supabase project, deletion of legacy cloud records, authorization of an Etsy seller account, submission of this draft, or approval by Etsy. Complete and verify those external steps separately. Record an approval declaration only after actual approval exists.

Approval remains Etsy's decision. Any future purpose expansion needs a fresh review against the applicable terms and actual permission.
