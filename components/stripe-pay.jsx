'use client';

// The real "how you pay" field once Stripe keys are set: Stripe's Payment Element
// (cards, Apple Pay, Google Pay, Link). It confirms a SetupIntent before the form submits,
// then hands the saved payment method id to the server action in a hidden input.
import { useEffect, useRef, useState } from 'react';
import { cardSetupSecret } from '@/lib/actions-a3';

const PK = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
export const stripeClientOn = () => !!PK;

let loading;
function loadStripe() {
  if (typeof window === 'undefined') return Promise.reject(new Error('ssr'));
  if (window.Stripe) return Promise.resolve(window.Stripe(PK));
  loading = loading || new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://js.stripe.com/v3/';
    s.onload = () => res(window.Stripe(PK));
    s.onerror = () => rej(new Error('stripe_js'));
    document.head.appendChild(s);
  });
  return loading;
}

export default function StripePay() {
  const box = useRef(null);
  const hidden = useRef(null);
  const [err, setErr] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let stripe, elements, form, onSubmit, gone = false;
    (async () => {
      try {
        const r = await cardSetupSecret();
        if (r.error) throw new Error(r.error);
        stripe = await loadStripe();
        if (gone) return;
        const dark = document.documentElement.dataset.theme === 'dark';
        elements = stripe.elements({
          clientSecret: r.clientSecret,
          appearance: {
            theme: dark ? 'night' : 'flat',
            variables: { fontFamily: 'Inter Tight, system-ui, sans-serif', borderRadius: '0px', colorPrimary: '#000000', colorBackground: dark ? '#1A1A1A' : '#FFFFFF', fontSizeBase: '16px' },
            rules: { '.Input': { border: '1.5px solid ' + (dark ? '#FFFFFF' : '#000000') } }
          },
          fonts: [{ cssSrc: 'https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;700&display=swap' }]
        });
        elements.create('payment', { layout: 'tabs', paymentMethodOrder: ['apple_pay', 'google_pay', 'card', 'link'], wallets: { applePay: 'auto', googlePay: 'auto' } }).mount(box.current);
        setReady(true);
        form = box.current.closest('form');
        onSubmit = async (e) => {
          if (hidden.current.value) return; // already confirmed: let the action run
          e.preventDefault();
          e.stopPropagation();
          setErr('');
          const { error, setupIntent } = await stripe.confirmSetup({ elements, redirect: 'if_required', confirmParams: { return_url: window.location.href } });
          if (error) { setErr(error.message || 'That did not go through. Try another card.'); return; }
          hidden.current.value = typeof setupIntent.payment_method === 'string' ? setupIntent.payment_method : setupIntent.payment_method?.id || '';
          form.requestSubmit();
        };
        form.addEventListener('submit', onSubmit, true);
      } catch (e) {
        setErr(e.message === 'stripe_js' ? 'Could not load the card form. Check your connection.' : e.message);
      }
    })();
    return () => { gone = true; if (form && onSubmit) form.removeEventListener('submit', onSubmit, true); };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <span style={{ fontSize: 15 }}>How do you want to pay?</span>
      <input ref={hidden} type="hidden" name="paymentMethodId" defaultValue="" />
      <div ref={box} style={{ minHeight: ready ? 0 : 120 }} />
      {!ready && !err ? <span style={{ fontSize: 13, color: '#4A4A4A' }}>Loading the secure card form…</span> : null}
      {err ? <p className="err" style={{ margin: 0 }}>{err}</p> : null}
      <span style={{ fontSize: 12, color: '#4A4A4A' }}>Secured by Stripe. insidejoke never sees your card number.</span>
    </div>
  );
}
