import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { loadWhop } from '@whop/elements'
import {
  WhopElements,
  Checkout,
  CheckoutElement,
  ExpressCheckoutElement,
  BrandingElement,
  Payments,
  PaymentElement,
  EmailElement,
  usePayments,
  useWhop,
  type CheckoutPaymentCompletion,
  type CheckoutSetupCompletion,
  type CheckoutWaitlistCompletion,
} from '@whop/elements-react'
import roofHome from './assets/roof-home.jpg'
import roofDetail from './assets/roof-detail.jpg'
import { siteConfig, type OfferKey } from './siteConfig'
import './App.css'

const config = siteConfig
const currentYear = new Date().getFullYear()
const formatPrice = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount)

type Pixel = { track: (event: string, data?: Record<string, unknown>) => void }
type EstimateRequest = {
  key: OfferKey
  label: string
  service: string
  price: number
  priceLabel: string
  planId: string
  headline: string
  description: string
  cardEyebrow: string
  cardTitle: string
  cardDescription: string
  actionLabel: string
  features: string[]
}

declare global {
  interface Window {
    whop?: Pixel
  }
}

function track(event: string, data?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && window.whop?.track) {
    window.whop.track(event, data)
  }
}

function hasDepositSetupReturn() {
  return typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).get('deposit_setup') === 'complete'
}

type DepositSetupContext = {
  setupIntentId: string
  clientSecret: string
  email: string
}

function getDepositSetupContext(): DepositSetupContext | null {
  try {
    const value = sessionStorage.getItem('northline-deposit-setup')
    if (!value) return null
    const context = JSON.parse(value) as Partial<DepositSetupContext>
    if (
      typeof context.setupIntentId !== 'string'
      || typeof context.clientSecret !== 'string'
      || typeof context.email !== 'string'
    ) return null
    return {
      setupIntentId: context.setupIntentId,
      clientSecret: context.clientSecret,
      email: context.email,
    }
  } catch {
    return null
  }
}

function saveDepositSetupContext(context: DepositSetupContext) {
  try {
    sessionStorage.setItem('northline-deposit-setup', JSON.stringify(context))
    return true
  } catch {
    return false
  }
}

function clearDepositSetupContext() {
  try {
    sessionStorage.removeItem('northline-deposit-setup')
  } catch {
    // Browser storage may be disabled; the return URL is still cleaned separately.
  }
}

function getDepositSetupReturnError() {
  if (!hasDepositSetupReturn()) return ''
  return getDepositSetupContext()
    ? ''
    : 'Bank verification could not resume in this browser. Please try saving the card again.'
}

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, string> = {
    arrow: 'M5 12h14m-7-7 7 7-7 7',
    check: 'm5 12 4 4L19 6',
    roof: 'm3 11 9-8 9 8M5 10v10h14V10M9 20v-6h6v6',
    shield: 'M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z',
    sun: 'M12 3v2m0 14v2M5.64 5.64l1.42 1.42m9.88 9.88 1.42 1.42M3 12h2m14 0h2M5.64 18.36l1.42-1.42m9.88-9.88 1.42-1.42M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
    tool: 'm14.7 6.3 3 3M4 20l7.5-7.5m2-6A5 5 0 0 0 20 13l-3.5 3.5L13 13l3.5-3.5A5 5 0 0 0 9 3.5L5.5 7 9 10.5',
    clock: 'M12 8v4l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
    pin: 'M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Zm-5 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
    phone: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.2 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.62 2.63a2 2 0 0 1-.45 2.11L8 9.73a16 16 0 0 0 6 6l1.27-1.28a2 2 0 0 1 2.11-.45c.85.29 1.73.5 2.63.62A2 2 0 0 1 22 16.92Z',
    menu: 'M4 7h16M4 12h16M4 17h16',
    close: 'M18 6 6 18M6 6l12 12',
    star: 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z',
    creditCard: 'M3 10h18M7 15h2m4 0h4M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z',
    lock: 'M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2Zm-7-7a4 4 0 0 0-4 4v3h8V8a4 4 0 0 0-4-4Z',
    sparkles: 'm12 3 1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3Zm6 12 1 2.5 2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1 1-2.5Z',
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] ?? paths.roof} />
    </svg>
  )
}

