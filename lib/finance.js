// Numbers for the founder's financial overview (/admin). Real people only: seeded demo accounts (555 numbers) are left out.
import { get, all } from './db';
import { FEE_RATE, processingCents } from './payments';

const REAL_GIVER = "EXISTS (SELECT 1 FROM users u WHERE u.id = c.giver_id AND u.phone NOT LIKE '+1555%')";
const REAL_LEDGER = "(l.user_id IS NULL OR EXISTS (SELECT 1 FROM users u WHERE u.id = l.user_id AND u.phone NOT LIKE '+1555%'))";
const num = (x) => Number(x || 0);

export async function financials({ sinceMs = 0 } = {}) {
  // Ledger totals by kind.
  const rows = await all(`SELECT l.kind, COALESCE(SUM(l.cents),0) AS cents, COUNT(*) AS n, MAX(l.est) AS est FROM ledger l WHERE ${REAL_LEDGER} AND l.at >= ? GROUP BY l.kind`, sinceMs);
  const k = Object.fromEntries(rows.map((r) => [r.kind, { cents: num(r.cents), n: num(r.n), est: !!num(r.est) }]));
  const v = (kind) => k[kind]?.cents || 0;

  // Gifts straight from the gifts themselves (also covers gifts made before the ledger existed).
  const g = await get(`SELECT COUNT(*) AS n, COALESCE(SUM(c.amount_cents),0) AS cents,
      SUM(CASE WHEN c.amount_cents <= 500 THEN 1 ELSE 0 END) AS small FROM contributions c WHERE ${REAL_GIVER} AND c.created_at >= ?`, sinceMs);

  // Money owed to receivers right now: every gift not yet cashed out (all time, not just the window).
  const owed = await get(`SELECT COALESCE(SUM(c.amount_cents),0) AS cents, COUNT(DISTINCT c.list_id) AS lists FROM contributions c WHERE c.paid_out_id IS NULL AND ${REAL_GIVER}`);

  const failedEvents = num((await get("SELECT COUNT(*) AS n FROM app_events WHERE kind = 'pay_fail' AND at >= ?", sinceMs))?.n);
  const payoutFails = num((await get("SELECT COUNT(*) AS n FROM app_events WHERE kind = 'payout_fail' AND at >= ?", sinceMs))?.n);

  // Processing on every gift in the window: Stripe's real fee where we have it, else the estimate
  // (gifts made before the ledger existed have no ledger row).
  const types = await byGiftType({ sinceMs });
  const processingAll = types.reduce((t, r) => t + r.processing, 0);
  const revenue = v('fee_platform') + v('fee_cashout');
  const providerCosts = processingAll + v('payout_cost') + v('account_fee') + v('failed_fee') + v('dispute_fee');
  // Net contribution: what insidejoke keeps after every provider cost. Processing on gifts not yet cashed
  // out hasn't been passed on yet, so it's shown separately rather than counted as a loss.
  const processingOnCashedOut = num((await get(`SELECT COALESCE(SUM(l.cents),0) AS c FROM ledger l JOIN contributions c ON c.id = l.contribution_id WHERE l.kind = 'processing' AND c.paid_out_id IS NOT NULL AND ${REAL_LEDGER} AND l.at >= ?`, sinceMs))?.c);
  // Disputes: the fee, plus gifts taken back after they were cashed out (minus what was won back or recovered).
  const disputeCost = v('dispute_fee') + v('dispute_loss') - v('dispute_won') - v('debt_recovered');
  const net = revenue + v('fee_recovered') - processingOnCashedOut - v('payout_cost') - v('account_fee') - v('failed_fee') - disputeCost;

  return {
    gifts: { cents: num(g.cents), n: num(g.n), small: num(g.small) },
    revenue, platform: v('fee_platform'), cashoutFees: v('fee_cashout'),
    processing: processingAll, processingEst: !!k.processing?.est || types.some((r) => r.estimated), recovered: v('fee_recovered'),
    owed: num(owed.cents), owedLists: num(owed.lists),
    cashouts: { cents: v('payout'), n: k.payout?.n || 0 },
    payoutCosts: v('payout_cost') + v('account_fee'),
    failed: { removedCents: v('gift_removed'), removedN: k.gift_removed?.n || 0, failedFee: v('failed_fee'), payFails: failedEvents, payoutFails, disputes: k.dispute_fee?.n || 0, disputeCost },
    providerCosts,
    processingPending: num((await get(`SELECT COALESCE(SUM(l.cents),0) AS c FROM ledger l JOIN contributions c ON c.id = l.contribution_id WHERE l.kind = 'processing' AND c.paid_out_id IS NULL AND ${REAL_LEDGER} AND l.at >= ?`, sinceMs))?.c),
    net
  };
}

// Profitability by gift type. Revenue is what each type will earn at cash-out: our 5% plus the processing
// passed on; cost is what the provider charged. Per-cash-out costs ($2.50 fee vs payout costs) aren't split by type.
export async function byGiftType({ sinceMs = 0 } = {}) {
  const gifts = await all(`SELECT c.id, c.amount_cents, c.method, c.gift_type, i.quantity,
      (SELECT l.cents FROM ledger l WHERE l.kind = 'processing' AND l.contribution_id = c.id LIMIT 1) AS processing,
      (SELECT l.est FROM ledger l WHERE l.kind = 'processing' AND l.contribution_id = c.id LIMIT 1) AS est
    FROM contributions c JOIN items i ON i.id = c.item_id WHERE ${REAL_GIVER} AND c.created_at >= ?`, sinceMs);
  const types = { direct: 'Direct gifts', group: 'Group gifts', treat: 'Treats' };
  const out = Object.fromEntries(Object.keys(types).map((t) => [t, { key: t, label: types[t], n: 0, cents: 0, small: 0, processing: 0, recovered: 0, platform: 0 }]));
  for (const c of gifts) {
    const t = c.gift_type || (Number(c.quantity) === 0 ? 'treat' : 'group');
    const r = out[t] || out.group;
    const cents = num(c.amount_cents);
    const cost = c.processing != null ? num(c.processing) : processingCents(cents, c.method);
    if (c.processing == null || c.est) r.estimated = true;
    r.n++; r.cents += cents; if (cents <= 500) r.small++;
    r.processing += cost;
    r.recovered += processingCents(cents, c.method);
    r.platform += Math.round(cents * FEE_RATE);
  }
  return Object.values(out).map((r) => ({ ...r, avg: r.n ? Math.round(r.cents / r.n) : 0, net: r.platform + r.recovered - r.processing, costPct: r.cents ? r.processing / r.cents : 0 }));
}
