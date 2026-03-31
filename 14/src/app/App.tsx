import { useEffect, useMemo, useRef, useState } from 'react';

import { ActivityRail } from '@/components/ActivityRail';
import { FeedbackToasts } from '@/components/FeedbackToasts';
import { PrestigeModal } from '@/components/PrestigeModal';
import { ScratchPanel } from '@/components/ScratchPanel';
import { SettingsModal } from '@/components/SettingsModal';
import { StatsModal } from '@/components/StatsModal';
import { TierSelector } from '@/components/TierSelector';
import { TopBar } from '@/components/TopBar';
import { TutorialCard } from '@/components/TutorialCard';
import { UpgradePanel } from '@/components/UpgradePanel';
import { useAutosave } from '@/hooks/useAutosave';
import { useGameLoop } from '@/hooks/useGameLoop';
import { useGameStore, useMetaUpgradeCards, usePrestigePreview, useUpgradeCards } from '@/store/gameStore';

type ServiceAccessMode = 'open' | 'admin' | 'maintenance';
type ServiceAccessSettings = {
  board: ServiceAccessMode;
  mountain: ServiceAccessMode;
  ai: ServiceAccessMode;
  stockSim: ServiceAccessMode;
};
type PrototypeSlotState = {
  activeKey: string;
};

const DEFAULT_SERVICE_ACCESS_SETTINGS: ServiceAccessSettings = {
  board: 'open',
  mountain: 'open',
  ai: 'open',
  stockSim: 'open',
};

