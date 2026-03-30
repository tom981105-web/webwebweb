import { useEffect, useState } from 'react';

import { StockSimulationFeature } from '@/features/stock-sim';

type ServiceAccessMode = 'open' | 'admin' | 'maintenance';

type ServiceAccessSettings = {
  board: ServiceAccessMode;
  mountain: ServiceAccessMode;
  ai: ServiceAccessMode;
  stockSim: ServiceAccessMode;
};

const DEFAULT_SERVICE_ACCESS_SETTINGS: ServiceAccessSettings = {
  board: 'open',
  mountain: 'open',
  ai: 'open',
  stockSim: 'open',
};

function normalizeServiceAccessMode(value: unknown): ServiceAccessMode {
  const mode = String(value || '').trim().toLowerCase();
  if (mode === 'admin' || mode === 'maintenance') return mode;
  return 'open';
}

function normalizeServiceAccessSettings(value: unknown): ServiceAccessSettings {
  const source = value && typeof value === 'object' ? (value as Partial<ServiceAccessSettings>) : {};
  return {
    board: normalizeServiceAccessMode(source.board),
    mountain: normalizeServiceAccessMode(source.mountain),
    ai: normalizeServiceAccessMode(source.ai),
    stockSim: normalizeServiceAccessMode(source.stockSim),
  };
}

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

function getCurrentUserRecord(currentUser: string) {
  if (typeof window === 'undefined' || !currentUser) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem('users_db');
    if (!raw) return null;
    const users = JSON.parse(raw) as Record<string, { status?: string; isAdmin?: boolean }>;
    const key = Object.keys(users || {}).find(
      (entry) => entry.toLowerCase() === currentUser.trim().toLowerCase(),
    );
    return key ? users[key] : null;
  } catch {
    return null;
  }
}

function getStoredAccessSettings() {
  if (typeof window === 'undefined') {
    return DEFAULT_SERVICE_ACCESS_SETTINGS;
  }

  try {
    return normalizeServiceAccessSettings(
      JSON.parse(window.localStorage.getItem('service_access_settings') || '{}'),
    );
  } catch {
    return DEFAULT_SERVICE_ACCESS_SETTINGS;
  }
}

function canAccessStockSim(currentUser: string, accessSettings: ServiceAccessSettings) {
  const userRecord = getCurrentUserRecord(currentUser);
  if (!userRecord) return false;
  if (userRecord.isAdmin) return true;
  return accessSettings.stockSim === 'open' && userRecord.status === 'regular';
}

function getRootUrl(path: string) {
  if (typeof window === 'undefined') {
    return path;
  }

  return new URL(path, window.location.origin).href;
}

function getBlockedMessage(
  currentUser: string,
  userRecord: { status?: string; isAdmin?: boolean } | null,
  accessSettings: ServiceAccessSettings,
) {
  if (!currentUser) {
    return '로그인 후 이용 가능한 서비스입니다.';
  }

  if (userRecord?.isAdmin) {
    return '';
  }

  if (accessSettings.stockSim === 'maintenance') {
    return '주식장은 현재 점검중입니다. 잠시 후 다시 확인해 주세요.';
  }

  if (accessSettings.stockSim === 'admin') {
    return '주식장은 현재 관리자만 이용할 수 있습니다.';
  }

  if (userRecord?.status === 'pending') {
    return '승인된 회원만 주식장에 입장할 수 있습니다. 관리자 승인 후 다시 시도해 주세요.';
  }

  return '현재 계정은 주식장 이용 권한이 없습니다.';
}

function AccessBlocked({ accessSettings }: { accessSettings: ServiceAccessSettings }) {
  const currentUser = getCurrentSiteUser();
  const isLoggedIn = Boolean(currentUser);
  const userRecord = getCurrentUserRecord(currentUser);
  const message = getBlockedMessage(currentUser, userRecord, accessSettings);

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
  const [accessSettings, setAccessSettings] = useState<ServiceAccessSettings>(() => getStoredAccessSettings());

  useEffect(() => {
    let cancelled = false;

    async function loadAccessSettings() {
      try {
        const response = await fetch(new URL('/api/access-settings', window.location.origin), {
          cache: 'no-store',
        });
        const result = await response.json().catch(() => ({}));
        if (!cancelled && response.ok && result.accessSettings) {
          const nextSettings = normalizeServiceAccessSettings(result.accessSettings);
          window.localStorage.setItem('service_access_settings', JSON.stringify(nextSettings));
          setAccessSettings(nextSettings);
        }
      } catch {
      }
    }

    loadAccessSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!canAccessStockSim(currentUser, accessSettings)) {
    return <AccessBlocked accessSettings={accessSettings} />;
  }

  return <StockSimulationFeature shellMode="standalone" showAdminPanel />;
}