function EstimateForm({
  selectedOffer,
  service,
  onServiceChange,
  onOpenCheckout,
}: {
  selectedOffer: EstimateRequest | null
  service: string
  onServiceChange: (service: string) => void
  onOpenCheckout: (key: OfferKey) => void
}) {
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setStatus('')
    setSubmitting(true)
    const form = new FormData(event.currentTarget)
    const fields = Object.fromEntries(form.entries())
    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      })
      const contentType = response.headers.get('content-type') ?? ''
      if (!contentType.includes('application/json')) {
        throw new Error(
          response.status === 404
            ? 'Our request form is temporarily unavailable. Please call us and we’ll help you directly.'
            : 'We couldn’t reach the request service. Please try again or call us.',
        )
      }
      const result = (await response.json()) as { error?: string; lead_id?: string }
      if (!response.ok) throw new Error(result.error ?? 'We couldn’t send your request. Please try again.')

      track('estimate_requested', {
        event_id: result.lead_id,
        service: fields.service,
        offer: fields.offer,
      })

      setStatus(
        `Estimate request confirmed (Lead ID: ${result.lead_id || 'saved'}). Our team will call within 1 business day to verify details and confirm the scope.`,
      )
      formRef.current?.reset()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'We couldn’t send your request. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="estimate-form" ref={formRef} onSubmit={submit}>
      {selectedOffer && <input type="hidden" name="offer" value={selectedOffer.key} />}
      <div className="form-row">
        <label>
          Full name
          <input name="name" required autoComplete="name" placeholder="Jordan Miller" />
        </label>
        <label>
          Phone number
          <input name="phone" type="tel" required autoComplete="tel" placeholder={config.phone} />
        </label>
      </div>
      <label>
        Email address
        <input name="email" type="email" required autoComplete="email" placeholder="jordan@email.com" />
      </label>
      <label>
        What can we help with?
        <select
          name="service"
          required
          value={service}
          onChange={(event) => {
            onServiceChange(event.target.value)
          }}
        >
          <option value="" disabled>
            Select a roofing service
          </option>
          {Object.values(config.offers).map((offer) => (
            <option key={offer.key} value={offer.service}>{offer.service}</option>
          ))}
          <option>Storm damage</option>
          <option>Other / not sure</option>
        </select>
      </label>
      <label>
        Property address
        <input name="address" required autoComplete="street-address" placeholder="Street address, city, ZIP" />
      </label>
      <label>
        Tell us a little more
        <textarea name="message" rows={3} placeholder="What are you seeing? When did it start? Roof slope or roof age?" />
      </label>

      {selectedOffer && (
        <div className="form-offer-callout">
          <div>
            <span>Selected Plan:</span>
            <strong>{selectedOffer.label}</strong> · {formatPrice(selectedOffer.price)}
          </div>
          <button
            type="button"
            className="button button-gold button-sm"
            onClick={() => onOpenCheckout(selectedOffer.key)}
          >
            <Icon name="creditCard" size={14} /> Pay / Deposit Online
          </button>
        </div>
      )}

      <button type="submit" className="button button-gold form-submit" disabled={submitting}>
        {submitting ? 'Submitting to Whop Leads…' : 'Submit Free Estimate Request'} {!submitting && <Icon name="arrow" />}
      </button>

      {status && (
        <p className="form-success" role="status">
          <Icon name="check" />
          {status}
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <p className="form-privacy">
        <Icon name="lock" size={12} />
        Your request goes to the Whop Leads API. It does not create a charge.
      </p>
    </form>
  )
}

function DepositSetupForm({
  onSaved,
}: {
  onSaved: (paymentMethodId: string, email: string) => void
}) {
  const payments = usePayments()
  const whop = useWhop()
  const [email, setEmail] = useState('')
  const [authorized, setAuthorized] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function savePaymentMethod(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!payments || !whop || !email) {
      setError('Enter your email and wait for the secure payment form to load.')
      return
    }
    if (!authorized) {
      setError('Please authorize storage of this payment method for the separately agreed final invoice.')
      return
    }

    setBusy(true)
    setError('')
    try {
      const confirmation = await payments.createConfirmationToken({
        billingDetails: { email },
      })
      const createResponse = await fetch('/api/setup-intents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmation_token: confirmation.confirmationToken,
          email,
          return_url: window.location.href,
        }),
      })
      const createType = createResponse.headers.get('content-type') ?? ''
      if (!createType.includes('application/json')) {
        throw new Error('Whop could not start secure card setup. Please try again.')
      }
      const intent = await createResponse.json() as {
        error?: string
        setup_intent_id?: string
        client_secret?: string
        status?: string
      }
      if (!createResponse.ok) throw new Error(intent.error ?? 'Whop could not start secure card setup.')
      if (!intent.setup_intent_id || !intent.client_secret) {
        throw new Error('Whop returned an incomplete setup response. No card was saved.')
      }

      if (!saveDepositSetupContext({
        setupIntentId: intent.setup_intent_id,
        clientSecret: intent.client_secret,
        email,
      })) {
        throw new Error('This browser could not securely resume bank verification. Please enable session storage and try again.')
      }
      if (intent.status === 'requires_action' || intent.status === 'processing') {
        const returnUrl = new URL(window.location.href)
        returnUrl.hash = ''
        returnUrl.searchParams.set('deposit_setup', 'complete')
        const action = await whop.payments.handleNextAction({
          clientSecret: intent.client_secret,
          returnUrl: returnUrl.toString(),
        })
        if (action.redirected) return
        if (action.status !== 'succeeded') {
          throw new Error('Finish the bank verification step before continuing.')
        }
      }

      let setup: { error?: string; status?: string; payment_method_id?: string } = {}
      for (let attempt = 0; attempt < 30; attempt += 1) {
        const statusResponse = await fetch('/api/setup-intents/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            setup_intent_id: intent.setup_intent_id,
            client_secret: intent.client_secret,
          }),
        })
        const statusType = statusResponse.headers.get('content-type') ?? ''
        if (!statusType.includes('application/json')) {
          throw new Error('Whop could not verify the saved payment method.')
        }
        setup = await statusResponse.json() as typeof setup
        if (!statusResponse.ok) throw new Error(setup.error ?? 'Whop could not verify the saved payment method.')
        if (setup.status !== 'processing') break
        await new Promise((resolve) => window.setTimeout(resolve, 1_000))
      }
      if (setup.status !== 'succeeded' || !setup.payment_method_id) {
        throw new Error(`Payment method status is ${setup.status ?? 'unknown'}; it has not been confirmed as saved.`)
      }
      clearDepositSetupContext()
      onSaved(setup.payment_method_id, email)
    } catch (cause) {
      clearDepositSetupContext()
      setError(cause instanceof Error ? cause.message : 'Unable to save this payment method.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="deposit-setup-form" onSubmit={savePaymentMethod}>
      <p>Step 1 of 2 · Securely save a payment method for the final invoice.</p>
      <Payments
        accountId={config.accountId}
        currency="usd"
        mode="setup"
        setupFutureUsage="off_session"
        fallback={<div className="whop-elements-loading">Loading Whop’s secure payment fields…</div>}
      >
        <EmailElement
          placeholder="you@example.com"
          onChange={({ email: nextEmail }) => setEmail(nextEmail)}
        />
        <PaymentElement />
        <BrandingElement />
      </Payments>
      <label className="setup-consent">
        <input
          type="checkbox"
          checked={authorized}
          onChange={(event) => setAuthorized(event.target.checked)}
        />
        I authorize {config.companyName} to securely store this payment method for a separately agreed final project invoice. Saving it does not charge me.
      </label>
      <button className="button button-dark setup-submit" type="submit" disabled={busy}>
        {busy ? 'Verifying with Whop…' : 'Save card securely'}
      </button>
      {error && <p className="form-error" role="alert">{error}</p>}
    </form>
  )
}

