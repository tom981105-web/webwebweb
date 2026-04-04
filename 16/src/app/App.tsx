import { useEffect, useRef, useState } from 'react';

import { ActivityRail } from '@/components/ActivityRail';
import { FeedbackLayer } from '@/components/FeedbackLayer';
import { PrestigeModal } from '@/components/PrestigeModal';
import { ResourceBar } from '@/components/ResourceBar';
import { ScratchPanel } from '@/components/ScratchPanel';
import { SettingsModal } from '@/components/SettingsModal';
import { StatsModal } from '@/components/StatsModal';
import { TierSelector } from '@/components/TierSelector';
import { TutorialCard } from '@/components/TutorialCard';
import { UpgradePanel } from '@/components/UpgradePanel';
import { useAutosave } from '@/hooks/useAutosave';
import { useGameLoop } from '@/hooks/useGameLoop';
import { useGameStore } from '@/store/gameStore';
import type { PrototypeSlotState, ServiceAccessSettings } from '@/types/game';

const DEFAULT_SERVICE_ACCESS_SETTINGS: ServiceAccessSettings = {
  board: 'open',
  mountain: 'open',
  ai: 'open',
  stockSim: 'open',
};

const DEFAULT_PROTOTYPE_SLOT_STATE: PrototypeSlotState = {
  activeKey: '',
};

function normalizeServiceAccessSettings(value: unknown): ServiceAccessSettings {
  const source = value && typeof value === 'object' ? (value as Partial<ServiceAccessSettings>) : {};
  const normalize = (mode: unknown) => {
    const next = String(mode || '').trim().toLowerCase();
    return next === 'admin' || next === 'maintenance' ? next : 'open';
  };

  return {
    board: normalize(source.board),
    mountain: normalize(source.mountain),
    ai: normalize(source.ai),
    stockSim: normalize(source.stockSim),
  };
}

function normalizePrototypeSlotState(value: unknown): PrototypeSlotState {
  const source = value && typeof value === 'object' ? (value as Partial<PrototypeSlotState>) : {};
  return {
    activeKey: String(source.activeKey || '').trim(),
  };
}

function getCurrentUser() {
  try {
    return String(window.localStorage.getItem('current_user') || '').trim();
  } catch {
    return '';
  }
}

function getCurrentUserRecord(currentUser: string) {
  if (!currentUser) return null;
  try {
    const raw = window.localStorage.getItem('users_db') || '{}';
    const users = JSON.parse(raw) as Record<string, { status?: string; isAdmin?: boolean }>;
    const key = Object.keys(users).find((entry) => entry.toLowerCase() === currentUser.toLowerCase());
    return key ? users[key] : null;
  } catch {
    return null;
  }
}

function canAccessPrototype(currentUser: string, accessSettings: ServiceAccessSettings, prototypeSlot: PrototypeSlotState) {
  const user = getCurrentUserRecord(currentUser);
  if (!user) return false;
  if (prototypeSlot.activeKey !== 'probabilityForge') return false;
  if (user.isAdmin) return true;
  return accessSettings.stockSim === 'open' && user.status === 'regular';
}

function getBlockedMessage(currentUser: string, accessSettings: ServiceAccessSettings, prototypeSlot: PrototypeSlotState) {
  const user = getCurrentUserRecord(currentUser);
  if (!currentUser) return 'You need to sign in before entering this prototype.';
  if (!prototypeSlot.activeKey) return 'No prototype is currently assigned to this slot.';
  if (prototypeSlot.activeKey !== 'probabilityForge') return 'Archive of Fortune is not the active prototype in the main slot right now.';
  if (user?.isAdmin) return '';
  if (accessSettings.stockSim === 'maintenance') return 'This prototype is currently in maintenance mode.';
  if (accessSettings.stockSim === 'admin') return 'Only administrators can enter this prototype right now.';
  if (user?.status === 'pending') return 'Your account still needs approval before this prototype opens up.';
  return 'Your account does not currently have access to this prototype.';
}

