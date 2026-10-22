// Fake Stripe.js: first confirm returns pm_bad (charge fails), later ones pm_good.
window.__confirms = 0;
window.Stripe = function () { return {
  elements() { return { create() { return { mount(el) { el.innerHTML = '<div id="fake-card" style="height:60px;border:1px solid #000">FAKE CARD FIELD</div>'; } }; } }; },
  async handleNextAction({ clientSecret }) { window.__auth = clientSecret; return { paymentIntent: { id: clientSecret.replace('_secret', ''), status: 'succeeded' } }; },
  async confirmSetup() { window.__confirms++; return { setupIntent: { payment_method: window.__confirms === 1 ? 'pm_bad' : 'pm_3ds' } }; }
}; };
