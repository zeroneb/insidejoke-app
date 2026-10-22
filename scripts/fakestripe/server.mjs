// Minimal fake of the Stripe API endpoints insidejoke uses.
import http from 'node:http';
let n = 0; const log = []; const pis = {};
const pms = { pm_bad: { id: 'pm_bad', type: 'card', card: { brand: 'visa', last4: '0000' } }, pm_3ds: { id: 'pm_3ds', type: 'card', card: { brand: 'visa', last4: '3155' } }, pm_good: { id: 'pm_good', type: 'card', card: { brand: 'visa', last4: '4242' } } };
http.createServer((req, res) => {
  let body = ''; req.on('data', (c) => (body += c)); req.on('end', () => {
    const p = new URLSearchParams(body); const u = req.url.replace(/\?.*/, ''); log.push(req.method + ' ' + u + ' ' + body.slice(0, 160));
    const send = (code, j) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(j)); };
    if (u === '/_log') return send(200, log);
    if (p.get('payment_method_types[0]')) return send(400, { error: { message: 'The `payment_method_types` parameter is no longer supported.' } });
    if (u === '/v1/customers' ) return send(200, { id: 'cus_' + (++n) });
    if (u.startsWith('/v1/customers/')) return send(200, { id: u.split('/')[3] });
    if (u === '/v1/setup_intents') return send(200, { id: 'seti_1', client_secret: 'seti_1_secret_x' });
    const m = /^\/v1\/payment_methods\/([^/]+)(\/attach)?$/.exec(u);
    if (m) return send(200, { ...pms[m[1]], customer: m[2] ? p.get('customer') : null });
    if (u === '/v1/payment_intents') {
      if (p.get('payment_method') === 'pm_bad') return send(400, { error: { message: "The provided PaymentMethod can't be used with this PaymentIntent", param: 'payment_method' } });
      const id = 'pi_' + (++n); pis[id] = { id, amount: +p.get('amount'), metadata: { user_id: p.get('metadata[user_id]') }, status: 'succeeded' };
      if (p.get('payment_method') === 'pm_3ds') return send(200, { ...pis[id], status: 'requires_action', client_secret: id + '_secret' });
      return send(200, { ...pis[id], latest_charge: 'ch_1' });
    }
    const g = /^\/v1\/payment_intents\/([^/]+)$/.exec(u); if (g && pis[g[1]]) return send(200, pis[g[1]]);
    send(404, { error: { message: 'fake: no route ' + u } });
  });
}).listen(4242, () => console.log('fake stripe on 4242'));
