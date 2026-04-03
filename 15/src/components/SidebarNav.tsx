import { AnimatePresence, motion } from 'framer-motion';
import { BarChart3, Backpack, FlaskConical, Hammer, Library, Map, Settings2, ShieldPlus, ShoppingBag, Sparkles, Wrench } from 'lucide-react';

import type { NavView } from '@/types/game';
import { useGameStore } from '@/store/useGameStore';

const NAV_ITEMS: Array<{ id: NavView; label: string; icon: typeof Sparkles }> = [
  { id: 'dashboard', label: '대시보드', icon: BarChart3 },
  { id: 'equipment', label: '장비 관리', icon: Backpack },
  { id: 'enhancement', label: '강화 패널', icon: ShieldPlus },
  { id: 'research', label: '연구실', icon: FlaskConical },
  { id: 'crafting', label: '제작/분해실', icon: Hammer },
  { id: 'expeditions', label: '원정 지도', icon: Map },
  { id: 'workshop', label: '공방 시설', icon: Wrench },
  { id: 'collection', label: '도감/업적', icon: Library },
  { id: 'shop', label: '상점', icon: ShoppingBag },
  { id: 'records', label: '기록실', icon: Sparkles },
  { id: 'settings', label: '설정', icon: Settings2 },
];

export function SidebarNav() {
  const selectedView = useGameStore((state) => state.selectedView);
  const changeView = useGameStore((state) => state.changeView);

  return (
    <nav className="pg-rounded-[28px] pg-border pg-border-white/10 pg-bg-white/[0.04] pg-p-3">
      <div className="pg-flex pg-gap-2 pg-overflow-x-auto lg:pg-grid lg:pg-gap-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = selectedView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => changeView(item.id)}
              className={`pg-relative pg-flex pg-min-w-[128px] pg-items-center pg-gap-3 pg-rounded-2xl pg-border pg-px-4 pg-py-3 pg-text-left ${
                active ? 'pg-border-sky-300/30 pg-bg-sky-300/10 pg-text-white' : 'pg-border-white/8 pg-bg-transparent pg-text-slate-300'
              }`}
            >
              <Icon size={16} />
              <span className="pg-text-sm pg-font-medium">{item.label}</span>
              <AnimatePresence>
                {active ? (
                  <motion.span
                    layoutId="nav-active-pill"
                    className="pg-absolute pg-inset-0 pg-rounded-2xl pg-border pg-border-sky-300/25"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                ) : null}
              </AnimatePresence>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
