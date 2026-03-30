import { memo, useCallback, useMemo, useState, type CSSProperties } from 'react';
import { Cpu, LoaderCircle, TriangleAlert } from 'lucide-react';
import { AdminControlsPanel } from '@/features/stock-sim/components/AdminControlsPanel';
import { LeaderboardPanel } from '@/features/stock-sim/components/LeaderboardPanel';
import { MarketPulsePanel } from '@/features/stock-sim/components/MarketPulsePanel';
import { NewsPanel } from '@/features/stock-sim/components/NewsPanel';
import { Panel } from '@/features/stock-sim/components/Panel';
import { PortfolioPanel } from '@/features/stock-sim/components/PortfolioPanel';
import { StockDetailPanel } from '@/features/stock-sim/components/StockDetailPanel';
import { StockListPanel } from '@/features/stock-sim/components/StockListPanel';
import { ToastStack } from '@/features/stock-sim/components/ToastStack';
import { TopBar } from '@/features/stock-sim/components/TopBar';
import { TradeLogPanel } from '@/features/stock-sim/components/TradeLogPanel';
import { useMarketWorker } from '@/features/stock-sim/hooks/useMarketWorker';
import { useSimulationUiStore } from '@/features/stock-sim/store/simulationUiStore';
import {
  formatSeoulMarketClock,
  getMarketMoodLabel,
  getMarketRegimeDescription,
  getMarketRegimeLabel,
} from '@/features/stock-sim/utils/formatters';

export type StockSimulationFeatureProps = {
  className?: string;
  shellMode?: 'standalone' | 'embedded';
  preferredHeight?: number | string;
  showAmbientBackground?: boolean;
  showAdminPanel?: boolean;
};

type WorkerCommands = ReturnType<typeof useMarketWorker>;

function resolveAdminPanelVisibility(explicit?: boolean) {
  const currentUser =
    typeof window !== 'undefined'
      ? String(window.localStorage.getItem('current_user') || '').trim().toLowerCase()
      : '';
  const isAdmin = currentUser === 'admin';

  if (!isAdmin) {
    return false;
  }

  if (explicit !== undefined) {
    return explicit;
  }

  if (typeof window === 'undefined') {
    return false;
  }

  const query = new URLSearchParams(window.location.search);
  if (query.get('admin') === '1') {
    return true;
  }

  try {
    return window.localStorage.getItem('stock-sim.admin-panel') === '1';
  } catch {
    return false;
  }
}

const ConnectedTopBar = memo(function ConnectedTopBar() {
  const snapshot = useSimulationUiStore((state) => state.snapshot);
  const runtime = useSimulationUiStore((state) => state.runtime);

  if (!snapshot) {
    return null;
  }

  return (
    <TopBar
      cash={snapshot.player.cash}
      totalAssets={snapshot.portfolioSummary.totalAssets}
      unrealizedPnL={snapshot.portfolioSummary.unrealizedPnL}
      returnRate={snapshot.portfolioSummary.returnRate}
      isRunning={snapshot.isRunning}
      speed={snapshot.speed}
      tick={snapshot.tick}
      marketMoodLabel={getMarketMoodLabel(snapshot.marketMood)}
      marketRegimeLabel={getMarketRegimeLabel(snapshot.world.regime)}
      marketRegimeDescription={getMarketRegimeDescription(snapshot.world.regime)}
      marketClock={formatSeoulMarketClock(snapshot.world.lastTickAt)}
      dominantSector={snapshot.world.dominantSector}
      aiFocusSector={snapshot.world.aiFocusSector}
      runtime={runtime}
    />
  );
});

const ConnectedAdminControls = memo(function ConnectedAdminControls({
  commands,
}: {
  commands: WorkerCommands;
}) {
  const snapshot = useSimulationUiStore((state) => state.snapshot);
  const runtime = useSimulationUiStore((state) => state.runtime);

  if (!snapshot) {
    return null;
  }

  return (
    <AdminControlsPanel
      isRunning={snapshot.isRunning}
      speed={snapshot.speed}
      tick={snapshot.tick}
      marketMoodLabel={getMarketMoodLabel(snapshot.marketMood)}
      dominantSector={snapshot.world.dominantSector}
      runtime={runtime}
      onToggleRunning={commands.toggleRunning}
      onSpeedChange={commands.setSpeed}
      onReset={commands.resetSimulation}
    />
  );
});

