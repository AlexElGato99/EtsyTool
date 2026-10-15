# podadd — free listing preparation

podadd helps sellers prepare their own listing text, save manually entered drafts, and use planning tools. The revised application scope replaces the former marketplace-research purpose. It uses Next.js, Supabase HTTP APIs, and Supabase email/password authentication; Vercel is a supported deployment target.

## Run on localhost

Use Node.js 22.13 or later.

```bash
npm ci
cp .env.example .env.local
```

PowerShell: use `Copy-Item .env.example .env.local`. If PowerShell blocks the npm script shim, use `npm.cmd`.

Set the following values in `.env.local`:

```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_PUBLISHABLE_KEY=your_publishable_key
SUPABASE_SECRET_KEY=your_server_secret_key
SETTINGS_ENCRYPTION_KEY=your_32_byte_base64_key
```

Generate the encryption key once:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
npm run dev
```

Open http://localhost:3000. The account workspace is at `/workspace`, registration at `/signup`, and owner administration at `/admin`.

Keep the encryption key stable and backed up. It protects saved credentials, seller grants, and manual listing drafts. Do not commit `.env.local` or expose the server secret with a `NEXT_PUBLIC_` prefix. Legacy aliases remain supported: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

## Database and authentication

Create a Supabase project, keep its Data API enabled, and run `supabase/setup.sql` in its SQL Editor. An existing installation must also apply `supabase/etsy-review-migration.sql` before exposing the revised app; it closes old browser access to retired research storage. Review SQL before running it. Source changes do not modify a deployed database.

Enable email/password signup and email confirmation. Sessions use HttpOnly, SameSite cookies, Secure in production. Supabase verifies identity before protected access.

Manual listing drafts are encrypted in the server-only `app_settings` table under `listing-drafts:<user-id>`. Each account can store 30 drafts, with title 140 characters, description 10,000, up to 13 tags of 20 characters each, notes 2,000, and an optional manually entered listing reference. Saving a reference does not fetch Etsy data. These records are independent from legacy Etsy research data.

Signup validates explicit acceptance of the current terms version on the server. Existing users reaccept the updated terms before protected workspace actions. Acceptance records use `application-terms:<user-id>` with a server timestamp, version, mechanism, and policy paths. The current version is `2026-10-15-listing-preparation-v1`. An acceptance log is technical evidence of an action, not a guarantee of enforceability in every jurisdiction.

## Make the owner account

Create your account, then run this in Supabase SQL Editor with your own email:

```sql
insert into public.app_admins(user_id)
select id from auth.users where lower(email)=lower('YOUR_EMAIL@example.com')
on conflict(user_id) do nothing;
```

Verify that membership exists. Users never become owners automatically.

The admin sidebar contains Overview, Etsy integration, Workspace details, Public contact, and **Etsy review & data**. Public contact email and operator name remain editable. The supplied legal operator name is **AYOUB CHIBANE**, and the initial support email is `ayoub-k10@hotmail.com`; this does not imply a company registration or address. Old product-name operator defaults display the supplied legal name; custom legal names remain unchanged.

## Current scope

The public site explains the supported listing workflow and provides free manual tools: title/tag preparation, fee and profit planning, shop-name suggestions, privacy and email drafts, and local task reminders. Calculators use entered assumptions. Privacy drafts require review. Browser email drafting does not send a message.

Keep the public site focused: Home explains the purpose, About identifies the operator and supported work, Contact provides support, and Terms and Privacy describe the agreement and data handling. The public tools remain usable, and signup/login lead to the working private workspace. Optional technical documentation, marketing, and review-explanation pages are not necessary for an Etsy application; old URLs redirect to the retained pages. The Etsy independence notice remains visible in the footer and the service responsibilities are stated in Terms.

Etsy requires the relevant disclosures, support, enforceable user acceptance, and compliant functionality; it does not prescribe a particular number of public pages. Do not copy Etsy's API Terms into a new podadd policy or present these pages as proof of approval. See [Etsy API Terms, sections 1, 3 and 4](https://www.etsy.com/legal/api/).

The account workspace saves and edits your manually entered listing drafts. An optional, approved seller catalogue is a separate read-only view of the connected seller's own active and draft listings. It lets the authorizing seller review their current title, description, tags, and price while preparing separate manual drafts and editing notes. podadd does not publish changes to Etsy or import API content into saved drafts. Retrieved content is not used for competitor research or transferred to marketing platforms.

Marketplace search, keyword competition, competitor metrics, saved API watchlists/history, order/receipt reporting, browser-extension research, direct Pinterest publication, and email campaign APIs are retired. Legacy API routes return HTTP410 rather than serving old results. Obsolete extension downloads and feature promotions must remain retired in deployment. Internal historical folder/cookie names may remain for compatibility; they do not enable those features.

## Etsy access is disabled by default

Saving a key does not activate Etsy. The server requires a current approval declaration bound to the saved key/secret and the fixed application-purpose version before requests, OAuth flows, or seller catalogue access.

The operator must first obtain approval covering the revised purpose for the **same existing application** previously submitted as `png-scout`, now named `podadd`. Disclose both the name and purpose changes. Do not create a second application to evade a review decision. Record only an approval reference/date in administration; keep the actual correspondence private.

The fixed purpose is seller-owned listing preparation using the connected seller's own active and draft listings. OAuth requests only `listings_r`. Buyer emails, orders, payments, and marketing connections are not requested. PKCE, single-use state, exact HTTPS callbacks, and purpose/approval-bound grants protect the connection.

Current [Etsy access documentation](https://developers.etsy.com/documentation/) distinguishes own-shop Seller Apps, reviewed limited-scale Personal Apps, and Commercial Access for broader seller adoption. Request review of the existing application as a **Personal App for limited developer-managed testing**, because the public free application is intended for future use by other sellers. Initially, this implementation permits the optional API connection only for the operator's podadd account after actual approval and valid seller authorization. Free public manual tools and account registration do not enable API access for other users.

The seller/personal owner-only restriction is a conservative implementation limit, not Etsy's definition of Personal Access. Broader account access in this version requires a commercial declaration and must also be covered by Etsy's actual approval. A Seller App is appropriate only if the operator actually qualifies for the registered-own-shop-only path; no active Etsy shop ownership has been established here. Free pricing does not determine access classification. The owner's recorded declaration does not grant or independently verify Etsy approval.

When valid approval exists, save the same application's key/secret in **Etsy integration**, then complete **Etsy review & data**. Register the exact live HTTPS callback `https://YOUR_DOMAIN/api/connections/etsy/callback`. Credential changes, a revised approval declaration, withdrawal, and an observed access denial remove stored Etsy seller grants and pending authorization state. Withdrawn, revoked, mismatched, or absent approval blocks access. An owner test is subject to the same gate.

