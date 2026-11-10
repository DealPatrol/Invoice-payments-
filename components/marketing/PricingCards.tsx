import Link from 'next/link';
import { LAB_PLANS, planCheckoutHref } from '@/lib/config';

export function PricingCards() {
  return (
    <div className="grid3">
      {LAB_PLANS.map((p) => {
        const href = planCheckoutHref(p.id);
        const external = href.startsWith('http');
        return (
          <div key={p.id} className={`card price${p.featured ? ' feat' : ''}`} data-plan={p.id}>
            <h3>{p.name}</h3>
            <p className="muted" style={{ fontSize: 14 }}>{p.blurb}</p>
            <div className="amt">${p.price}{p.price > 0 && <small>/mo</small>}</div>
            <ul>{p.features.map((f) => <li key={f}>{f}</li>)}</ul>
            {external
              ? <a className={`btn${p.featured ? '' : ' ghost'}`} href={href} rel="noopener">{p.cta}</a>
              : <Link className={`btn${p.featured ? '' : ' ghost'}`} href={href}>{p.cta}</Link>}
            {p.note && <p className="fine">{p.note}</p>}
          </div>
        );
      })}
    </div>
  );
}