function AccessBlocked({ accessSettings, prototypeSlot }: { accessSettings: ServiceAccessSettings; prototypeSlot: PrototypeSlotState }) {
  const currentUser = getCurrentUser();
  const loggedIn = Boolean(currentUser);

  return (
    <div className="pg-flex pg-min-h-screen pg-items-center pg-justify-center pg-bg-shell pg-px-5 pg-py-12">
      <div className="pg-w-full pg-max-w-2xl pg-rounded-[36px] pg-border pg-border-white/10 pg-bg-forge-900/92 pg-p-8 pg-shadow-shell">
        <p className="pg-m-0 pg-text-xs pg-font-semibold pg-uppercase pg-tracking-[0.24em] pg-text-sky-200/70">Prototype access</p>
        <h1 className="pg-mb-0 pg-mt-3 pg-font-display pg-text-4xl pg-font-semibold pg-text-white">Archive of Fortune</h1>
        <p className="pg-mt-4 pg-text-base pg-leading-8 pg-text-slate-300">
          {getBlockedMessage(currentUser, accessSettings, prototypeSlot)}
        </p>
        <div className="pg-mt-8 pg-flex pg-flex-wrap pg-gap-3">
          <a
            href={loggedIn ? '/index.html' : '/login.html'}
            className="pg-inline-flex pg-min-h-[48px] pg-items-center pg-justify-center pg-rounded-full pg-bg-white pg-px-6 pg-text-sm pg-font-semibold pg-text-slate-900 pg-no-underline"
          >
            {loggedIn ? 'Back to the retreat' : 'Go to login'}
          </a>
        </div>
      </div>
    </div>
  );
}