const ConnectedStockList = memo(function ConnectedStockList({
  commands,
  isCollapsed,
  onToggleCollapsed,
}: {
  commands: WorkerCommands;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const snapshot = useSimulationUiStore((state) => state.snapshot);
  const ui = useSimulationUiStore((state) => state.ui);
  const setSearchQuery = useSimulationUiStore((state) => state.actions.setSearchQuery);
  const setSectorFilter = useSimulationUiStore((state) => state.actions.setSectorFilter);
  const setStockSort = useSimulationUiStore((state) => state.actions.setStockSort);

  if (!snapshot) {
    return null;
  }

  return (
    <StockListPanel
      stocks={snapshot.stocks}
      selectedStockId={snapshot.selectedStockId}
      searchQuery={ui.searchQuery}
      sectorFilter={ui.sectorFilter}
      sortMode={ui.stockSort}
      isCollapsed={isCollapsed}
      onSelectStock={commands.selectStock}
      onSearchQueryChange={setSearchQuery}
      onSectorFilterChange={setSectorFilter}
      onSortModeChange={setStockSort}
      onToggleCollapsed={onToggleCollapsed}
    />
  );
});

const ConnectedStockDetail = memo(function ConnectedStockDetail({
  commands,
}: {
  commands: WorkerCommands;
}) {
  const snapshot = useSimulationUiStore((state) => state.snapshot);
  const chartTimeframe = useSimulationUiStore((state) => state.ui.chartTimeframe);
  const setChartTimeframe = useSimulationUiStore((state) => state.actions.setChartTimeframe);

  if (!snapshot?.selectedStock) {
    return null;
  }

  return (
    <StockDetailPanel
      stock={snapshot.selectedStock}
      player={snapshot.player}
      pendingOrders={snapshot.pendingOrders}
      relevantEvents={snapshot.selectedStockEvents}
      aiActivity={snapshot.aiActivity}
      chartTimeframe={chartTimeframe}
      onChartTimeframeChange={setChartTimeframe}
      onPlaceOrder={commands.placeOrder}
      onPlacePendingOrder={commands.placePendingOrder}
      onCancelPendingOrder={commands.cancelPendingOrder}
    />
  );
});

const ConnectedMarketPulse = memo(function ConnectedMarketPulse({
  isCollapsed,
  onToggleCollapsed,
}: {
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const snapshot = useSimulationUiStore((state) => state.snapshot);

  if (!snapshot) {
    return null;
  }

  return (
    <MarketPulsePanel
      world={snapshot.world}
      marketMood={snapshot.marketMood}
      sectorMood={snapshot.sectorMood}
      hotStocks={snapshot.hotStocks}
      volatilityLeaders={snapshot.volatilityLeaders}
      isCollapsed={isCollapsed}
      onToggleCollapsed={onToggleCollapsed}
    />
  );
});

const ConnectedNews = memo(function ConnectedNews({
  isCollapsed,
  onToggleCollapsed,
}: {
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const events = useSimulationUiStore((state) => state.snapshot?.events ?? []);
  return (
    <NewsPanel
      events={events}
      isCollapsed={isCollapsed}
      onToggleCollapsed={onToggleCollapsed}
    />
  );
});

const ConnectedLeaderboard = memo(function ConnectedLeaderboard() {
  const fallbackEntries = useSimulationUiStore((state) => state.snapshot?.leaderboard ?? []);
  const remoteEntries = useSimulationUiStore((state) => state.remoteLeaderboard);
  const sortMode = useSimulationUiStore((state) => state.ui.leaderboardSort);
  const onSortChange = useSimulationUiStore((state) => state.actions.setLeaderboardSort);
  const entries = remoteEntries.length > 0 ? remoteEntries : fallbackEntries;

  return (
    <LeaderboardPanel
      entries={entries}
      sortMode={sortMode}
      onSortChange={onSortChange}
      isRemote={remoteEntries.length > 0}
    />
  );
});

const ConnectedPortfolio = memo(function ConnectedPortfolio({
  commands,
}: {
  commands: WorkerCommands;
}) {
  const snapshot = useSimulationUiStore((state) => state.snapshot);

  if (!snapshot) {
    return null;
  }

  return (
    <PortfolioPanel
      player={snapshot.player}
      stocks={snapshot.stocks}
      totalAssets={snapshot.portfolioSummary.totalAssets}
      unrealizedPnL={snapshot.portfolioSummary.unrealizedPnL}
      investedCapital={snapshot.portfolioSummary.investedCapital}
      onSelectStock={commands.selectStock}
    />
  );
});

const ConnectedTradeLog = memo(function ConnectedTradeLog({
  isCollapsed,
  onToggleCollapsed,
}: {
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const snapshot = useSimulationUiStore((state) => state.snapshot);
  const filteredTrades = useMemo(
    () =>
      snapshot
        ? snapshot.trades
            .filter((trade) => trade.stockId === snapshot.selectedStockId)
            .slice(0, 40)
        : [],
    [snapshot],
  );

  if (!snapshot) {
    return null;
  }

  return (
    <TradeLogPanel
      trades={filteredTrades}
      stocks={snapshot.stocks}
      selectedStock={snapshot.selectedStock}
      isCollapsed={isCollapsed}
      onToggleCollapsed={onToggleCollapsed}
    />
  );
});

const ConnectedToasts = memo(function ConnectedToasts() {
  const toasts = useSimulationUiStore((state) => state.toasts);
  const dismissToast = useSimulationUiStore((state) => state.actions.dismissToast);

  return <ToastStack toasts={toasts} onDismiss={dismissToast} />;
});

function WorkerStatusPanel() {
  const runtime = useSimulationUiStore((state) => state.runtime);

  return (
    <Panel
      title="시장 엔진 연결 상태"
      subtitle="실시간 계산은 Web Worker에서 처리하고, 화면은 필요한 스냅샷만 받아 안정적으로 렌더링합니다."
      icon={
        runtime.workerStatus === 'error' ? (
          <TriangleAlert className="ss-h-5 ss-w-5" />
        ) : runtime.workerStatus === 'ready' ? (
          <Cpu className="ss-h-5 ss-w-5" />
        ) : (
          <LoaderCircle className="ss-h-5 ss-w-5 ss-animate-spin" />
        )
      }
      className="ss-h-full"
      tone={runtime.workerStatus === 'error' ? 'accent' : 'feature'}
    >
      <div className="ss-space-y-4">
        <div className="ss-ui-soft-card-strong ss-rounded-[24px] ss-p-5">
          <div className="ss-flex ss-items-center ss-gap-3">
            {runtime.workerStatus === 'error' ? (
              <TriangleAlert className="ss-h-5 ss-w-5 ss-text-rose-200" />
            ) : (
              <LoaderCircle
                className={`ss-h-5 ss-w-5 ${
                  runtime.workerStatus === 'ready'
                    ? 'ss-text-cyan-100'
                    : 'ss-animate-spin ss-text-cyan-100'
                }`}
              />
            )}
            <div>
              <p className="ss-text-base ss-font-semibold ss-text-white">
                {runtime.workerStatus === 'error'
                  ? '엔진 연결 실패'
                  : runtime.workerStatus === 'ready'
                    ? '엔진 연결 완료'
                    : '엔진 준비 중'}
              </p>
              <p className="ss-mt-1 ss-text-sm ss-leading-6 ss-text-slate-300/78">
                {runtime.workerStatus === 'error'
                  ? runtime.workerError ?? '시장 엔진을 초기화하지 못했습니다.'
                  : '가격 계산, AI 판단, 이벤트 생성은 메인 UI 바깥에서 계속 동작하고 있습니다.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}

export function StockSimulationFeature({
  className = '',
  shellMode = 'standalone',
  preferredHeight,
  showAmbientBackground = true,
  showAdminPanel,
}: StockSimulationFeatureProps) {
  const commands = useMarketWorker();
  const snapshot = useSimulationUiStore((state) => state.snapshot);
  const runtime = useSimulationUiStore((state) => state.runtime);
  const shouldShowAdminPanel = resolveAdminPanelVisibility(showAdminPanel);
  const [isMarketPulseCollapsed, setIsMarketPulseCollapsed] = useState(false);
  const [isStockBoardCollapsed, setIsStockBoardCollapsed] = useState(false);
  const [isNewsCollapsed, setIsNewsCollapsed] = useState(false);
  const [isTradeLogCollapsed, setIsTradeLogCollapsed] = useState(false);

  const handleToggleMarketPulse = useCallback(() => {
    setIsMarketPulseCollapsed((current) => !current);
  }, []);

  const handleToggleStockBoard = useCallback(() => {
    setIsStockBoardCollapsed((current) => !current);
  }, []);

  const handleToggleNews = useCallback(() => {
    setIsNewsCollapsed((current) => !current);
  }, []);

  const handleToggleTradeLog = useCallback(() => {
    setIsTradeLogCollapsed((current) => !current);
  }, []);

  const shellStyle: CSSProperties | undefined =
    preferredHeight !== undefined
      ? {
          height: typeof preferredHeight === 'number' ? `${preferredHeight}px` : preferredHeight,
        }
      : shellMode === 'standalone'
        ? undefined
        : {
            height: '100%',
          };

  return (
    <div
      data-shell-mode={shellMode}
      className={`stock-sim-shell ss-relative ss-flex ss-min-h-0 ss-min-w-0 ss-flex-col ${
        shellMode === 'standalone'
          ? 'ss-min-h-dvh ss-overflow-x-hidden ss-overflow-y-auto'
          : 'ss-h-full ss-overflow-hidden'
      } ${className}`}
      style={shellStyle}
    >
      {showAmbientBackground ? (
        <>
          <div className="ss-pointer-events-none ss-absolute ss-inset-0 ss-bg-[radial-gradient(circle_at_top,rgba(62,101,173,0.22),transparent_42%),linear-gradient(180deg,#030813_0%,#08111f_42%,#050b14_100%)]" />
          <div className="ss-pointer-events-none ss-absolute ss-inset-0 ss-bg-stock-grid ss-bg-[length:44px_44px] ss-opacity-[0.08]" />
          <div className="ss-pointer-events-none ss-absolute ss-inset-x-0 ss-top-0 ss-h-36 ss-bg-[radial-gradient(circle_at_top_left,rgba(86,212,255,0.2),transparent_32%)]" />
          <div className="ss-pointer-events-none ss-absolute ss-right-0 ss-top-20 ss-h-72 ss-w-72 ss-rounded-full ss-bg-[radial-gradient(circle,rgba(156,255,123,0.1),transparent_62%)] ss-blur-3xl" />
        </>
      ) : null}

      <div
        data-scrollable="true"
        className={`ss-relative ss-mx-auto ss-flex ss-w-full ss-max-w-[1760px] ss-flex-1 ss-min-h-0 ss-min-w-0 ss-flex-col ss-gap-3 ss-px-3 ss-py-3 md:ss-px-5 md:ss-py-4 lg:ss-gap-4 lg:ss-px-6 lg:ss-py-5 ${
          shellMode === 'standalone' ? 'ss-overflow-visible' : 'ss-overflow-y-auto'
        }`}
      >
        {snapshot ? <ConnectedTopBar /> : <WorkerStatusPanel />}

        {snapshot ? (
          <>
            <div className={`${isMarketPulseCollapsed ? 'ss-min-h-0' : 'ss-min-h-[250px]'} ss-min-w-0`}>
              <ConnectedMarketPulse
                isCollapsed={isMarketPulseCollapsed}
                onToggleCollapsed={handleToggleMarketPulse}
              />
            </div>

            <div className={`${isStockBoardCollapsed ? 'ss-min-h-0' : 'ss-min-h-[420px]'} ss-min-w-0`}>
              <ConnectedStockList
                commands={commands}
                isCollapsed={isStockBoardCollapsed}
                onToggleCollapsed={handleToggleStockBoard}
              />
            </div>

            <div className="ss-grid ss-min-w-0 ss-gap-3 xl:ss-grid-cols-[minmax(0,1fr)_350px]">
              <div className="ss-flex ss-min-h-0 ss-min-w-0 ss-flex-col ss-gap-3">
                <div className="ss-min-h-[780px] ss-min-w-0">
                  <ConnectedStockDetail commands={commands} />
                </div>
              </div>

              <div className="ss-flex ss-min-h-0 ss-min-w-0 ss-flex-col ss-gap-3">
                <div className="ss-min-h-[220px]">
                  <ConnectedLeaderboard />
                </div>
              </div>
            </div>

            <div className={`${isNewsCollapsed ? 'ss-min-h-0' : 'ss-min-h-[300px]'} ss-min-w-0`}>
              <ConnectedNews
                isCollapsed={isNewsCollapsed}
                onToggleCollapsed={handleToggleNews}
              />
            </div>

            <div className="ss-grid ss-min-w-0 ss-gap-3 lg:ss-grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="ss-min-h-[320px] ss-min-w-0">
                <ConnectedPortfolio commands={commands} />
              </div>
              <div className={`${isTradeLogCollapsed ? 'ss-min-h-0' : 'ss-min-h-[320px]'} ss-min-w-0`}>
                <ConnectedTradeLog
                  isCollapsed={isTradeLogCollapsed}
                  onToggleCollapsed={handleToggleTradeLog}
                />
              </div>
            </div>

            {shouldShowAdminPanel ? <ConnectedAdminControls commands={commands} /> : null}
          </>
        ) : (
          <div className="ss-grid ss-gap-4 lg:ss-grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
            <WorkerStatusPanel />
            {runtime.workerStatus === 'error' ? (
              <Panel
                title="복구 안내"
                subtitle="화면은 계속 열려 있습니다. 모듈을 다시 붙이거나 시장을 초기화하면 빠르게 복구할 수 있습니다."
                icon={<TriangleAlert className="ss-h-5 ss-w-5" />}
                tone="accent"
              >
                <div className="ss-ui-soft-card-strong ss-rounded-[24px] ss-p-5 ss-text-sm ss-leading-7 ss-text-slate-300/82">
                  {runtime.workerError ?? '알 수 없는 워커 오류가 발생했습니다.'}
                </div>
              </Panel>
            ) : null}
          </div>
        )}
      </div>

      <ConnectedToasts />
    </div>
  );
}
