'use client';

// a3: the "Set up paying once" chooser from Option 10 PaymentSetup. Used inline on the
// give screen (first gift) and on /you/payment (change it later). Simulated in test mode.
import { useState } from 'react';
import StripePay, { stripeClientOn } from '@/components/stripe-pay';

export const PAY_METHODS = [
  ['apple', 'Apple Pay', 'Fastest. Confirm with Face ID'],
  ['card', 'Debit or credit card', 'Visa, Mastercard, Amex'],
  ['bank', 'Bank account', 'Link it once, securely']
];

// Splits "Visa ·· 4421" into ["Visa", "·· 4421"] for the Doto digits.
export function splitPayLabel(label = '') {
  const m = /^(.*?)\s*([·•]{2}\s*\S+)$/.exec(label);
  return m ? [m[1], m[2]] : [label, ''];
}

const inputStyle = { minWidth: 0, height: 52, border: '1.5px solid var(--line, #000000)', background: 'var(--surface, #FFFFFF)', fontFamily: 'inherit', fontSize: 15, padding: '0 12px', borderRadius: 0, color: 'var(--ink, #000000)', boxSizing: 'border-box', width: '100%' };

export function PaymentPicker({ forName, kind, onKind, onBg = 'transparent', card, onCard }) {
  if (stripeClientOn()) {
    return (
      <>
        <StripePay />
        <section style={{ marginTop: 22, display: 'flex', alignItems: 'center', gap: 12, background: 'var(--lt, #D8F75A)', padding: '14px 16px' }}>
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--ink, #000000)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M4 12l5 5L20 6" /></svg>
          <span style={{ fontSize: 16, lineHeight: 1.3 }}>No fee added. All of it goes to {forName}.</span>
        </section>
      </>
    );
  }
  return (
    <>
      <div role="radiogroup" aria-label="How you pay" style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: 15, paddingBottom: 8 }}>How do you want to pay?</span>
        {PAY_METHODS.map(([k, label, sub]) => {
          const on = kind === k;
          return (
            <button key={k} type="button" role="radio" aria-checked={on} onClick={() => onKind(k)} style={{ display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', border: 0, borderTop: '1px solid var(--line, #000000)', background: on ? 'var(--surface, #FFFFFF)' : 'transparent', color: 'var(--ink, #000000)', fontFamily: 'inherit', padding: `14px ${on ? '12px' : '0'}`, cursor: 'pointer' }}>
              <span style={{ width: 22, height: 22, flexShrink: 0, borderRadius: '50%', border: '1.5px solid var(--edge, #000000)', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ width: 12, height: 12, borderRadius: '50%', background: on ? 'var(--inv-bg, #000000)' : 'transparent' }} /></span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flexGrow: 1 }}><span style={{ fontSize: 18 }}>{label}</span><span style={{ fontSize: 13, color: 'var(--sub, #3A3A3A)' }}>{sub}</span></span>
            </button>
          );
        })}
        <div style={{ borderTop: '1px solid var(--line, #000000)' }} />
      </div>
      {kind === 'card' ? (
        <section className="pop" style={{ paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label htmlFor="cn" style={{ fontSize: 14 }}>Card number</label>
          <input id="cn" name="cardNumber" inputMode="numeric" autoComplete="cc-number" placeholder="1234 1234 1234 1234" value={card} onChange={(e) => onCard(e.target.value)} style={{ ...inputStyle, fontFamily: "'Doto', monospace", fontWeight: 900, fontSize: 18, padding: '0 14px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
            <input aria-label="Expiry" name="exp" placeholder="MM/YY" autoComplete="cc-exp" style={inputStyle} />
            <input aria-label="CVC" name="cvc" placeholder="CVC" inputMode="numeric" autoComplete="cc-csc" style={inputStyle} />
            <input aria-label="ZIP" name="zip" placeholder="ZIP" inputMode="numeric" style={inputStyle} />
          </div>
        </section>
      ) : null}
      <section style={{ marginTop: 22, display: 'flex', alignItems: 'center', gap: 12, background: 'var(--lt, #D8F75A)', padding: '14px 16px' }}>
        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--ink, #000000)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M4 12l5 5L20 6" /></svg>
        <span style={{ fontSize: 16, lineHeight: 1.3 }}>No fee added. All of it goes to {forName}.</span>
      </section>
    </>
  );
}

export function usePayment(initial = 'apple') {
  // With Stripe on, the Payment Element picks the method; the label comes back from Stripe.
  const [kind, setKind] = useState(stripeClientOn() ? 'card' : initial);
  const [card, setCard] = useState(stripeClientOn() ? '0000000000000000' : '');
  const digits = card.replace(/\D/g, '');
  return { kind, setKind, card, setCard, last4: digits.slice(-4) || '4242', first: digits[0] || '4' };
}
