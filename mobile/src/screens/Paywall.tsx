import { useEffect, useState } from 'react';
import { useApp } from '../store';
import { Btn } from '../ui';
import { buyPro, loadProducts, restorePro, type StoreProduct } from '../lib/storekit';
import { APPLE_EULA_URL, FALLBACK_PRICES, FALLBACK_PRICE_VALUES, PRIVACY_URL, PRO_MONTHLY_ID, PRO_PERIOD, PRO_PLAN_ORDER, PRO_WEEKLY_ID, PRO_YEARLY_ID } from '../lib/config';
import { monthlyPlanNote, weeklyPlanNote, yearlyPlanNote } from '../lib/pricing';
import { openExternal, success } from '../lib/native';
import { isNative } from '../lib/platform';

export function Paywall() {
  const { paywall, closePaywall, setPro, toast } = useApp();
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [selected, setSelected] = useState<string>(PRO_YEARLY_ID);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (paywall.open) void loadProducts().then(setProducts);
  }, [paywall.open]);
  if (!paywall.open) return null;

  // Once StoreKit answers, show only the plans it returned (with its localized prices); before that, US fallbacks.
  const ids: readonly string[] = products.length ? PRO_PLAN_ORDER.filter((id) => products.some((x) => x.id === id)) : PRO_PLAN_ORDER;
  const plans = ids.map((id) => {
    const p = products.find((x) => x.id === id);
    return { id, price: p?.displayPrice ?? FALLBACK_PRICES[id], value: p?.price ?? FALLBACK_PRICE_VALUES[id], period: PRO_PERIOD[id].unit, name: PRO_PERIOD[id].name };
  });
  const sel = plans.find((p) => p.id === selected) ?? plans[0];
  const value = (id: string) => plans.find((p) => p.id === id)?.value;
  const yearlyPlan = plans.find((p) => p.id === PRO_YEARLY_ID);
  const yearlyNote = yearlyPlan ? yearlyPlanNote(yearlyPlan.price, { yearly: yearlyPlan.value, monthly: value(PRO_MONTHLY_ID), weekly: value(PRO_WEEKLY_ID) }) : '';

  const buy = async () => {
    setErr(null);
    setBusy('buy');
    try {
      const r = await buyPro(sel.id);
      if (r.status === 'purchased') {
        setPro(true);
        success();
        toast('Welcome to Invoice Jot Pro');
        closePaywall();
      } else if (r.status === 'pending') {
        setErr('Your purchase is waiting for approval (Ask to Buy or bank check). Pro unlocks automatically once approved.');
      }
    } catch (e) {
      setErr(String((e as Error)?.message ?? e));
    } finally {
      setBusy(null);
    }
  };
  const restore = async () => {
    setErr(null);
    setBusy('restore');
    try {
      const r = await restorePro();
      setPro(r.pro);
      if (r.pro) {
        toast('Purchases restored');
        closePaywall();
      } else setErr(r.error ? `Could not reach the App Store: ${r.error}` : 'No active Invoice Jot Pro subscription was found for this Apple Account.');
    } catch (e) {
      setErr(String((e as Error)?.message ?? e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="sheet-backdrop" role="dialog" aria-modal="true" aria-labelledby="paywall-title">
      <div className="sheet">
        <button className="close" onClick={closePaywall} aria-label="Close">
          ✕
        </button>
        <h2 id="paywall-title">Invoice Jot Pro</h2>
        {paywall.reason ? <p className="muted">{paywall.reason}</p> : null}
        <ul className="benefits">
          <li>Unlimited invoices sent and exported</li>
          <li>No “Made with Invoice Jot” footer on your PDFs</li>
          <li>Five extra PDF styles: Formal, Minimal, Banded, Ledger and Compact (Modern, Classic and Bold stay free, including your logo and color)</li>
          <li>Still free forever: drafts, estimates, receipts, clients, and every past invoice</li>
        </ul>
        <div className="plans" role="radiogroup" aria-label="Choose a plan">
          {plans.map((p) => (
            <button key={p.id} role="radio" aria-checked={selected === p.id} className={`plan ${selected === p.id ? 'on' : ''}`} onClick={() => setSelected(p.id)}>
              <span className="plan-price">
                {p.price}/{p.period}
              </span>
              <span className="plan-name">{p.name}{p.id === PRO_YEARLY_ID ? ' · best value' : ''}</span>
              {p.id === PRO_YEARLY_ID ? <span className="hint">{yearlyNote}</span> : null}
              {p.id === PRO_MONTHLY_ID ? <span className="hint">{monthlyPlanNote({ monthly: p.value, weekly: value(PRO_WEEKLY_ID) })}</span> : null}
              {p.id === PRO_WEEKLY_ID ? <span className="hint">{weeklyPlanNote(p.price, p.value)}</span> : null}
            </button>
          ))}
        </div>
        <p className="hint center" data-testid="billing-honesty">
          No free trial and no hidden steps: nothing is charged until you confirm with Apple (Face ID or passcode). Cancel any time in Settings › Apple Account › Subscriptions. You keep Pro until the paid period ends, and your invoices stay yours.
        </p>
        <Btn onClick={() => void buy()} disabled={!!busy || !isNative()}>
          {busy === 'buy' ? 'Opening App Store…' : `Subscribe for ${sel.price}/${sel.period}`}
        </Btn>
        {!isNative() ? <p className="hint center">Subscriptions are available in the iPhone app.</p> : null}
        <Btn kind="ghost" onClick={() => void restore()} disabled={!!busy}>
          {busy === 'restore' ? 'Restoring…' : 'Restore Purchases'}
        </Btn>
        {err ? (
          <p className="error" role="alert">
            {err}
          </p>
        ) : null}
        <p className="fine">
          {sel.price} is charged to your Apple Account every {sel.period} until you cancel. The subscription renews automatically unless cancelled at least 24 hours before the end of the current period. Manage or cancel anytime in Settings › Apple Account › Subscriptions.
        </p>
        <p className="fine center">
          <button className="link-btn" onClick={() => openExternal(APPLE_EULA_URL)}>
            Terms of Use (EULA)
          </button>{' '}
          ·{' '}
          <button className="link-btn" onClick={() => openExternal(PRIVACY_URL)}>
            Privacy Policy
          </button>
        </p>
      </div>
    </div>
  );
}
