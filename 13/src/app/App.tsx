import { StockSimulationFeature } from '@/features/stock-sim';

function getCurrentSiteUser() {
  if (typeof window === 'undefined') {
    return '';
  }

  try {
    return String(window.localStorage.getItem('current_user') || '').trim();
  } catch {
    return '';
  }
}

function canAccessStockSim(currentUser: string) {
  const normalizedUser = String(currentUser || '').trim().toLowerCase();
  return normalizedUser === 'admin' || normalizedUser === 'tomem';
}

function getRootUrl(path: string) {
  if (typeof window === 'undefined') {
    return path;
  }

  return new URL(path, window.location.origin).href;
}

function AccessBlocked() {
  const currentUser = getCurrentSiteUser();
  const isLoggedIn = Boolean(currentUser);
  const message = isLoggedIn
    ? '현재 이 기능은 관리자와 tomem 계정만 사용할 수 있습니다.'
    : '로그인 후 접근할 수 있으며, 현재는 관리자와 tomem 계정에만 열려 있습니다.';

  return (
    <div className="stock-sim-shell ss-relative ss-flex ss-min-h-dvh ss-items-center ss-justify-center ss-overflow-hidden">
      <div className="ss-pointer-events-none ss-absolute ss-inset-0 ss-bg-[radial-gradient(circle_at_top,rgba(62,101,173,0.22),transparent_42%),linear-gradient(180deg,#030813_0%,#08111f_42%,#050b14_100%)]" />
      <div className="ss-relative ss-w-full ss-max-w-[720px] ss-rounded-[32px] ss-border ss-border-white/10 ss-bg-[linear-gradient(180deg,rgba(13,22,39,0.94),rgba(7,13,24,0.9))] ss-px-8 ss-py-10 ss-shadow-[0_26px_70px_rgba(0,0,0,0.42)]">
        <p className="ss-text-sm ss-font-semibold ss-uppercase ss-tracking-[0.24em] ss-text-cyan-100/72">Limited Access</p>
        <h1 className="ss-mt-4 ss-text-4xl ss-font-semibold ss-text-white">주식장</h1>
        <p className="ss-mt-4 ss-text-base ss-leading-8 ss-text-slate-300">{message}</p>
        <div className="ss-mt-8 ss-flex ss-flex-wrap ss-gap-3">
          <a
            href={isLoggedIn ? getRootUrl('/index.html') : getRootUrl('/login.html')}
            className="ss-inline-flex ss-min-h-[48px] ss-items-center ss-justify-center ss-rounded-full ss-bg-white ss-px-6 ss-text-sm ss-font-semibold ss-text-slate-900 ss-no-underline"
          >
            {isLoggedIn ? '메인으로 돌아가기' : '로그인하러 가기'}
          </a>
          {isLoggedIn ? (
            <span className="ss-inline-flex ss-min-h-[48px] ss-items-center ss-justify-center ss-rounded-full ss-border ss-border-white/15 ss-bg-white/5 ss-px-6 ss-text-sm ss-font-medium ss-text-slate-300">
              현재 접속 계정: {currentUser}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function App() {
  const currentUser = getCurrentSiteUser();

  if (!canAccessStockSim(currentUser)) {
    return <AccessBlocked />;
  }

  return <StockSimulationFeature shellMode="standalone" showAdminPanel />;
}