function CheckoutModal({
  offer,
  initialSavedMethod,
  setupReturnPending,
  setupReturnError,
  onClose,
  onPaymentMethodSaved,
}: {
  offer: EstimateRequest
  initialSavedMethod: { id: string; email: string } | null
  setupReturnPending: boolean
  setupReturnError: string
  onClose: () => void
  onPaymentMethodSaved: (paymentMethodId: string, email: string) => void
}) {
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'express'>('card')
  const [savedMethod, setSavedMethod] = useState<{ id: string; email: string } | null>(initialSavedMethod)
  const [completedResult, setCompletedResult] = useState<{
    type: string
    id: string
  } | null>(null)

  const elementsLoader = useMemo(() => {
    if (typeof window === 'undefined') return null
    return loadWhop()
  }, [])

  function handleComplete(
    completion: CheckoutPaymentCompletion | CheckoutSetupCompletion | CheckoutWaitlistCompletion,
  ) {
    if (completion.result !== 'payment') return
    setCompletedResult({ type: 'payment', id: completion.paymentId })
    track('checkout_completed', {
      offer: offer.label,
      plan_id: offer.planId,
      amount: offer.price,
      transaction_id: completion.paymentId,
    })
  }

  return (
    <div className="dialog-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="payment-dialog" role="dialog" aria-modal="true" aria-labelledby="checkout-dialog-title">
        <button className="dialog-close" aria-label="Close modal" onClick={onClose}>
          <Icon name="close" size={20} />
        </button>

        <div className="checkout-dialog-header">
          <span className="eyebrow">WHOP PAYMENTS SECURE CHECKOUT</span>
          <h2 id="checkout-dialog-title">{offer.label}</h2>
          <p>{offer.description}</p>
        </div>

        <div className="checkout-plan-summary">
          <div className="checkout-price-row">
            <div>
              <span className="plan-name">{offer.label}</span>
              <small className="plan-sub">{offer.priceLabel}</small>
            </div>
            <div className="plan-amount">{formatPrice(offer.price)}</div>
          </div>

          <ul className="checkout-features">
            {offer.features.map((feat, idx) => (
              <li key={idx}>
                <Icon name="check" size={14} />
                {feat}
              </li>
            ))}
          </ul>

          <div className="financing-pill-callout">
            <Icon name="sparkles" size={16} />
            <span>
              <strong>Payment options:</strong> Whop shows available methods at checkout; financing eligibility and terms vary.
            </span>
          </div>

          {offer.key === 'deposit' && (
            <div className="card-on-file-notice">
              <Icon name="lock" size={15} />
              <div>
                <strong>Card-on-File Protection:</strong>
                <p>
                  Your payment method is saved securely via Whop Setup Intent. After the work is complete, the agreed balance can be charged with your authorization or sent as a manual invoice.
                </p>
              </div>
            </div>
          )}
        </div>

        {setupReturnPending ? (
          <div className="whop-elements-loading" role="status">
            Verifying the saved payment method with Whop before continuing…
          </div>
        ) : completedResult ? (
          <div className="checkout-success-box">
            <div className="success-icon">
              <Icon name="check" size={28} />
            </div>
            <h3>Whop payment completed</h3>
            <p>
              Whop confirmed the {formatPrice(offer.price)} payment for <strong>{offer.label}</strong>. The transaction is handled securely by Whop.
            </p>
            <div className="success-details">
              <span>Payment reference:</span>
              <code>{completedResult.id}</code>
            </div>
            <p className="success-next-step">
              {offer.key === 'deposit' && savedMethod
                ? 'Your payment method was saved for the final invoice with your consent. Our team will call to confirm project dates.'
                : 'Our team will call to confirm your service details and schedule.'}
            </p>
            <button className="button button-gold" onClick={onClose}>
              Back to Website
            </button>
          </div>
        ) : offer.key === 'deposit' && !savedMethod ? (
          <div className="whop-elements-wrapper">
            <div className="setup-step-heading">
              <h3>Save a card, then pay your deposit</h3>
              <p>Nothing is charged while saving your card. Next, Whop securely checks out your {formatPrice(config.offers.deposit.price)} deposit.</p>
            </div>
            {setupReturnError && <p className="form-error" role="alert">{setupReturnError}</p>}
            <WhopElements elements={elementsLoader}>
              <DepositSetupForm onSaved={(id, email) => {
                setSavedMethod({ id, email })
                onPaymentMethodSaved(id, email)
              }} />
            </WhopElements>
          </div>
        ) : (
          <div className="whop-elements-wrapper">
            {offer.key === 'deposit' && savedMethod && (
              <div className="saved-method-confirmation" role="status">
                <Icon name="check" size={16} />
                Card saved securely for {savedMethod.email}. Step 2 of 2 · Pay your {formatPrice(offer.price)} deposit.
              </div>
            )}
            <div className="payment-switch" role="tablist" aria-label="Checkout payment method">
              <button
                type="button"
                role="tab"
                aria-selected={paymentMethod === 'card'}
                className={paymentMethod === 'card' ? 'selected' : ''}
                onClick={() => setPaymentMethod('card')}
              >
                All payment methods
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={paymentMethod === 'express'}
                className={paymentMethod === 'express' ? 'selected' : ''}
                onClick={() => setPaymentMethod('express')}
              >
                Apple Pay / Google Pay
              </button>
            </div>
            <WhopElements
              elements={elementsLoader}
              appearance={{
                theme: {
                  appearance: 'light',
                  accentColor: 'gold',
                },
              }}
            >
              <Checkout
                key={`${offer.planId}-${paymentMethod}`}
                plan={offer.planId}
                onComplete={handleComplete}
                fallback={<div className="whop-elements-loading">Loading Whop’s secure checkout…</div>}
              >
                {paymentMethod === 'express'
                  ? <ExpressCheckoutElement />
                  : <CheckoutElement buyerEmail={offer.key === 'deposit' ? savedMethod?.email : undefined} />}
              </Checkout>
              <Payments accountId={config.accountId} plan={offer.planId}>
                <div className="whop-branding-slot">
                  <BrandingElement />
                </div>
              </Payments>
            </WhopElements>
          </div>
        )}

        <div className="dialog-footer-trust">
          <span><Icon name="shield" size={13} /> Secure Whop checkout</span>
          <span><Icon name="check" size={13} /> Payment details stay with Whop</span>
          <span><Icon name="sparkles" size={13} /> Options subject to eligibility</span>
        </div>
      </div>
    </div>
  )
}

