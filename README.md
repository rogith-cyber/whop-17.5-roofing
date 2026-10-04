# Northline Roofing Co. — Whop Websites template

A responsive, original roofing-company website built with React, Vite, and Whop Websites. Update company name, contact details, service area, service cities, offer copy, and prices in `src/siteConfig.ts`; replace the clearly marked sample review layout with genuine, permissioned reviews before using it for a real business.

## Whop features implemented

This template uses Whop Website hosting and Whop Payments Elements (checkout, express wallet checkout, and the required BrandingElement), includes one-time Whop plans for a $149 roof inspection, $500 project deposit, and $850 flat-rate repair, saves an explicitly authorized payment method through a Whop setup intent before deposit checkout, creates quote-request Leads through the Whop API, supports manual or authorized automatic final-balance invoicing through the Whop Invoices API, and tracks `estimate_requested`, `service_viewed`, and `deposit_started` with `whop.track`.

## Request and payment flow

The inspection and repair buttons open Whop Elements checkout for their configured Whop plans. The deposit button first collects the buyer's email and explicit authorization to save a payment method through Whop Elements setup mode, verifies the setup intent on the server, then opens the $500 deposit plan checkout. Off-site bank verification returns to the site and resumes the deposit checkout after the server verifies the setup.

The estimate form is a separate callback request. Submitting it creates a Whop Lead containing the homeowner's contact details and selected service; it does not charge them. The server derives the offer name and example price from `src/siteConfig.ts` and never accepts a client-provided amount for checkout. A team member calls to verify the job scope, availability, and final price.

The operator-only invoice tool at the bottom of the page creates Whop invoices for the final balance or another agreed amount. Leaving the saved payment method blank sends a hosted invoice for manual payment; selecting a saved method requests automatic collection. Only use the stored method for an amount the customer has authorized. Set a private `WHOP_INVOICE_ADMIN_TOKEN` of at least 32 characters in Whop app secrets before enabling this tool. The token is not prefilled in the page and must never be exposed in frontend code.

On Whop hosting, the request API uses the runtime-provided `WHOP_API_ORIGIN` and `WHOP_ACCOUNT_ID`; Whop injects authentication for server-side API requests, so no API key needs to be placed in frontend code or added as a hosted secret. For local development, prefer `whop apps dev`, which supplies the same runtime bindings. A direct local Vite server instead needs server-only `WHOP_API_KEY` and `WHOP_COMPANY_ID`. The operator invoice tool additionally requires a private `WHOP_INVOICE_ADMIN_TOKEN` configured as a Whop app secret. Never expose credentials in `VITE_` variables or commit them.

## Local development

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev -- --host 0.0.0.0
```

The template fires `estimate_requested` after Whop confirms a lead, `service_viewed` when a service card enters view, and `deposit_started` when the deposit request is selected or resumed after bank verification. Whop Websites tracks page views and checkout events automatically on the published domain.

Review names, quotes, ratings, licensing details, and company credentials are clearly identified as sample content or fields to verify. Replace them with genuine, permissioned reviews and substantiated business details before launch. Payment availability and financing terms depend on Whop approval, the offer, buyer location, and device; the site does not promise any financing provider or rate.

## Checks

```powershell
npm run build
npm run lint
```

## Publish on Whop

1. Install the [Whop CLI](https://docs.whop.com/developer/cli), run `whop auth login`, and select the business that owns the Website app.
2. Register a Website app and claim its hosted route:

   ```powershell
   npx whop apps init --name "Northline Roofing" --route northline-roofing-co --app_type website
   ```

3. Configure the server-only secrets described above using Whop app secrets. Use sandbox credentials and `WHOP_ENV=sandbox` for API testing.
4. Run `whop apps dev`, test the estimate form against the sandbox, and verify the Lead appears in Whop. Use test payment details to exercise the Elements checkout and setup-intent flow; do not test with real customer cards.
5. Run `whop apps deploy`. The configured route is `https://northline-roofing-co.whop.site`.

The Cloudflare Worker API routes in `worker/index.ts` and local Vite middleware in `server/whopApi.ts` both use the handlers in `server/whopService.ts`. The Vite `ssr` environment outputs to `dist/server`, the server-bundle location Whop Websites executes; keep this output path when adapting the template.

## Whop references

- [Websites CLI quickstart](https://docs.whop.com/developer/websites/quickstart)
- [Pixel tracking](https://docs.whop.com/developer/websites/tracking)
- [Create a lead](https://docs.whop.com/api-reference/leads/create-lead)
- [Create an invoice](https://docs.whop.com/api-reference/invoices/create-invoice)

## Active demo plans

- Inspection: `$149` — `plan_FxXNuw6ZCcvez`
- Project deposit: `$500` — `plan_XRMQQzBIW7Wgc`
- Flat-rate repair: `$850` — `plan_y5o24VxsXn9SQ`
