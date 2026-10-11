# PNG Scout — Next.js + Vercel + Supabase

A deployable version of the product-research app. The existing hosted Site is unaffected. This package uses Next.js, Vercel-compatible Node.js route handlers, Supabase PostgreSQL and Supabase email/password authentication. It uses Supabase's HTTP APIs server-side, so it does not require a PostgreSQL connection string or the Supabase JavaScript SDK.

## 1. Create Supabase and install the database

1. Create a Supabase project.
2. Open **SQL Editor**, paste `supabase/setup.sql`, and run it.
3. Keep the **Data API** enabled and the `public` schema exposed.
4. Enable email/password authentication. Keep email confirmation enabled for public registrations.
5. Copy the project URL, publishable key, and server secret key from the project's API settings. Legacy anon/service-role keys also work through the environment aliases documented below.

The SQL creates settings, administrator membership, saved products, cached searches, snapshots and request counters. RLS is enabled on every table. Authenticated clients can read only their own watchlist; server-only tables deny browser access. A restricted service-role RPC enforces the research request limit, and a database trigger enforces the 100-product watchlist cap.

## 2. Configure and run locally

Requires Node.js 22.13 or later.

```bash
npm ci
cp .env.example .env.local
```

On PowerShell, use `Copy-Item .env.example .env.local` instead of `cp`.

Fill `.env.local`:

```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_PUBLISHABLE_KEY=your_publishable_key
SUPABASE_SECRET_KEY=your_server_secret_key
SETTINGS_ENCRYPTION_KEY=your_32_byte_base64_key
```

Generate the encryption key once:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Keep this key stable and backed up. Changing it prevents decrypting stored Etsy credentials. Do not commit `.env.local`, expose the Supabase secret key in a `NEXT_PUBLIC_` variable, or send secrets in chat. Supported legacy aliases: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

```bash
npm run dev
```

Visit http://localhost:3000 for the public homepage, or http://localhost:3000/login to sign in. The protected research workspace is at `/workspace`. Free accounts can be created at `/signup`; if confirmation is enabled, confirm the email and then sign in. Passwords are sent only to the server and Supabase Auth. Session tokens are held in HttpOnly, SameSite cookies, with Secure cookies in production. Tokens are verified through Supabase before accepting identity; refresh tokens renew expired sessions.

## Public pages and free accounts

The public homepage, `/about`, `/contact`, `/privacy`, and `/terms` are available without signing in. `/signup` creates free accounts and `/login` signs existing users in. There are no paid plans, checkout, or billing features. All available tools are free; Etsy API availability and usage limits still apply.

In Supabase Authentication, enable email/password sign-in and allow new signups. Keep email confirmation enabled for public registrations. The signup screen explains when email confirmation is required, and authenticated sessions open `/workspace`.

The owner can change the contact email and operator name in `/admin` under **Public contact details**. These values are stored in the existing `app_settings` table and used on Contact, Privacy, and Terms. The initial contact is `ayoub-k10@hotmail.com`, with `PNG Scout` as the operator name. No database migration is needed for this setting.

## 3. Make yourself administrator