const DEFAULT_PROTOTYPE_SLOT_STATE: PrototypeSlotState = {
  activeKey: '',
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

function normalizePrototypeSlotState(value: unknown): PrototypeSlotState {
  const source = value && typeof value === 'object' ? (value as Partial<PrototypeSlotState>) : {};
  const activeKey = String(source.activeKey || '').trim();
  return { activeKey };
}

function getCurrentSiteUser() {
  if (typeof window === 'undefined') return '';
  try {
    return String(window.localStorage.getItem('current_user') || '').trim();
  } catch {
    return '';
  }
}

function getCurrentUserRecord(currentUser: string) {
  if (typeof window === 'undefined' || !currentUser) return null;
  try {
    const raw = window.localStorage.getItem('users_db');
    if (!raw) return null;
    const users = JSON.parse(raw) as Record<string, { status?: string; isAdmin?: boolean }>;
    const key = Object.keys(users || {}).find((entry) => entry.toLowerCase() === currentUser.toLowerCase());
    return key ? users[key] : null;
  } catch {
    return null;
  }
}

function getStoredAccessSettings() {
  if (typeof window === 'undefined') return DEFAULT_SERVICE_ACCESS_SETTINGS;
  try {
    return normalizeServiceAccessSettings(JSON.parse(window.localStorage.getItem('service_access_settings') || '{}'));
  } catch {
    return DEFAULT_SERVICE_ACCESS_SETTINGS;
  }
}

function getStoredPrototypeSlotState() {
  if (typeof window === 'undefined') return DEFAULT_PROTOTYPE_SLOT_STATE;
  try {
    return normalizePrototypeSlotState(JSON.parse(window.localStorage.getItem('prototype_slot_state') || '{}'));
  } catch {
    return DEFAULT_PROTOTYPE_SLOT_STATE;
  }
}

function canAccessPrototype(currentUser: string, accessSettings: ServiceAccessSettings, prototypeSlot: PrototypeSlotState) {
  const userRecord = getCurrentUserRecord(currentUser);
  if (!userRecord) return false;
  if (prototypeSlot.activeKey !== 'relicSeal') return false;
  if (userRecord.isAdmin) return true;
  return accessSettings.stockSim === 'open' && userRecord.status === 'regular';
}

function getBlockedMessage(
  currentUser: string,
  userRecord: { status?: string; isAdmin?: boolean } | null,
  accessSettings: ServiceAccessSettings,
  prototypeSlot: PrototypeSlotState,
) {
  if (!currentUser) return '로그인 후 입장할 수 있는 프로토타입입니다.';
  if (!prototypeSlot.activeKey) return '현재 적용된 프로토타입이 없습니다.';
  if (prototypeSlot.activeKey !== 'relicSeal') return '현재 다른 프로토타입이 적용되어 있습니다.';
  if (userRecord?.isAdmin) return '';
  if (accessSettings.stockSim === 'maintenance') return '프로토타입이 현재 점검중입니다.';
  if (accessSettings.stockSim === 'admin') return '현재 관리자만 입장할 수 있습니다.';
  if (userRecord?.status === 'pending') return '승인된 회원만 이용할 수 있습니다. 관리자 승인 후 다시 시도해 주세요.';
  return '현재 계정은 이 프로토타입에 접근할 수 없습니다.';
}

function AccessBlocked({
  accessSettings,
  prototypeSlot,
}: {
  accessSettings: ServiceAccessSettings;
  prototypeSlot: PrototypeSlotState;
}) {
  const currentUser = getCurrentSiteUser();
  const userRecord = getCurrentUserRecord(currentUser);
  const message = getBlockedMessage(currentUser, userRecord, accessSettings, prototypeSlot);
  const loggedIn = Boolean(currentUser);

  return (
    <div className="rg-relative rg-flex rg-min-h-screen rg-items-center rg-justify-center rg-overflow-hidden rg-bg-vault rg-px-5 rg-py-12">
      <div className="rg-absolute rg-inset-0 rg-bg-[radial-gradient(circle_at_top,rgba(242,205,114,0.09),transparent_34%),radial-gradient(circle_at_80%_20%,rgba(169,140,255,0.12),transparent_30%),linear-gradient(180deg,#050812_0%,#0b1020_60%,#060911_100%)]" />
      <div className="rg-relative rg-w-full rg-max-w-2xl rg-rounded-[36px] rg-border rg-border-white/10 rg-bg-[linear-gradient(180deg,rgba(15,21,37,0.96),rgba(8,12,21,0.94))] rg-p-8 rg-shadow-card">
        <p className="rg-m-0 rg-text-xs rg-font-semibold rg-uppercase rg-tracking-[0.24em] rg-text-mystic-gold/76">Prototype Access</p>
        <h1 className="rg-mt-3 rg-font-display rg-text-[clamp(2rem,4vw,3.2rem)] rg-font-semibold rg-text-white">봉인된 행운의 서고</h1>
        <p className="rg-mt-4 rg-text-base rg-leading-8 rg-text-slate-300">{message}</p>
        <div className="rg-mt-8 rg-flex rg-flex-wrap rg-gap-3">
          <a
            href={loggedIn ? '/index.html' : '/login.html'}
            className="rg-inline-flex rg-min-h-[48px] rg-items-center rg-justify-center rg-rounded-full rg-bg-white rg-px-6 rg-text-sm rg-font-semibold rg-text-slate-900 rg-no-underline"
          >
            {loggedIn ? '메인으로 돌아가기' : '로그인하러 가기'}
          </a>
          {loggedIn ? (
            <span className="rg-inline-flex rg-min-h-[48px] rg-items-center rg-rounded-full rg-border rg-border-white/10 rg-bg-white/[0.04] rg-px-6 rg-text-sm rg-font-medium rg-text-slate-300">
              현재 계정: {currentUser}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function App() {
  const initialize = useGameStore((state) => state.initialize);
  const tick = useGameStore((state) => state.tick);
  const saveNow = useGameStore((state) => state.saveNow);
  const removeFeedback = useGameStore((state) => state.removeFeedback);
  const hydrated = useGameStore((state) => state.hydrated);
  const currentPanel = useGameStore((state) => state.currentPanel);
  const selectedTier = useGameStore((state) => state.selectedTier);
  const coins = useGameStore((state) => state.coins);
  const resonanceDust = useGameStore((state) => state.resonanceDust);
  const settings = useGameStore((state) => state.settings);
  const tutorial = useGameStore((state) => state.tutorial);
  const feedbacks = useGameStore((state) => state.feedbacks);
  const offlineSummary = useGameStore((state) => state.offlineSummary);
  const recentResults = useGameStore((state) => state.recentResults);
  const stats = useGameStore((state) => state.stats);
  const moodIndex = useGameStore((state) => state.moodIndex);
  const computed = useGameStore((state) => state.computed);
  const setSelectedTier = useGameStore((state) => state.setSelectedTier);
  const purchasePanel = useGameStore((state) => state.purchasePanel);
  const applyScratchProgress = useGameStore((state) => state.applyScratchProgress);
  const revealCurrentPanel = useGameStore((state) => state.revealCurrentPanel);
  const buyUpgrade = useGameStore((state) => state.buyUpgrade);
  const buyMetaUpgrade = useGameStore((state) => state.buyMetaUpgrade);
  const performPrestige = useGameStore((state) => state.performPrestige);
  const dismissTutorial = useGameStore((state) => state.dismissTutorial);
  const updateSettings = useGameStore((state) => state.updateSettings);
  const exportSaveString = useGameStore((state) => state.exportSaveString);
  const importSaveString = useGameStore((state) => state.importSaveString);
  const resetProgress = useGameStore((state) => state.resetProgress);

  const upgradeCards = useUpgradeCards();
  const metaUpgradeCards = useMetaUpgradeCards();
  const prestigePreview = usePrestigePreview();

  const [statsOpen, setStatsOpen] = useState(false);
  const [prestigeOpen, setPrestigeOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [accessSettings, setAccessSettings] = useState<ServiceAccessSettings>(() => getStoredAccessSettings());
  const [prototypeSlot, setPrototypeSlot] = useState<PrototypeSlotState>(() => getStoredPrototypeSlotState());
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
  });

  useEffect(() => {
    if (!feedbacks.length) return;
    const timers = feedbacks.map((entry) =>
      window.setTimeout(() => {
        removeFeedback(entry.id);
      }, entry.tone === 'rare' ? 1800 : 1400),
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [feedbacks, removeFeedback]);

  useEffect(() => {
    let cancelled = false;

    async function loadAccess() {
      try {
        const response = await fetch(new URL('/api/access-settings', window.location.origin), { cache: 'no-store' });
        const result = await response.json().catch(() => ({}));
        if (!cancelled && response.ok && result.accessSettings) {
          const nextSettings = normalizeServiceAccessSettings(result.accessSettings);
          window.localStorage.setItem('service_access_settings', JSON.stringify(nextSettings));
          setAccessSettings(nextSettings);
        }
      } catch {
      }
    }

    async function loadSlot() {
      try {
        const response = await fetch(new URL('/api/prototype-slot', window.location.origin), { cache: 'no-store' });
        const result = await response.json().catch(() => ({}));
        if (!cancelled && response.ok && result.prototypeSlot) {
          const nextSlot = normalizePrototypeSlotState(result.prototypeSlot);
          window.localStorage.setItem('prototype_slot_state', JSON.stringify(nextSlot));
          setPrototypeSlot(nextSlot);
        }
      } catch {
      }
    }

    loadAccess();
    loadSlot();
    return () => {
      cancelled = true;
    };
  }, []);

  const currentUser = getCurrentSiteUser();
  const effectiveBrushRadius = useMemo(
    () => computed.brushRadius * Math.min(1.9, 0.95 + (computed.scratchPower - 1) * 0.35),
    [computed.brushRadius, computed.scratchPower],
  );
  const autoLabel = computed.autoLoopEnabled
    ? '구매 · 긁기 · 공개 자동화'
    : computed.autoScratchEnabled
      ? '자동 긁기 활성'
      : '수동 플레이 중심';

  if (!canAccessPrototype(currentUser, accessSettings, prototypeSlot)) {
    return <AccessBlocked accessSettings={accessSettings} prototypeSlot={prototypeSlot} />;
  }

  if (!hydrated || !currentPanel) {
    return (
      <div className="rg-flex rg-min-h-screen rg-items-center rg-justify-center rg-bg-vault rg-px-6">
        <div className="rg-rounded-[28px] rg-border rg-border-white/10 rg-bg-white/[0.04] rg-p-8 rg-text-center rg-shadow-card">
          <div className="rg-font-display rg-text-3xl rg-font-semibold rg-text-white">서고를 여는 중입니다</div>
          <p className="rg-mb-0 rg-mt-3 rg-text-sm rg-leading-7 rg-text-slate-300">저장 데이터를 불러오고 첫 패널을 준비하고 있습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rg-min-h-screen rg-bg-vault rg-px-4 rg-py-4 rg-text-slate-100 sm:rg-px-5 lg:rg-px-6">
      <div className="rg-mx-auto rg-flex rg-max-w-[1600px] rg-flex-col rg-gap-4">
        <TopBar
          coins={coins}
          dust={resonanceDust}
          cps={computed.currentCpsEstimate}
          compactNumbers={settings.compactNumbers}
          autoLabel={autoLabel}
          onOpenStats={() => setStatsOpen(true)}
          onOpenPrestige={() => setPrestigeOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        <TutorialCard hidden={tutorial.dismissed} onClose={dismissTutorial} />

        <div className="rg-grid rg-gap-4 xl:rg-grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
          <div className="rg-space-y-4">
            <TierSelector
              selectedTier={selectedTier}
              onSelect={setSelectedTier}
              compactNumbers={settings.compactNumbers}
            />
            <ScratchPanel
              panel={currentPanel}
              brushRadius={effectiveBrushRadius}
              compactNumbers={settings.compactNumbers}
              reducedMotion={settings.reducedMotion}
              onScratchProgress={applyScratchProgress}
              onRevealNow={() => revealCurrentPanel('manual')}
              onNextPanel={() => purchasePanel()}
            />
          </div>

          <UpgradePanel
            upgrades={upgradeCards}
            metaUpgrades={metaUpgradeCards}
            coins={coins}
            dust={resonanceDust}
            compactNumbers={settings.compactNumbers}
            onBuyUpgrade={buyUpgrade}
            onBuyMetaUpgrade={buyMetaUpgrade}
          />
        </div>

        <div className="rg-grid rg-gap-4 xl:rg-grid-cols-[minmax(0,1fr)_360px]">
          <section className="rg-rounded-[28px] rg-border rg-border-white/10 rg-bg-white/[0.03] rg-p-5">
            <p className="rg-m-0 rg-text-xs rg-font-semibold rg-uppercase rg-tracking-[0.24em] rg-text-slate-400">오늘의 흐름</p>
            <div className="rg-mt-4 rg-grid rg-gap-3 md:rg-grid-cols-3">
              <div className="rg-rounded-[22px] rg-border rg-border-white/8 rg-bg-white/[0.04] rg-p-4">
                <div className="rg-text-sm rg-text-slate-400">총 획득 코인</div>
                <div className="rg-mt-2 rg-font-display rg-text-2xl rg-font-semibold rg-text-white">{coins.toLocaleString('ko-KR')}</div>
              </div>
              <div className="rg-rounded-[22px] rg-border rg-border-white/8 rg-bg-white/[0.04] rg-p-4">
                <div className="rg-text-sm rg-text-slate-400">총 긁은 횟수</div>
                <div className="rg-mt-2 rg-font-display rg-text-2xl rg-font-semibold rg-text-white">{stats.totalPanelsScratched.toLocaleString('ko-KR')}</div>
              </div>
              <div className="rg-rounded-[22px] rg-border rg-border-white/8 rg-bg-white/[0.04] rg-p-4">
                <div className="rg-text-sm rg-text-slate-400">최고 단일 보상</div>
                <div className="rg-mt-2 rg-font-display rg-text-2xl rg-font-semibold rg-text-mystic-gold">{stats.highestReward.toLocaleString('ko-KR')}</div>
              </div>
            </div>
          </section>

          <ActivityRail
            moodIndex={moodIndex}
            currentCps={computed.currentCpsEstimate}
            recentResults={recentResults}
            stats={stats}
            compactNumbers={settings.compactNumbers}
          />
        </div>
      </div>

      <FeedbackToasts entries={feedbacks} />

      <StatsModal
        open={statsOpen}
        onClose={() => setStatsOpen(false)}
        stats={stats}
        recentResults={recentResults}
        cps={computed.currentCpsEstimate}
        compactNumbers={settings.compactNumbers}
      />
      <PrestigeModal
        open={prestigeOpen}
        onClose={() => setPrestigeOpen(false)}
        preview={prestigePreview}
        dust={resonanceDust}
        compactNumbers={settings.compactNumbers}
        metaUpgrades={metaUpgradeCards}
        onBuyMetaUpgrade={buyMetaUpgrade}
        onPrestige={performPrestige}
      />
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        offlineSummary={offlineSummary}
        onUpdate={updateSettings}
        onExport={exportSaveString}
        onImport={importSaveString}
        onReset={resetProgress}
      />
    </div>
  );
}
