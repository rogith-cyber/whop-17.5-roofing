import { WhopClient } from '@whop/sdk'
import { siteConfig } from '../src/siteConfig.js'

export interface WhopBindings {
  WHOP_ACCOUNT_ID?: string
  WHOP_API_KEY?: string
  WHOP_API_ORIGIN?: string
  WHOP_COMPANY_ID?: string
  WHOP_ENV?: string
  WHOP_INVOICE_ADMIN_TOKEN?: string
  WHOP_SETUP_RETURN_URL?: string
}

type Body = Record<string, unknown>
class InputError extends Error {}
class ConfigError extends Error {}

const maxBodyBytes = 16_384

function getClient(bindings: WhopBindings) {
  const baseUrl = bindings.WHOP_ENV === 'sandbox'
    ? 'https://sandbox-api.whop.com/api/v1'
    : bindings.WHOP_API_ORIGIN
      ? new URL('/api/v1', bindings.WHOP_API_ORIGIN).toString()
      : 'https://api.whop.com/api/v1'
  if (!bindings.WHOP_API_KEY && bindings.WHOP_API_ORIGIN && bindings.WHOP_ENV !== 'sandbox') {
    return new WhopClient({ auth: false, baseUrl })
  }
  if (!bindings.WHOP_API_KEY) {
    throw new ConfigError('WHOP_API_KEY is missing. Use `whop apps dev` locally or configure it in Whop app secrets.')
  }
  return new WhopClient({
    token: bindings.WHOP_API_KEY,
    baseUrl,
  })
}

function accountId(bindings: WhopBindings) {
  const id = bindings.WHOP_COMPANY_ID || bindings.WHOP_ACCOUNT_ID || siteConfig.accountId
  if (!id) throw new ConfigError('WHOP_COMPANY_ID is missing. Configure it in Whop app secrets.')
  if (!/^biz_[A-Za-z0-9]+$/.test(id)) throw new ConfigError('WHOP_COMPANY_ID must be a valid biz_ account ID.')
  return id
}

function requiredString(body: Body, key: string, maxLength = 500) {
  const value = body[key]
  if (typeof value !== 'string' || !value.trim() || value.length > maxLength) {
    throw new InputError(`Please provide a valid ${key.replaceAll('_', ' ')}.`)
  }
  return value.trim()
}

function requiredEmail(body: Body) {
  const email = requiredString(body, 'email', 254)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new InputError('Please provide a valid email.')
  return email
}

async function sameSecret(expected: string, received: string) {
  const encoder = new TextEncoder()
  const [expectedHash, receivedHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(expected)),
    crypto.subtle.digest('SHA-256', encoder.encode(received)),
  ])
  const a = new Uint8Array(expectedHash)
  const b = new Uint8Array(receivedHash)
  let difference = encoder.encode(expected).length ^ encoder.encode(received).length
  for (let i = 0; i < a.length; i += 1) difference |= a[i] ^ b[i]
  return difference === 0
}