Create your account first (through the app or Supabase Authentication's user creation screen), then run this in Supabase SQL Editor, replacing the email:

```sql
insert into public.app_admins(user_id)
select id from auth.users where lower(email)=lower('YOUR_EMAIL@example.com')
on conflict(user_id) do nothing;
```

Check that a row was inserted. Visit `/admin` using that account. The dashboard has a left sidebar for Overview, Etsy integration, Workspace preferences, and Public contact. On phones, open the same sidebar with the navigation button. New users never receive administrator access automatically. Only a database administrator can change the membership table.

## 4. Deploy to Vercel

1. Upload this project to your own GitHub repository. Commit the source and `package-lock.json`; exclude `.env.local`, `node_modules` and `.next`.
2. In Vercel, choose **Add New → Project**, import the repository and select **Next.js**.
3. Add the four environment variables from step 2 to the Production environment. Add them separately to Preview/Development if those deployments need access; use a separate Supabase project for untrusted preview deployments.
4. Deploy. The build command is `npm run build`; use the default Next.js output setting. No Cloudflare bindings or ChatGPT sign-in are required.
5. In Supabase **Authentication → URL Configuration**, set Site URL to `https://YOUR_VERCEL_DOMAIN/login`. Add `http://localhost:3000/login` and your production `/login` URL as allowed redirect URLs. Confirm an account and sign in on the deployed app.
6. If you add a custom domain, update Supabase's Site URL and allowed redirects accordingly.

Deployment does not migrate records from the earlier Cloudflare database. This starts a fresh Supabase database. Re-enter Etsy credentials and save products again, or plan a separate data migration if existing records matter.

## 5. Activate Etsy

Open `/admin` → **Etsy integration**, enter the **approved** Etsy keystring and shared secret, save them, and click **Test saved connection**. The dashboard displays the last manual connection test, rather than continuous health monitoring. Credentials are encrypted with AES-256-GCM before database storage, and stored values never return to the browser. Public listing searches use the official `x-api-key: keystring:shared_secret` header and do not request access to private shop orders.

After connection succeeds:

- Explore the marketplace by keyword, or browse without a keyword. Filter by seller category, price range, shop location, shipping destination, currency and mature-content exclusion. Sort by relevance, price, creation or update date using Etsy's supported search parameters.
- Find a shop by its exact name, numeric ID or Etsy URL. Browse its active or featured listings, filter active listings by keyword, and explore individual shop sections.
- Look up a single listing or up to 100 listing IDs/Etsy URLs, separated by commas or whitespace.
- Switch between grid/list views, view real Etsy images, prices, tags, favorites and creation-based age, and export displayed listings when enabled by the owner.
- Page through marketplace/shop results in batches of 24, up to Etsy's 12,000 offset limit. Digital/physical filtering applies only to the displayed page; Etsy does not provide that global search filter.
- Save up to 100 products per account. Refresh a saved listing to record that day's price/favorite snapshot; history retains 30 days. Refresh is manual, not a scheduled job.
- Analyze a keyword and up to four related tags from the first result page. Competition is a heuristic based on matching API listing counts, not website ranking or demand.
- Searches are cached for 15 minutes and categories for 24 hours. Each user can issue 15 research requests per minute; Etsy's own quotas still apply. Search thumbnails and shop metadata come from Etsy's documented batch listing endpoint.

The React workspace keeps connection setup and credential diagnostics out of the user interface. Users receive concise retry, validation and no-results feedback; the owner's connection test retains the technical diagnostics in `/admin`. Authentication verifies identity before rendering the workspace, with a separate fixed session-refresh route for expired sessions.

**Not supplied by Etsy API:** competitor exact sales, reliable sales estimates, and keyword search traffic. These stay unavailable. There is no fabricated fallback dataset. Sales estimation, keyword-volume providers, scheduled jobs, billing, password recovery UI and third-party scraper integrations are not included.

## Verification

```bash
npm run typecheck
npm test
npm run build
```

Tests cover verified identity, read-only workspace authentication and session refresh, administrator membership, encryption, cross-origin rejection, Etsy search parameter validation, URL/ID validation, public error sanitization, cache isolation, currency conversion, image hydration and saved-listing metadata. A production build and mocked tests can run without real secrets; live login, Supabase SQL execution, RLS policies and Etsy connectivity require your provisioned accounts and credentials.

Production builds use two workers to keep memory usage manageable on local Windows machines.

After deployment, verify: the homepage is publicly accessible and signed-out access to `/workspace` or `/admin` redirects to login; ordinary users see Access restricted at `/admin` and receive HTTP 403 from admin APIs; two users cannot see each other's watchlists; saved settings survive reloads; the Etsy connection test succeeds; and no secrets appear in browser responses.

## Troubleshooting

- **Authentication unavailable:** check all environment variables and Supabase email/password settings.
- **Database request failed:** run the setup SQL, keep the Data API enabled, and verify the server secret key.
- **Owner access required:** ensure your authenticated user's ID exists in `app_admins`.
- **Email not confirmed:** verify the confirmation email or create a confirmed owner account through Supabase.
- **Etsy rejected access:** the key must be correct and approved for your intended use; application-specific permissions still apply.
- **Unable to decrypt credentials:** restore the original encryption key or replace the stored credentials using the current key.

Official references: https://supabase.com/docs/guides/auth/passwords · https://supabase.com/docs/guides/database/postgres/row-level-security · https://supabase.com/docs/guides/api · https://developers.etsy.com/documentation/essentials/requests/
