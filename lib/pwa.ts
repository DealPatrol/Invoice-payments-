export const IOS_INSTALL_HINT_STORAGE_KEY = 'il.dismiss-ios-install-hint';

const hintListeners = new Set<() => void>();

export function isIosDevice(userAgent: string, maxTouchPoints = 0, platform = '') {
  if (/iPad|iPhone|iPod/i.test(userAgent)) return true;
  // iPadOS 13+ reports as a Macintosh desktop UA.
  if (/Macintosh/i.test(userAgent) && maxTouchPoints > 1) return true;
  if (platform === 'MacIntel' && maxTouchPoints > 1) return true;
  return false;
}

export function isIosSafari(userAgent: string, maxTouchPoints = 0, platform = '') {
  if (!isIosDevice(userAgent, maxTouchPoints, platform)) return false;
  if (/CriOS|FxiOS|EdgiOS|OPiOS|OPT\/|DuckDuckGo/i.test(userAgent)) return false;
  if (/FBAN|FBAV|Instagram|Line\/|Twitter/i.test(userAgent)) return false;
  return /Safari/i.test(userAgent) || /AppleWebKit/i.test(userAgent);
}

export function isStandaloneDisplay(standalone: boolean, displayModeStandalone: boolean) {
  return Boolean(standalone || displayModeStandalone);
}

export function isCustomerFacingPath(pathname: string, search = '') {
  if (pathname === '/pay' || pathname.startsWith('/pay/')) return true;
  if (pathname.startsWith('/i/')) return true;
  if (pathname.startsWith('/portal/')) return true;
  if (pathname.startsWith('/estimate/')) return true;
  if (pathname === '/studio') {
    const query = search.startsWith('?') ? search.slice(1) : search;
    const params = new URLSearchParams(query);
    if (params.get('print') === '1' || params.get('view') === '1') return true;
  }
  return false;
}

export function isAppChromePath(pathname: string, search = '') {
  if (isCustomerFacingPath(pathname, search)) return false;
  if (pathname === '/' || pathname === '/pricing' || pathname === '/welcome' || pathname === '/login') {
    return false;
  }
  return true;
}

export function shouldShowIosInstallHint(opts: {
  userAgent: string;
  standalone: boolean;
  displayModeStandalone: boolean;
  dismissed: boolean;
  maxTouchPoints?: number;
  platform?: string;
  pathname?: string;
  search?: string;
}) {
  if (opts.dismissed) return false;
  if (isStandaloneDisplay(opts.standalone, opts.displayModeStandalone)) return false;
  if (opts.pathname && isCustomerFacingPath(opts.pathname, opts.search ?? '')) return false;
  return isIosSafari(opts.userAgent, opts.maxTouchPoints ?? 0, opts.platform ?? '');
}

export function subscribeIosInstallHint(onChange: () => void) {
  hintListeners.add(onChange);
  if (typeof window === 'undefined') {
    return () => {
      hintListeners.delete(onChange);
    };
  }
  window.addEventListener('storage', onChange);
  const media = window.matchMedia('(display-mode: standalone)');
  media.addEventListener('change', onChange);
  return () => {
    hintListeners.delete(onChange);
    window.removeEventListener('storage', onChange);
    media.removeEventListener('change', onChange);
  };
}

export function dismissIosInstallHint() {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(IOS_INSTALL_HINT_STORAGE_KEY, '1');
  hintListeners.forEach((listener) => listener());
}

export function readIosInstallHintVisible(pathname: string, search = '') {
  if (typeof window === 'undefined') return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return shouldShowIosInstallHint({
    userAgent: navigator.userAgent,
    standalone: Boolean(nav.standalone),
    displayModeStandalone: window.matchMedia('(display-mode: standalone)').matches,
    dismissed: window.localStorage.getItem(IOS_INSTALL_HINT_STORAGE_KEY) === '1',
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
    platform: navigator.platform ?? '',
    pathname,
    search,
  });
}