function App() {
  const [mobileMenu, setMobileMenu] = useState(false)
  const [selectedOffer, setSelectedOffer] = useState<EstimateRequest | null>(null)
  const [activeCheckoutOffer, setActiveCheckoutOffer] = useState<EstimateRequest | null>(
    () => hasDepositSetupReturn() ? { ...config.offers.deposit } : null,
  )
  const [selectedService, setSelectedService] = useState('')
  const [invoiceEmail, setInvoiceEmail] = useState('')
  const [invoicePaymentMethodId, setInvoicePaymentMethodId] = useState('')
  const [savedDepositMethod, setSavedDepositMethod] = useState<{ id: string; email: string } | null>(null)
  const [setupReturnError, setSetupReturnError] = useState(getDepositSetupReturnError)
  const [setupReturnPending, setSetupReturnPending] = useState(
    () => hasDepositSetupReturn() && !getDepositSetupReturnError(),
  )
  const setupReturnHandled = useRef(false)
  const [balanceResult, setBalanceResult] = useState<{ message: string; url?: string } | null>(null)
  const [balanceError, setBalanceError] = useState('')
  const [invoicing, setInvoicing] = useState(false)

  function openCheckout(key: OfferKey) {
    const rawOffer = config.offers[key]
    const offer: EstimateRequest = { ...rawOffer }
    setActiveCheckoutOffer(offer)
    if (key === 'deposit') {
      track('deposit_started', {
        offer: offer.label,
        amount: offer.price,
        plan_id: offer.planId,
      })
    }
  }

  function selectEstimateOffer(key: OfferKey) {
    const rawOffer = config.offers[key]
    const offer: EstimateRequest = { ...rawOffer }
    setSelectedOffer(offer)
    setSelectedService(offer.service)
    if (key === 'deposit') {
      track('deposit_started', {
        offer: offer.label,
        amount: offer.price,
        plan_id: offer.planId,
      })
    }
    document.getElementById('estimate')?.scrollIntoView({ behavior: 'smooth' })
    window.setTimeout(() => {
      document.querySelector<HTMLInputElement>('#estimate input[name="name"]')?.focus({ preventScroll: true })
    }, 450)
  }

  useEffect(() => {
    const seen = new WeakSet<Element>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || seen.has(entry.target)) continue
          seen.add(entry.target)
          const service = entry.target.getAttribute('data-service')
          if (service) {
            track('service_viewed', { service })
          }
        }
      },
      { threshold: 0.45 },
    )
    const cards = document.querySelectorAll('.service-card')
    cards.forEach((card) => observer.observe(card))
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (setupReturnHandled.current) return
    const params = new URLSearchParams(window.location.search)
    if (params.get('deposit_setup') !== 'complete') return
    setupReturnHandled.current = true

    const context = getDepositSetupContext()
    const setupIntentId = context?.setupIntentId
    const clientSecret = context?.clientSecret
    const email = context?.email ?? ''
    clearDepositSetupContext()
    window.history.replaceState(
      window.history.state,
      '',
      `${window.location.pathname}${window.location.hash}`,
    )

    if (!setupIntentId || !clientSecret || !email) {
      return
    }

    let cancelled = false
    async function verifyReturnedSetup() {
      try {
        const response = await fetch('/api/setup-intents/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            setup_intent_id: setupIntentId,
            client_secret: clientSecret,
          }),
        })
        const result = await response.json() as {
          error?: string
          status?: string
          payment_method_id?: string
        }
        if (!response.ok) throw new Error(result.error ?? 'Whop could not verify the saved payment method.')
        if (result.status !== 'succeeded' || !result.payment_method_id) {
          throw new Error('Whop did not confirm that the payment method was saved.')
        }
        if (cancelled) return
        setSavedDepositMethod({ id: result.payment_method_id, email })
        setInvoiceEmail(email)
        setInvoicePaymentMethodId(result.payment_method_id)
        track('deposit_started', {
          offer: config.offers.deposit.label,
          amount: config.offers.deposit.price,
          plan_id: config.offers.deposit.planId,
        })
      } catch (cause) {
        if (cancelled) return
        setSetupReturnError(cause instanceof Error ? cause.message : 'Whop could not verify the saved payment method.')
      } finally {
        clearDepositSetupContext()
        if (!cancelled) setSetupReturnPending(false)
      }
    }
    void verifyReturnedSetup()
    return () => { cancelled = true }
  }, [])

  async function createInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBalanceResult(null)
    setBalanceError('')
    setInvoicing(true)
    const form = new FormData(event.currentTarget)
    try {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(form.entries())),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'We couldn’t create the invoice.')
      setBalanceResult({
        message: result.hosted_invoice_url
          ? `Whop invoice created successfully! Status: ${result.status}. Send this secure link to the homeowner:`
          : `Whop invoice created (${result.id}). Current status: ${result.status}.`,
        url: result.hosted_invoice_url,
      })
    } catch (cause) {
      setBalanceError(cause instanceof Error ? cause.message : 'We couldn’t create the invoice.')
    } finally {
      setInvoicing(false)
    }
  }

  const nav = (
    <>
      <a href="#services" onClick={() => setMobileMenu(false)}>
        Services
      </a>
      <a href="#pricing" onClick={() => setMobileMenu(false)}>
        Plans & Pricing
      </a>
      <a href="#financing" onClick={() => setMobileMenu(false)}>
        Financing
      </a>
      <a href="#reviews" onClick={() => setMobileMenu(false)}>
        Reviews
      </a>
      <a href="#service-area" onClick={() => setMobileMenu(false)}>
        Service Area
      </a>
      <a href="#estimate" onClick={() => setMobileMenu(false)}>
        Contact
      </a>
    </>
  )

  return (
    <>
      {activeCheckoutOffer && (
        <CheckoutModal
          offer={activeCheckoutOffer}
          initialSavedMethod={activeCheckoutOffer.key === 'deposit' ? savedDepositMethod : null}
          setupReturnPending={setupReturnPending}
          setupReturnError={setupReturnError}
          onClose={() => setActiveCheckoutOffer(null)}
          onPaymentMethodSaved={(id, email) => {
            setSavedDepositMethod({ id, email })
            setInvoiceEmail(email)
            setInvoicePaymentMethodId(id)
          }}
        />
      )}

      <div className="announcement">
        <Icon name="sun" size={15} />
        <span>Need a roof inspection? Request an estimate or book online.</span>
        <a href="#pricing">
          View Plans <Icon name="arrow" size={14} />
        </a>
      </div>

      <header className="site-header">
        <a className="brand" href="#" aria-label={`${config.companyName} home`}>
          <span className="brand-mark">
            <Icon name="roof" size={24} />
          </span>
          <span>
            {config.brand}
            <small>ROOFING CO.</small>
          </span>
        </a>
        <nav className={mobileMenu ? 'main-nav open' : 'main-nav'}>{nav}</nav>
        <div className="header-actions">
          <a className="header-phone" href={`tel:${config.phone.replace(/\D/g, '')}`}>
            <Icon name="phone" size={16} />
            {config.phone}
          </a>
          <button className="button button-gold header-cta" onClick={() => openCheckout('deposit')}>
            Pay Deposit <Icon name="arrow" size={16} />
          </button>
        </div>
        <button
          className="menu-toggle"
          aria-label={mobileMenu ? 'Close menu' : 'Open menu'}
          onClick={() => setMobileMenu(!mobileMenu)}
        >
          <Icon name={mobileMenu ? 'close' : 'menu'} />
        </button>
      </header>

      <main>
        <section className="hero">
          <img className="hero-image" src={roofHome} alt="A freshly finished family home with a new architectural roof" />
          <div className="hero-shade" />
          <div className="hero-content">
            <div className="hero-kicker">
              <span /> YOUR NEIGHBORHOOD ROOFING PARTNER
            </div>
            <h1>
              A better roof.
              <br />
              A <em>whole lot less</em>
              <br />
              to worry about.
            </h1>
            <p>
              Request a roof repair, replacement, or inspection in {config.serviceArea}. Choose online payment where available, or send a request and our team will call to confirm your needs.
            </p>
            <div className="hero-actions">
              <a className="button button-gold" href="#estimate">
                Get Free Estimate <Icon name="arrow" />
              </a>
              <button className="button button-outline hero-deposit-btn" onClick={() => openCheckout('inspection')}>
                <Icon name="shield" size={16} /> Book Inspection ({formatPrice(config.offers.inspection.price)})
              </button>
              <a className="hero-call" href={`tel:${config.phone.replace(/\D/g, '')}`}>
                <span className="call-icon">
                  <Icon name="phone" />
                </span>
                <span>
                  <strong>Direct Roofer Line</strong>
                  <small>{config.phone}</small>
                </span>
              </a>
            </div>
            <div className="hero-promise">
              <span>
                <Icon name="check" /> Verify local licensing details
              </span>
              <i />
              <span>
                <Icon name="check" /> Payment options shown at checkout
              </span>
              <i />
              <span>
                <Icon name="check" /> Card-on-File Final Billing
              </span>
            </div>
          </div>
          <div className="hero-card">
            <span className="eyebrow">A CLEAR FIRST STEP</span>
            <strong>{formatPrice(config.offers.inspection.price)} inspection</strong>
            <small>{config.offers.inspection.features[0]}</small>
            <a href="#pricing" className="hero-card-link">
              View all services <Icon name="arrow" size={14} />
            </a>
          </div>
          <div className="hero-location">
            <Icon name="pin" size={15} /> PROUDLY SERVING {config.serviceArea.toUpperCase()}
          </div>
        </section>

        <section className="trust-bar">
          <div>
            <Icon name="shield" />
            <span>
              <strong>Clear scope before work</strong>
              <small>Review the details and agree the job first</small>
            </span>
          </div>
          <i />
          <div>
            <Icon name="sparkles" />
            <span>
              <strong>Whop-powered payments</strong>
              <small>Secure checkout and invoice options</small>
            </span>
          </div>
          <i />
          <div>
            <Icon name="clock" />
            <span>
              <strong>Deposit → Job → Invoice Flow</strong>
              <small>Deposit credited to agreed project balance</small>
            </span>
          </div>
          <i />
          <div>
            <Icon name="star" />
            <span>
              <strong>Local service area</strong>
              <small>{config.serviceArea}</small>
            </span>
          </div>
        </section>

        <section className="services section-wrap" id="services">
          <div className="section-heading">
            <div>
              <span className="eyebrow">ROOFING SERVICES</span>
              <h2>
                Good roofs start
                <br />
                with good people.
              </h2>
            </div>
            <p>
              Clear service options, clear next steps. Need a custom scope? Send a callback request and the team can confirm details before payment.
            </p>
          </div>
          <div className="service-grid">
            {([
              { key: 'repair', number: '01', icon: 'tool', image: roofDetail, alt: 'Close-up of a residential roof surface' },
              { key: 'deposit', number: '02', icon: 'roof', image: roofHome, alt: 'Residential home with a finished roof' },
              { key: 'inspection', number: '03', icon: 'shield', image: roofDetail, alt: 'Roof detail prepared for inspection' },
            ] as const).map(({ key, number, icon, image, alt }) => {
              const offer = config.offers[key]
              return (
                <article className="service-card" data-service={offer.service} key={key}>
                  <img src={image} alt={alt} loading="lazy" />
                  <div className="service-card-body">
                    <span className="service-icon"><Icon name={icon} /></span>
                    <span className="eyebrow">{number} / {offer.cardEyebrow}</span>
                    <h3>{offer.cardTitle}</h3>
                    <p>{offer.cardDescription}</p>
                    <div className="service-card-actions">
                      <button className="button button-gold button-sm" onClick={() => openCheckout(key)}>
                        {offer.actionLabel} · {formatPrice(offer.price)} <Icon name="arrow" size={14} />
                      </button>
                      <a href="#estimate" className="text-link" onClick={() => selectEstimateOffer(key)}>
                        Request callback <Icon name="arrow" size={14} />
                      </a>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        <section className="pricing section-wrap" id="pricing">
          <div className="section-heading">
            <div>
              <span className="eyebrow">TRANSPARENT WHOP PRICING</span>
              <h2>
                Choose your package
                <br />
                or secure your crew.
              </h2>
            </div>
            <p>
              Select a service to open Whop's secure checkout. Payment methods are shown there when available.
            </p>
          </div>
          <div className="price-grid">
            <article className="price-card">
              <span className="eyebrow">PEACE-OF-MIND CHECK</span>
              <h3>{config.offers.inspection.label}</h3>
              <p>{config.offers.inspection.headline}</p>
              <div className="price">
                {formatPrice(config.offers.inspection.price)}{' '}
                <small>{config.offers.inspection.priceLabel}</small>
              </div>
              <ul>
                {config.offers.inspection.features.map((feat, i) => (
                  <li key={i}>
                    <Icon name="check" /> {feat}
                  </li>
                ))}
              </ul>
              <div className="card-buttons">
                <button className="button button-gold" onClick={() => openCheckout('inspection')}>
                  Book Inspection <Icon name="arrow" />
                </button>
                <button className="button button-outline" onClick={() => selectEstimateOffer('inspection')}>
                  Request Callback
                </button>
              </div>
              <small className="plan-note">Instant checkout with Whop Elements</small>
            </article>

            <article className="price-card price-featured">
              <span className="featured-pill">MOST POPULAR NEXT STEP</span>
              <span className="eyebrow">DEPOSIT → JOB → INVOICE</span>
              <h3>{config.offers.deposit.label}</h3>
              <p>{config.offers.deposit.headline}</p>
              <div className="price">
                {formatPrice(config.offers.deposit.price)}{' '}
                <small>{config.offers.deposit.priceLabel}</small>
              </div>
              <ul>
                {config.offers.deposit.features.map((feat, i) => (
                  <li key={i}>
                    <Icon name="check" /> {feat}
                  </li>
                ))}
              </ul>
              <div className="card-buttons">
                <button className="button button-gold" onClick={() => openCheckout('deposit')}>
                  Pay {formatPrice(config.offers.deposit.price)} Deposit <Icon name="arrow" />
                </button>
                <button className="button button-outline" onClick={() => selectEstimateOffer('deposit')}>
                  Get Free Estimate First
                </button>
              </div>
              <small className="plan-note">Card saved on file via Setup Intent for final invoice</small>
            </article>

            <article className="price-card">
              <span className="eyebrow">FLAT-RATE SERVICE</span>
              <h3>{config.offers.repair.label}</h3>
              <p>{config.offers.repair.headline}</p>
              <div className="price">
                {formatPrice(config.offers.repair.price)}{' '}
                <small>{config.offers.repair.priceLabel}</small>
              </div>
              <ul>
                {config.offers.repair.features.map((feat, i) => (
                  <li key={i}>
                    <Icon name="check" /> {feat}
                  </li>
                ))}
              </ul>
              <div className="card-buttons">
                <button className="button button-gold" onClick={() => openCheckout('repair')}>
                  Order Leak Repair <Icon name="arrow" />
                </button>
                <button className="button button-outline" onClick={() => selectEstimateOffer('repair')}>
                  Request Callback
                </button>
              </div>
              <small className="plan-note">Instant dispatch booking via Whop</small>
            </article>
          </div>
          <p className="pricing-disclaimer">
            Checkout uses Whop Payments and BrandingElement. Available payment methods and financing options depend on the offer, account approval, buyer location, and device.
          </p>
        </section>

        <section className="financing" id="financing">
          <div className="financing-decoration">N</div>
          <div>
            <span className="eyebrow">FLEXIBLE FINANCING VIA WHOP</span>
            <h2>
              Better roof.
              <br />
              <em>Comfortable monthly payments.</em>
            </h2>
            <p>
              Payment plans may be available at Whop checkout for approved merchants and eligible buyers. Options, terms, and providers vary by offer and buyer; review the terms displayed by Whop before confirming.
            </p>
            <div className="financing-actions">
              <button className="button button-gold" onClick={() => openCheckout('deposit')}>
                Check Financing at Checkout <Icon name="arrow" />
              </button>
              <a className="button button-outline" href="#estimate">
                Ask About Financing Options
              </a>
            </div>
            <small>
              Financing is not guaranteed. Eligibility and terms are determined by the provider and shown during checkout.
            </small>
          </div>
          <div className="financing-badge">
            <span>ROOF NOW.</span>
            <Icon name="arrow" size={18} />
            <strong>
              PAY OVER
              <br />
              TIME.
            </strong>
          </div>
        </section>

        <section className="craft-section" id="why-us">
          <div className="craft-image">
            <img src={roofDetail} alt="A well-maintained home and roof at sunset" />
            <div className="craft-stamp">
              <strong>100%</strong>
              <small>
                LOCAL
                <br />
                HEART
              </small>
            </div>
          </div>
          <div className="craft-copy">
            <span className="eyebrow">THE NORTHLINE DIFFERENCE</span>
            <h2>
              Your home deserves
              <br />
              more than a<br />
              <em>quick fix.</em>
            </h2>
            <p>
              At {config.companyName}, the process starts with a conversation and a clear scope. You review the written terms before any work or payment is agreed.
            </p>
            <div className="craft-list">
              <div>
                <span>
                  <Icon name="check" />
                </span>
                <p>
                  <strong>Deposit → Job → Final Invoice Flow</strong>
                  <small>Agree the job scope and schedule before paying the project deposit.</small>
                </p>
              </div>
              <div>
                <span>
                  <Icon name="check" />
                </span>
                <p>
                  <strong>Workmanship and material options</strong>
                  <small>List only the products, certifications, and warranties the company can verify.</small>
                </p>
              </div>
              <div>
                <span>
                  <Icon name="check" />
                </span>
                <p>
                  <strong>Instant Online Invoicing & Card-on-File</strong>
                  <small>Use Whop receipts and document warranty coverage in the company's written agreement.</small>
                </p>
              </div>
            </div>
            <a className="text-link" href="#estimate">
              Let’s talk about your roof <Icon name="arrow" size={17} />
            </a>
          </div>
        </section>

        <section className="reviews section-wrap" id="reviews">
          <div className="reviews-side">
            <span className="eyebrow">SAMPLE REVIEW LAYOUT · REPLACE BEFORE LAUNCH</span>
            <h2>
              Good work
              <br />
              gets around.
            </h2>
            <div className="review-rating">
              <span>★★★★★</span>
              <strong>Add actual rating</strong>
              <small>Use genuine, permissioned customer reviews only</small>
            </div>
          </div>
          <div className="review-list">
            <article>
              <span className="review-stars">★★★★★</span>
              <blockquote>
                “Sample review copy — replace this text with a genuine customer review and confirm permission before publishing.”
              </blockquote>
              <div className="review-author">
                <span>JM</span>
                <p>
                  <strong>Customer name</strong>
                  <small>City · Service performed</small>
                </p>
                <b>SAMPLE</b>
              </div>
            </article>
            <article>
              <span className="review-stars">★★★★★</span>
              <blockquote>
                “Sample review copy — replace this text with a genuine customer review and confirm permission before publishing.”
              </blockquote>
              <div className="review-author">
                <span>AS</span>
                <p>
                  <strong>Customer name</strong>
                  <small>City · Service performed</small>
                </p>
                <b>SAMPLE</b>
              </div>
            </article>
          </div>
        </section>

        <section className="service-area" id="service-area">
          <div className="service-area-copy">
            <span className="eyebrow">SERVICE REGION</span>
            <h2>
              {config.serviceArea}
              <br />
              is <em>our backyard.</em>
            </h2>
            <p>
              Reach out to confirm whether your property is within our service area.
            </p>
            <a className="text-link" href={`tel:${config.phone.replace(/\D/g, '')}`}>
              <Icon name="phone" /> Call dispatch: {config.phone}
            </a>
          </div>
          <div className="area-map">
            <div className="map-grid"></div>
            {config.serviceCities.slice(0, 5).map((city, index) => (
              <span className={`map-label label-${index + 1}`} key={city}>{city.toUpperCase()}</span>
            ))}
            <span className="map-pin pin-center">
              <Icon name="roof" size={19} />
            </span>
            <span className="map-pin pin-a">
              <i />
            </span>
            <span className="map-pin pin-b">
              <i />
            </span>
            <span className="map-pin pin-c">
              <i />
            </span>
            <span className="map-pin pin-d">
              <i />
            </span>
          </div>
        </section>

        <section className="final-cta" id="estimate">
          <div className="final-cta-photo"></div>
          <div className="final-cta-content">
            <span className="eyebrow">REQUEST AN ESTIMATE</span>
            <h2>
              Your roof’s been
              <br />
              on your mind.
              <br />
              <em>We get it.</em>
            </h2>
            <p>
              Tell us what you need. Your request is saved to the account through the <strong>Whop Leads API</strong>; a team member can call to confirm the scope and next step.
            </p>
            <div className="cta-contact">
              <a href={`tel:${config.phone.replace(/\D/g, '')}`}>
                <Icon name="phone" />
                {config.phone}
              </a>
              <a href={`mailto:${config.email}`}>
                <Icon name="shield" />
                {config.email}
              </a>
            </div>
          </div>
          <div className="estimate-panel">
            <h3>Request a Free Estimate</h3>
            <p>Send your details securely through the Whop Leads API. There is no charge for submitting a request.</p>
            <EstimateForm
              selectedOffer={selectedOffer}
              service={selectedService}
              onServiceChange={(service) => {
                setSelectedService(service)
                setSelectedOffer(null)
              }}
              onOpenCheckout={openCheckout}
            />
          </div>
        </section>

        <section className="balance-demo" id="operator-portal">
          <div>
            <span className="eyebrow">OPERATOR PORTAL · WHOP INVOICES API</span>
            <h2>Job Complete? Bill the Final Balance.</h2>
            <p>
              Demonstrating the full <strong>Deposit → Job → Final Invoice</strong> lifecycle. Once roofing work is signed off, the operator enters the agreed balance to either auto-charge the customer’s card on file (from deposit checkout setup intent) or generate a Whop hosted invoice link.
            </p>
            <div className="operator-tip">
              Enter the private operator token configured in Whop app secrets. It is never displayed or included in the website bundle.
            </div>
          </div>
          <form onSubmit={createInvoice}>
            <label>
              Operator Authorization Token
              <input
                name="admin_token"
                type="password"
                required
                autoComplete="off"
                placeholder="Private operator token"
              />
            </label>
            <label>
              Homeowner Name
              <input name="customer_name" type="text" placeholder="Homeowner full name" />
            </label>
            <label>
              Homeowner Email
              <input name="email" type="email" required value={invoiceEmail} onChange={(event) => setInvoiceEmail(event.target.value)} placeholder="homeowner@email.com" />
            </label>
            <label>
              Invoice Category
              <select name="invoice_type" required defaultValue="final_balance">
                <option value="final_balance">Final Project Balance (Post-Job)</option>
                <option value="deposit">Project Deposit ({formatPrice(config.offers.deposit.price)})</option>
                <option value="repair">Flat-Rate Repair ({formatPrice(config.offers.repair.price)})</option>
                <option value="inspection">Roof Inspection ({formatPrice(config.offers.inspection.price)})</option>
              </select>
            </label>
            <label>
              Agreed Amount (USD)
              <input
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                required
                placeholder="Enter final balance amount"
              />
            </label>
            <label>
              Card-on-File Payment Method ID (Optional)
              <input
                name="payment_method_id"
                value={invoicePaymentMethodId}
                onChange={(event) => setInvoicePaymentMethodId(event.target.value)}
                placeholder="payt_... (Leave blank to generate hosted invoice pay link)"
              />
            </label>
            <button className="button button-dark" type="submit" disabled={invoicing}>
              {invoicing ? 'Creating Whop Invoice…' : 'Generate Whop Invoice'} <Icon name="arrow" />
            </button>
            {balanceResult && (
              <div className="invoice-result-box" role="status">
                <p>
                  <Icon name="check" size={16} /> {balanceResult.message}
                </p>
                {balanceResult.url && (
                  <a className="button button-gold button-sm" href={balanceResult.url} target="_blank" rel="noreferrer">
                    Open Hosted Whop Invoice <Icon name="arrow" size={14} />
                  </a>
                )}
              </div>
            )}
            {balanceError && (
              <p className="form-error" role="alert">
                {balanceError}
              </p>
            )}
          </form>
        </section>
      </main>

      <footer className="footer">
        <a className="brand footer-brand" href="#">
          <span className="brand-mark">
            <Icon name="roof" size={24} />
          </span>
          <span>
            {config.brand}
            <small>ROOFING CO.</small>
          </span>
        </a>
        <p>Production Whop Websites template built for US roofing contractors.</p>
        <span>
          © {currentYear} {config.companyName}. Powered by Whop Payments & Invoices.
        </span>
        <a href={`tel:${config.phone.replace(/\D/g, '')}`}>{config.phone}</a>
      </footer>
    </>
  )
}

export default App
