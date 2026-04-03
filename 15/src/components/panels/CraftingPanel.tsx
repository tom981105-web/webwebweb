import { RECIPE_DEFINITIONS } from '@/data';
import { PanelCard } from '@/components/ui/PanelCard';
import { useGameStore } from '@/store/useGameStore';

export function CraftingPanel() {
  const craftRecipe = useGameStore((state) => state.craftRecipe);
  const materials = useGameStore((state) => state.materials);
  const currencies = useGameStore((state) => state.currencies);

  return (
    <PanelCard title="제작 / 분해실" subtitle="Craft / Salvage">
      <div className="pg-grid pg-gap-3 xl:pg-grid-cols-2">
        {RECIPE_DEFINITIONS.map((recipe) => (
          <button key={recipe.id} type="button" onClick={() => craftRecipe(recipe.id)} className="pg-rounded-2xl pg-border pg-border-white/10 pg-bg-white/[0.04] pg-p-4 pg-text-left">
            <div className="pg-flex pg-items-center pg-justify-between">
              <div className="pg-text-sm pg-font-semibold pg-text-white">{recipe.label}</div>
              <span className="pg-text-[11px] pg-uppercase pg-tracking-[0.2em] pg-text-slate-500">{recipe.category}</span>
            </div>
            <div className="pg-mt-2 pg-text-sm pg-leading-6 pg-text-slate-300">{recipe.description}</div>
            <div className="pg-mt-3 pg-text-xs pg-text-slate-500">
              소모 골드 {recipe.costResources.gold ?? 0} · 합금 {recipe.costResources.alloyScrap ?? 0} · 데이터 {recipe.costResources.dataShards ?? 0}
            </div>
          </button>
        ))}
      </div>
      <div className="pg-grid pg-gap-3 md:pg-grid-cols-2">
        <div className="pg-rounded-2xl pg-border pg-border-white/10 pg-bg-white/[0.03] pg-p-4">
          <div className="pg-text-sm pg-font-medium pg-text-white">핵심 재료 보유량</div>
          <div className="pg-mt-3 pg-grid pg-grid-cols-2 pg-gap-2 pg-text-sm pg-text-slate-300">
            {Object.entries(materials).map(([key, value]) => (
              <div key={key}>{key}: {value}</div>
            ))}
          </div>
        </div>
        <div className="pg-rounded-2xl pg-border pg-border-white/10 pg-bg-white/[0.03] pg-p-4">
          <div className="pg-text-sm pg-font-medium pg-text-white">경제 현황</div>
          <div className="pg-mt-3 pg-grid pg-grid-cols-2 pg-gap-2 pg-text-sm pg-text-slate-300">
            {Object.entries(currencies).map(([key, value]) => (
              <div key={key}>{key}: {value}</div>
            ))}
          </div>
        </div>
      </div>
    </PanelCard>
  );
}
