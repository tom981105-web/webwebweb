import { ITEM_DEFINITIONS } from '@/data';
import { PanelCard } from '@/components/ui/PanelCard';
import { useGameStore } from '@/store/useGameStore';

export function ShopPanel() {
  const buyShopItem = useGameStore((state) => state.buyShopItem);
  const items = useGameStore((state) => state.items);

  return (
    <PanelCard title="상점" subtitle="Shop">
      <div className="pg-grid pg-gap-3 md:pg-grid-cols-2 xl:pg-grid-cols-4">
        {ITEM_DEFINITIONS.map((item) => (
          <button key={item.id} type="button" onClick={() => buyShopItem(item.id)} className="pg-rounded-2xl pg-border pg-border-white/10 pg-bg-white/[0.04] pg-p-4 pg-text-left">
            <div className="pg-flex pg-items-center pg-justify-between">
              <div className="pg-text-sm pg-font-semibold pg-text-white">{item.label}</div>
              <div className="pg-text-xs pg-text-slate-400">보유 {items[item.id]}</div>
            </div>
            <div className="pg-mt-2 pg-text-sm pg-leading-6 pg-text-slate-300">{item.description}</div>
          </button>
        ))}
      </div>
    </PanelCard>
  );
}