export function App() {
  const initialize = useGameStore((state) => state.initialize);
  const tick = useGameStore((state) => state.tick);
  const saveNow = useGameStore((state) => state.saveNow);
  const hydrated = useGameStore((state) => state.hydrated);
  const tutorialDismissed = useGameStore((state) => state.tutorial.dismissed);
  const dismissTutorial = useGameStore((state) => state.dismissTutorial);

  const [statsOpen, setStatsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [prestigeOpen, setPrestigeOpen] = useState(false);
  const [accessReady, setAccessReady] = useState(false);
  const [accessSettings, setAccessSettings] = useState<ServiceAccessSettings>(DEFAULT_SERVICE_ACCESS_SETTINGS);
  const [prototypeSlot, setPrototypeSlot] = useState<PrototypeSlotState>(DEFAULT_PROTOTYPE_SLOT_STATE);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    initialize();
  }, [initialize]);

  useGameLoop((deltaMs) => {
    if (!hydrated) return;
    tick(deltaMs);
  });

  useAutosave(() => {
    if (!hydrated) return;
    saveNow();
  }, hydrated);

  useEffect(() => {
    let cancelled = false;

    const refreshAccessSnapshot = async () => {
      const localAccess = (() => {
        try {
          return normalizeServiceAccessSettings(JSON.parse(window.localStorage.getItem('service_access_settings') || '{}'));
        } catch {
          return DEFAULT_SERVICE_ACCESS_SETTINGS;
        }
      })();

      const localSlot = (() => {
        try {
          return normalizePrototypeSlotState(JSON.parse(window.localStorage.getItem('prototype_slot_state') || '{}'));
        } catch {
          return DEFAULT_PROTOTYPE_SLOT_STATE;
        }
      })();

      let nextAccess = localAccess;
      let nextSlot = localSlot;

      try {
        const [accessResponse, slotResponse] = await Promise.all([
          fetch(new URL('/api/access-settings', window.location.origin), { cache: 'no-store' }),
          fetch(new URL('/api/prototype-slot', window.location.origin), { cache: 'no-store' }),
        ]);
        const accessResult = await accessResponse.json().catch(() => ({}));
        const slotResult = await slotResponse.json().catch(() => ({}));

        if (accessResponse.ok && accessResult.accessSettings) {
          nextAccess = normalizeServiceAccessSettings(accessResult.accessSettings);
        }
        if (slotResponse.ok && slotResult.prototypeSlot) {
          nextSlot = normalizePrototypeSlotState(slotResult.prototypeSlot);
        }
      } catch {
        // local fallback is enough
      }

      if (!cancelled) {
        setAccessSettings(nextAccess);
        setPrototypeSlot(nextSlot);
        setAccessReady(true);
      }
    };

    refreshAccessSnapshot();

    const refreshHandler = () => {
      refreshAccessSnapshot();
    };

    window.addEventListener('prototype-slot:updated', refreshHandler);
    window.addEventListener('service-access:updated', refreshHandler);
    window.addEventListener('auth:login-success', refreshHandler);
    window.addEventListener('storage', refreshHandler);

    return () => {
      cancelled = true;
      window.removeEventListener('prototype-slot:updated', refreshHandler);
      window.removeEventListener('service-access:updated', refreshHandler);
      window.removeEventListener('auth:login-success', refreshHandler);
      window.removeEventListener('storage', refreshHandler);
    };
  }, []);

  const currentUser = getCurrentUser();

  if (!accessReady) {
    return (
      <div className="pg-flex pg-min-h-screen pg-items-center pg-justify-center pg-bg-shell">
        <div className="pg-rounded-[28px] pg-border pg-border-white/10 pg-bg-white/[0.04] pg-p-8 pg-text-center pg-shadow-card">
          <div className="pg-font-display pg-text-3xl pg-font-semibold pg-text-white">Checking prototype access…</div>
          <p className="pg-mb-0 pg-mt-3 pg-text-sm pg-leading-7 pg-text-slate-300">
            Pulling the latest slot and service status before the archive opens.
          </p>
        </div>
      </div>
    );
  }

  if (!canAccessPrototype(currentUser, accessSettings, prototypeSlot)) {
    return <AccessBlocked accessSettings={accessSettings} prototypeSlot={prototypeSlot} />;
  }

  if (!hydrated) {
    return (
      <div className="pg-flex pg-min-h-screen pg-items-center pg-justify-center pg-bg-shell">
        <div className="pg-rounded-[28px] pg-border pg-border-white/10 pg-bg-white/[0.04] pg-p-8 pg-text-center pg-shadow-card">
          <div className="pg-font-display pg-text-3xl pg-font-semibold pg-text-white">Waking the archive…</div>
          <p className="pg-mb-0 pg-mt-3 pg-text-sm pg-leading-7 pg-text-slate-300">
            Loading your seals, upgrades, and recent fortune trails.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pg-min-h-screen pg-bg-shell pg-px-4 pg-py-4 pg-text-slate-100 sm:pg-px-5 lg:pg-px-6">
      <div className="pg-mx-auto pg-flex pg-max-w-[1760px] pg-flex-col pg-gap-4">
        <ResourceBar onOpenStats={() => setStatsOpen(true)} onOpenPrestige={() => setPrestigeOpen(true)} onOpenSettings={() => setSettingsOpen(true)} />
        <div className="pg-grid pg-gap-4 xl:pg-grid-cols-[minmax(0,1fr)_400px] xl:pg-items-start">
          <div className="pg-space-y-4">
            {!tutorialDismissed ? <TutorialCard onDismiss={dismissTutorial} /> : null}
            <TierSelector />
            <ScratchPanel />
          </div>
          <div className="pg-space-y-4">
            <UpgradePanel />
            <ActivityRail />
          </div>
        </div>
      </div>

      <StatsModal open={statsOpen} onClose={() => setStatsOpen(false)} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <PrestigeModal open={prestigeOpen} onClose={() => setPrestigeOpen(false)} />
      <FeedbackLayer />
    </div>
  );
}
