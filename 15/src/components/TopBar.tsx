import { useGameStore } from '@/store/gameStore';
import { formatNumber } from '@/utils/format';

export function TopBar() {
  const account = useGameStore((state) => state.userProfile);
  const compact = useGameStore((state) => state.settings.compactNumbers);

  return (
    <header className="ap-topbar">
      <div>
        <p className="ap-kicker">Auto PvP Prototype</p>
        <h1>Auto PvP</h1>
        <p className="ap-card-subtitle">
          팀 편성, 성장 루프, 자동 전투 리포트를 한 화면에서 정리해 보는 전략형 전투 프로토타입입니다.
        </p>
      </div>
      <div className="ap-profile-chip">
        <strong>{account.name}</strong>
        <p className="ap-card-subtitle">레벨 {account.level} · 자동 전투 운영중</p>
        <div className="ap-inline-line">
          <span>골드 {formatNumber(account.currencies.gold, compact)}</span>
          <span>성장 재료 {formatNumber(account.currencies.growth, compact)}</span>
        </div>
      </div>
    </header>
  );
}
