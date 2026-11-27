import { AppProvider, useApp, type Route } from './store';
import { Home } from './screens/Home';
import { Docs } from './screens/Docs';
import { DocScreen } from './screens/DocScreen';
import { ClientEdit, Clients } from './screens/Clients';
import { Items } from './screens/Items';
import { ReceiptEdit, Receipts } from './screens/Receipts';
import { Settings } from './screens/Settings';
import { More } from './screens/More';
import { Paywall } from './screens/Paywall';
import { Onboarding } from './screens/Onboarding';

function Current({ route }: { route: Route }) {
  switch (route.name) {
    case 'home':
      return <Home />;
    case 'docs':
      return <Docs kind={route.kind} />;
    case 'doc':
      return <DocScreen key={route.id} id={route.id} />;
    case 'clients':
      return <Clients />;
    case 'client':
      return <ClientEdit key={route.id ?? 'new'} id={route.id} />;
    case 'items':
      return <Items />;
    case 'receipts':
      return <Receipts />;
    case 'receipt':
      return <ReceiptEdit key={route.id ?? 'new'} id={route.id} />;
    case 'settings':
      return <Settings />;
    case 'more':
      return <More />;
  }
}

function TabBar() {
  const { route, go } = useApp();
  const tabs: { label: string; r: Route; match: Route['name'][] }[] = [
    { label: 'Home', r: { name: 'home' }, match: ['home'] },
    { label: 'Invoices', r: { name: 'docs', kind: 'invoice' }, match: ['docs', 'doc'] },
    { label: 'Clients', r: { name: 'clients' }, match: ['clients', 'client'] },
    { label: 'More', r: { name: 'more' }, match: ['more', 'settings', 'items', 'receipts', 'receipt'] },
  ];
  return (
    <nav className="tabbar" aria-label="Main">
      {tabs.map((t) => {
        const on = t.match.includes(route.name);
        return (
          <button key={t.label} className={on ? 'on' : ''} aria-current={on ? 'page' : undefined} onClick={() => go(t.r)}>
            {t.label}
          </button>
        );
      })}
    </nav>
  );
}

function Shell() {
  const { ready, db, route, toastMsg, saveError, loadError } = useApp();
  if (!ready) return <div className="loading" aria-busy="true">Loading…</div>;
  if (!db.onboarded) return <Onboarding />;
  return (
    <>
      {loadError || saveError ? (
        <div className="banner-error" role="alert">
          {saveError ?? `Could not open saved data: ${loadError}`}
        </div>
      ) : null}
      <main>
        <Current route={route} />
      </main>
      <TabBar />
      <Paywall />
      {toastMsg ? (
        <div className="toast" role="status" aria-live="polite">
          {toastMsg}
        </div>
      ) : null}
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