Catalogue responses are not cached in the research database. Listing content must be refreshed or hidden within six hours; other Etsy content within 24 hours. New requests obtain current data. The browser catalogue view must enforce expiry rather than displaying an old tab indefinitely.

## Withdrawal and legacy cleanup

**Withdraw access** disables Etsy requests, removes saved app credentials, and removes stored seller grants and pending authorization state. **Remove previously stored Etsy data** is a separate owner action requiring explicit confirmation. It also deletes old Etsy caches, snapshots, and watchlists while preserving independently entered listing drafts.

No live cleanup is executed during development or by applying the source changes. After deployment, the owner must use the reviewed cleanup action on the real installation if legacy records exist. Deployment checks must also confirm direct browser access to old tables is revoked. Local disconnect does not revoke a grant on Etsy’s website.

Retired independent provider records from earlier versions may remain in server settings or the provider's account. They cannot be used through the retired campaign/publishing APIs. Review server-only settings keys `provider_credentials`, `connections:<user-id>:pinterest`, `connections:<user-id>:pinterest:oauth`, `connections:<user-id>:email`, and `campaigns:<user-id>:resend` for obsolete credentials, consent records, and campaign references. Remove unnecessary records through the deployed database after reviewing the affected accounts; the Etsy-specific cleanup control does not claim to remove these separate records. Manage remote grants and any previously scheduled external actions in the provider’s own account; an application update cannot recall delivered mail or published pins.

## Deploy and verify

1. Import this source into Vercel with the Next.js preset and the required server environment variables. Exclude `.env.local`, `node_modules`, and `.next`.
2. Set Supabase’s Site URL and allowed authentication redirects for the production domain; include localhost for local development.
3. Apply the reviewed database setup/upgrade SQL, then build and deploy the revised source.
4. Verify free signup, terms reacceptance, own-draft isolation, edits/deletion, owner restrictions, and disabled Etsy access without approval.
5. Review the operator details, support inbox, current HTTPS domain, and application name/purpose in the existing Etsy Developer Portal record. Perform approved seller OAuth testing only after actual authorization exists.

```bash
npm run typecheck
npm test
npm run build
```

Tests use mocked provider/database requests. They do not establish live database permissions, approved access, or successful real account authorization. No Etsy API requests, provider messages, or cloud data deletion are performed as part of development verification.

The private implementation audit, concise portal description, and unsent same-application reconsideration draft are in [docs/etsy-api-review.md](docs/etsy-api-review.md). They contain public policy references and application facts, not private review correspondence. The live review URL and existing application identifier must be supplied and verified by the operator. Etsy decides whether to approve an application; code and documentation changes cannot guarantee approval.