export async function handleWhopApi(path: string, body: Body, bindings: WhopBindings): Promise<Response> {
  try {
    if (path === '/api/leads') {
      const service = requiredString(body, 'service', 80)
      const offerValue = body.offer
      const offerKey = typeof offerValue === 'string' && Object.hasOwn(siteConfig.offers, offerValue)
        ? offerValue as keyof typeof siteConfig.offers
        : undefined
      if (offerValue !== undefined && !offerKey) throw new InputError('Please select a valid service offer.')
      if (offerKey && siteConfig.offers[offerKey].service !== service) {
        throw new InputError('The selected offer does not match the requested service.')
      }
      const offer = offerKey ? siteConfig.offers[offerKey] : undefined
      const lead = await getClient(bindings).leads.create({
        account_id: accountId(bindings),
        referrer: typeof body.referrer === 'string' ? body.referrer.slice(0, 2_048) : undefined,
        metadata: {
          name: requiredString(body, 'name', 120),
          email: requiredEmail(body),
          phone: requiredString(body, 'phone', 40),
          address: requiredString(body, 'address', 240),
          service,
          message: typeof body.message === 'string' ? body.message.slice(0, 2_000) : '',
          requested_offer: offer?.label ?? 'General estimate request',
          requested_price: offer ? `${offer.price} USD` : 'To be confirmed',
          source: `${siteConfig.brand.toLowerCase()}-roofing-estimate-form`,
        },
      })
      return Response.json({ lead_id: lead.id }, { headers: { 'Cache-Control': 'no-store' } })
    }

    if (path === '/api/setup-intents') {
      const confirmationToken = requiredString(body, 'confirmation_token', 512)
      const email = requiredEmail(body)
      const intent = await getClient(bindings).setupIntents.create({
        account_id: accountId(bindings),
        confirmation_token: confirmationToken,
        email,
        currency: 'usd',
        return_url: bindings.WHOP_SETUP_RETURN_URL || undefined,
        metadata: {
          purpose: 'roofing_final_project_invoice',
          source: `${siteConfig.brand.toLowerCase()}-deposit-checkout`,
        },
      })
      return Response.json({
        setup_intent_id: intent.id,
        client_secret: intent.client_secret,
        status: intent.status,
      }, { headers: { 'Cache-Control': 'no-store' } })
    }

    if (path === '/api/setup-intents/status') {
      const setupIntentId = requiredString(body, 'setup_intent_id', 180)
      const clientSecret = requiredString(body, 'client_secret', 512)
      if (!/^sint_[A-Za-z0-9]+$/.test(setupIntentId)) throw new InputError('Invalid setup intent ID.')
      const client = getClient(bindings)
      const intent = await client.setupIntents.retrieve({ id: setupIntentId })
      if (intent.client_secret !== clientSecret || intent.account_id !== accountId(bindings)) {
        throw new InputError('The setup verification token does not match this setup intent.')
      }
      const status = await client.setupIntents.retrieveStatus({ setup_intent_id: clientSecret })
      if (status.id !== setupIntentId) throw new InputError('The setup verification token does not match this setup intent.')
      if (status.status !== 'succeeded') {
        return Response.json({ status: status.status }, { headers: { 'Cache-Control': 'no-store' } })
      }
      if (!intent.payment_method_id) {
        throw new ConfigError('Whop confirmed the setup but did not return a saved payment method.')
      }
      return Response.json({
        status: status.status,
        payment_method_id: intent.payment_method_id,
      }, { headers: { 'Cache-Control': 'no-store' } })
    }

    if (path === '/api/invoices') {
      const adminToken = bindings.WHOP_INVOICE_ADMIN_TOKEN
      if (!adminToken) {
        throw new ConfigError('WHOP_INVOICE_ADMIN_TOKEN is missing. Configure it in Whop app secrets.')
      }
      if (adminToken.length < 32) {
        throw new ConfigError('WHOP_INVOICE_ADMIN_TOKEN must be at least 32 characters long.')
      }
      const providedToken = typeof body.admin_token === 'string' ? body.admin_token.trim() : ''
      if (!await sameSecret(adminToken, providedToken)) {
        throw new InputError('Invoice access denied. Check the operator token.')
      }

      const email = requiredEmail(body)
      const customerName = typeof body.customer_name === 'string' && body.customer_name.trim()
        ? body.customer_name.trim()
        : (typeof body.name === 'string' && body.name.trim()) || email.split('@')[0]
      const invoiceTypes = {
        inspection: 'Roof inspection fee',
        deposit: 'Roofing project deposit',
        repair: 'Flat-rate shingle repair',
        final_balance: 'Final project balance',
      } as const
      const invoiceTypeValue = requiredString(body, 'invoice_type', 40)
      if (!Object.hasOwn(invoiceTypes, invoiceTypeValue)) throw new InputError('Please select a valid invoice type.')
      const invoiceLabel = invoiceTypes[invoiceTypeValue as keyof typeof invoiceTypes]
      const amount = Number(body.amount)
      if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) {
        throw new InputError('Please provide an invoice amount between $0.01 and $1,000,000.')
      }
      const paymentMethodId = typeof body.payment_method_id === 'string' ? body.payment_method_id.trim() : ''
      if (paymentMethodId && !/^payt_[A-Za-z0-9]+$/.test(paymentMethodId)) {
        throw new InputError('The saved payment method ID must start with payt_.')
      }
      const invoice = await getClient(bindings).invoices.create({
        account_id: accountId(bindings),
        collection_method: paymentMethodId ? 'charge_automatically' : 'send_invoice',
        payment_method_id: paymentMethodId || undefined,
        customer_name: customerName,
        email_address: email,
        due_date: paymentMethodId ? undefined : new Date(Date.now() + 14 * 86_400_000).toISOString(),
        product: { title: `${siteConfig.companyName} — ${invoiceLabel}` },
        plan: { plan_type: 'one_time', initial_price: amount, currency: 'usd' },
        line_items: [{ label: invoiceLabel, quantity: 1, unit_price: amount }],
      })
      return Response.json({
        id: invoice.id,
        status: invoice.status,
        hosted_invoice_url: invoice.pay_online_url,
      }, { headers: { 'Cache-Control': 'no-store' } })
    }

    return Response.json({ error: 'Not found.' }, { status: 404 })
  } catch (error) {
    if (error instanceof InputError) {
      return Response.json({ error: error.message }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
    }
    if (error instanceof ConfigError) {
      console.error(`[whop-api] ${path}`, error)
      return Response.json({ error: error.message }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
    }
    console.error(`[whop-api] ${path}`, error)
    return Response.json(
      { error: 'Whop could not complete this request. Check server logs and API permissions.' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}

export async function parseWhopBody(request: Request): Promise<Body> {
  const contentLength = Number(request.headers.get('content-length'))
  if (Number.isFinite(contentLength) && contentLength > maxBodyBytes) {
    throw new InputError('Request is too large.')
  }
  const raw = await request.text()
  if (new TextEncoder().encode(raw).length > maxBodyBytes) throw new InputError('Request is too large.')
  let body: unknown
  try {
    body = JSON.parse(raw)
  } catch {
    throw new InputError('Invalid JSON request body.')
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new InputError('Invalid request body.')
  return body as Body
}

export function inputErrorResponse(error: unknown) {
  if (error instanceof InputError) {
    return Response.json({ error: error.message }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
  }
  console.error('[whop-api] Request parsing failed', error)
  return Response.json({ error: 'Unable to process this Whop request.' }, {
    status: 500,
    headers: { 'Cache-Control': 'no-store' },
  })
}
