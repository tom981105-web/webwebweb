import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { SidebarNav } from '@/components/SidebarNav';
import { ToastRail } from '@/components/ToastRail';
import { TopBar } from '@/components/TopBar';
import { CollectionPanel } from '@/components/panels/CollectionPanel';
import { CraftingPanel } from '@/components/panels/CraftingPanel';
import { DashboardPanel } from '@/components/panels/DashboardPanel';
import { EnhancementPanel } from '@/components/panels/EnhancementPanel';
import { EquipmentPanel } from '@/components/panels/EquipmentPanel';
import { ExpeditionPanel } from '@/components/panels/ExpeditionPanel';
import { RecordsPanel } from '@/components/panels/RecordsPanel';
import { ResearchPanel } from '@/components/panels/ResearchPanel';
import { SettingsPanel } from '@/components/panels/SettingsPanel';
import { ShopPanel } from '@/components/panels/ShopPanel';
import { WorkshopPanel } from '@/components/panels/WorkshopPanel';
import { useAutosave } from '@/hooks/useAutosave';
import { useGameLoop } from '@/hooks/useGameLoop';
import { useGameStore } from '@/store/useGameStore';
import type { NavView } from '@/types/game';

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

function normalizeServiceAccessSettings(value: unknown): ServiceAccessSettings {
  const source = value && typeof value === 'object' ? (value as Partial<ServiceAccessSettings>) : {};
  const normalize = (mode: unknown): ServiceAccessMode => {
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
    const users = JSON.parse(window.localStorage.getItem('users_db') || '{}') as Record<string, { status?: string; isAdmin?: boolean }>;
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
  if (!currentUser) return '로그인 후 입장할 수 있습니다.';
  if (!prototypeSlot.activeKey) return '현재 적용된 프로토타입이 없습니다.';
  if (prototypeSlot.activeKey !== 'probabilityForge') return '현재는 다른 프로토타입이 메인 슬롯에 적용되어 있습니다.';
  if (user?.isAdmin) return '';
  if (accessSettings.stockSim === 'maintenance') return '프로토타입이 현재 점검 중입니다.';
  if (accessSettings.stockSim === 'admin') return '현재 관리자만 입장할 수 있습니다.';
  if (user?.status === 'pending') return '승인된 회원만 입장할 수 있습니다.';
  return '현재 계정은 이 프로토타입에 접근할 수 없습니다.';
}

function AccessBlocked({ accessSettings, prototypeSlot }: { accessSettings: ServiceAccessSettings; prototypeSlot: PrototypeSlotState }) {
  const currentUser = getCurrentUser();
  const message = getBlockedMessage(currentUser, accessSettings, prototypeSlot);
  const loggedIn = Boolean(currentUser);

  return (
    <div className="pg-flex pg-min-h-screen pg-items-center pg-justify-center pg-bg-shell pg-px-5 pg-py-12">
      <div className="pg-w-full pg-max-w-2xl pg-rounded-[36px] pg-border pg-border-white/10 pg-bg-forge-900/92 pg-p-8 pg-shadow-shell">
        <p className="pg-m-0 pg-text-xs pg-font-semibold pg-uppercase pg-tracking-[0.24em] pg-text-sky-200/70">Prototype Access</p>
        <h1 className="pg-mb-0 pg-mt-3 pg-font-display pg-text-4xl pg-font-semibold pg-text-white">확률조작게임</h1>
        <p className="pg-mt-4 pg-text-base pg-leading-8 pg-text-slate-300">{message}</p>
        <div className="pg-mt-8 pg-flex pg-flex-wrap pg-gap-3">
          <a href={loggedIn ? '/index.html' : '/login.html'} className="pg-inline-flex pg-min-h-[48px] pg-items-center pg-justify-center pg-rounded-full pg-bg-white pg-px-6 pg-text-sm pg-font-semibold pg-text-slate-900 pg-no-underline">
            {loggedIn ? '메인으로 돌아가기' : '로그인하러 가기'}
          </a>
        </div>
      </div>
    </div>
  );
}

const VIEW_COMPONENTS: Record<NavView, React.ComponentType> = {
  dashboard: DashboardPanel,
  equipment: EquipmentPanel,
  enhancement: EnhancementPanel,
  research: ResearchPanel,
  crafting: CraftingPanel,
  expeditions: ExpeditionPanel,
  workshop: WorkshopPanel,
  collection: CollectionPanel,
  shop: ShopPanel,
  records: RecordsPanel,
  settings: SettingsPanel,
};

export function App() {
  const initialize = useGameStore((state) => state.initialize);
  const tick = useGameStore((state) => state.tick);
  const saveNow = useGameStore((state) => state.saveNow);
  const hydrated = useGameStore((state) => state.hydrated);
  const selectedView = useGameStore((state) => state.selectedView);
  const [accessSettings, setAccessSettings] = useState<ServiceAccessSettings>(() => {
    try {
      return normalizeServiceAccessSettings(JSON.parse(window.localStorage.getItem('service_access_settings') || '{}'));
    } catch {
      return DEFAULT_SERVICE_ACCESS_SETTINGS;
    }
  });
  const [prototypeSlot, setPrototypeSlot] = useState<PrototypeSlotState>(() => {
    try {
      return JSON.parse(window.localStorage.getItem('prototype_slot_state') || '{}') as PrototypeSlotState;
    } catch {
      return DEFAULT_PROTOTYPE_SLOT_STATE;
    }
  });
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
    let cancelled = false;
    const load = async () => {
      try {
        const accessResponse = await fetch(new URL('/api/access-settings', window.location.origin), { cache: 'no-store' });
        const accessResult = await accessResponse.json().catch(() => ({}));
        if (!cancelled && accessResponse.ok && accessResult.accessSettings) {
          setAccessSettings(normalizeServiceAccessSettings(accessResult.accessSettings));
        }
      } catch {
      }
      try {
        const slotResponse = await fetch(new URL('/api/prototype-slot', window.location.origin), { cache: 'no-store' });
        const slotResult = await slotResponse.json().catch(() => ({}));
        if (!cancelled && slotResponse.ok && slotResult.prototypeSlot) {
          setPrototypeSlot(slotResult.prototypeSlot);
        }
      } catch {
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const currentUser = getCurrentUser();
  const CurrentPanel = useMemo(() => VIEW_COMPONENTS[selectedView], [selectedView]);

  if (!canAccessPrototype(currentUser, accessSettings, prototypeSlot)) {
    return <AccessBlocked accessSettings={accessSettings} prototypeSlot={prototypeSlot} />;
  }

  if (!hydrated) {
    return (
      <div className="pg-flex pg-min-h-screen pg-items-center pg-justify-center pg-bg-shell">
        <div className="pg-rounded-[28px] pg-border pg-border-white/10 pg-bg-white/[0.04] pg-p-8 pg-text-center pg-shadow-card">
          <div className="pg-font-display pg-text-3xl pg-font-semibold pg-text-white">공방을 가동하는 중입니다</div>
          <p className="pg-mb-0 pg-mt-3 pg-text-sm pg-leading-7 pg-text-slate-300">저장 데이터를 불러오고 장기 성장 루프를 정렬하고 있습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pg-min-h-screen pg-bg-shell pg-px-4 pg-py-4 pg-text-slate-100 sm:pg-px-5 lg:pg-px-6">
      <div className="pg-mx-auto pg-flex pg-max-w-[1680px] pg-flex-col pg-gap-4">
        <TopBar />
        <SidebarNav />
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedView}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18 }}
          >
            <CurrentPanel />
          </motion.div>
        </AnimatePresence>
      </div>
      <ToastRail />
    </div>
  );
}
