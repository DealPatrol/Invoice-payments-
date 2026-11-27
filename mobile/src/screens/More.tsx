import { useApp } from '../store';
import { Card, Screen } from '../ui';

export function More() {
  const { go, db, pro, openPaywall } = useApp();
  return (
    <Screen title="More" back={false}>
      <ul className="list">
        <li>
          <Card onClick={() => go({ name: 'receipts' })} label="Receipts">
            <div className="strong">Receipts</div>
            <div className="muted small">{db.receipts.length} saved · snap job expenses</div>
          </Card>
        </li>
        <li>
          <Card onClick={() => go({ name: 'items' })} label="Saved items">
            <div className="strong">Saved items</div>
            <div className="muted small">{db.items.length} items autofill on new invoices</div>
          </Card>
        </li>
        <li>
          <Card onClick={() => go({ name: 'settings' })} label="Settings">
            <div className="strong">Business & settings</div>
            <div className="muted small">Logo, payment link, PDF style, backup & export</div>
          </Card>
        </li>
        {!pro ? (
          <li>
            <Card onClick={() => openPaywall('')} label="Invoice Jot Pro">
              <div className="strong">Invoice Jot Pro</div>
              <div className="muted small">Unlimited invoices and no PDF footer</div>
            </Card>
          </li>
        ) : null}
      </ul>
    </Screen>
  );
}
