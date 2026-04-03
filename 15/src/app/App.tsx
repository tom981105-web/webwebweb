import { useEffect, useState } from 'react';
import {
  ChartNoAxesColumn,
  ClipboardList,
  Medal,
  Package,
  ShieldPlus,
  Swords,
  Users,
} from 'lucide-react';

import { CHARACTER_DEFINITION_MAP } from '@/data/characters';
import { HomeDashboard } from '@/components/HomeDashboard';
import { CharactersView } from '@/components/CharactersView';
import { TeamBuilderView } from '@/components/TeamBuilderView';
import { EquipmentView } from '@/components/EquipmentView';
import { ReportsView } from '@/components/ReportsView';
import { RankingView } from '@/components/RankingView';
import { MissionsView } from '@/components/MissionsView';
import {
  buildCollectionProgress,
  buildInventoryView,
  buildMissionGroups,
  buildRanking,
  buildRecommendedGrowthTargets,
  buildRecentPveRuns,
  buildRosterView,
  buildTodaySummary,
  describeOfflineResult,
  getActiveTeamState,
  getClaimableDailyLogin,
  getCurrencySummary,
  getDungeonById,
  getTeamAnalysis,
} from '@/game/progression';
import { useGameStore } from '@/store/gameStore';
import type { AppTab } from '@/types/game';

type ServiceAccessMode = 'open' | 'admin' | 'maintenance';
type ServiceAccessSettings = {
  stockSim?: ServiceAccessMode;
};
type PrototypeSlotState = {
  activeKey?: string;
};

function getCurrentUser() {
  if (typeof window === 'undefined') return '';
  return String(window.localStorage.getItem('current_user') || '').trim();
}

function getAccessSnapshot() {
  if (typeof window === 'undefined') {
    return { userId: '', isAdmin: false, isRegular: false, mode: 'open' as ServiceAccessMode, activeKey: '' };
  }

  let users: Record<string, { isAdmin?: boolean; status?: string }> = {};
  let accessSettings: ServiceAccessSettings = {};
  let prototypeSlot: PrototypeSlotState = {};
  try {
    users = JSON.parse(window.localStorage.getItem('users_db') || '{}');
  } catch {}
  try {
    accessSettings = JSON.parse(window.localStorage.getItem('service_access_settings') || '{}');
  } catch {}
  try {
    prototypeSlot = JSON.parse(window.localStorage.getItem('prototype_slot_state') || '{}');
  } catch {}

  const userId = getCurrentUser();
  const matchedUserId = Object.keys(users).find((entry) => entry.toLowerCase() === userId.toLowerCase()) || '';
  const record = matchedUserId ? users[matchedUserId] : null;
  const isAdmin = Boolean(record?.isAdmin);
  const isRegular = Boolean(isAdmin || String(record?.status || '').toLowerCase() === 'regular');

  return {
    userId,
    isAdmin,
    isRegular,
    mode: accessSettings.stockSim || 'open',
    activeKey: String(prototypeSlot.activeKey || ''),
  };
}

function normalizeServiceAccessMode(value: unknown): ServiceAccessMode {
  const next = String(value || '').trim().toLowerCase();
  return next === 'admin' || next === 'maintenance' ? next : 'open';
}

function normalizeAccessSnapshot(next: Partial<ReturnType<typeof getAccessSnapshot>>) {
  return {
    userId: String(next.userId || '').trim(),
    isAdmin: Boolean(next.isAdmin),
    isRegular: Boolean(next.isRegular),
    mode: normalizeServiceAccessMode(next.mode),
    activeKey: String(next.activeKey || '').trim(),
  };
}

function AccessBlocked({ message }: { message: string }) {
  return (
    <div className="ap-blocked-shell">
      <div className="ap-blocked-card">
        <p className="ap-kicker">Prototype Access</p>
        <h1>Auto PvP</h1>
        <p>{message}</p>
        <div className="ap-inline-actions">
          <a className="ap-button ap-button-primary" href={getCurrentUser() ? '/index.html' : '/login.html'}>
            {getCurrentUser() ? '메인으로 돌아가기' : '로그인하러 가기'}
          </a>
        </div>
      </div>
    </div>
  );
}

export function App() {
  const [tab, setTab] = useState<AppTab>('home');
  const [selectedCharacterId, setSelectedCharacterId] = useState('');
  const [selectedSlotId, setSelectedSlotId] = useState<'front-1' | 'front-2' | 'front-3' | 'back-1' | 'back-2'>('front-1');
  const [accessSnapshot, setAccessSnapshot] = useState(() => getAccessSnapshot());

  const initialize = useGameStore((state) => state.initialize);
  const profile = useGameStore((state) => state.userProfile);
  const roster = useGameStore((state) => state.roster);
  const inventory = useGameStore((state) => state.inventory);
  const teamPresets = useGameStore((state) => state.teamPresets);
  const activeTeamId = useGameStore((state) => state.activeTeamId);
  const version = useGameStore((state) => state.version);
  const reports = useGameStore((state) => state.battleReports);
  const pendingRewards = useGameStore((state) => state.pendingRewards);
  const pveRuns = useGameStore((state) => state.pveRuns);
  const missionBoard = useGameStore((state) => state.missionBoard);
  const collection = useGameStore((state) => state.collection);
  const activity = useGameStore((state) => state.activity);
  const dailyLogin = useGameStore((state) => state.dailyLogin);
  const season = useGameStore((state) => state.season);
  const lastProcessedAt = useGameStore((state) => state.lastProcessedAt);
  const lastOpenedAt = useGameStore((state) => state.lastOpenedAt);
  const offlineResult = useGameStore((state) => state.offlineResult);
  const runQuickBattles = useGameStore((state) => state.runQuickBattles);
  const claimArenaRewards = useGameStore((state) => state.claimArenaRewards);
  const claimDailyAttendance = useGameStore((state) => state.claimDailyAttendance);
  const growRosterCharacter = useGameStore((state) => state.growRosterCharacter);
  const assignSlot = useGameStore((state) => state.assignSlot);
  const equipToCharacter = useGameStore((state) => state.equipToCharacter);
  const unequipFromCharacter = useGameStore((state) => state.unequipFromCharacter);
  const upgradeInventoryItem = useGameStore((state) => state.upgradeInventoryItem);
  const claimMissionItem = useGameStore((state) => state.claimMissionItem);
  const runDungeonStage = useGameStore((state) => state.runDungeonStage);

  useEffect(() => {
    const userId = getCurrentUser() || 'Demo Strategist';
    initialize(userId);
    setAccessSnapshot(getAccessSnapshot());
  }, [initialize]);

  useEffect(() => {
    let cancelled = false;

    async function refreshAccessSnapshot() {
      const localSnapshot = getAccessSnapshot();
      let nextSnapshot = localSnapshot;

      try {
        const [accessResponse, slotResponse] = await Promise.all([
          fetch(new URL('/api/access-settings', window.location.origin), { cache: 'no-store' }),
          fetch(new URL('/api/prototype-slot', window.location.origin), { cache: 'no-store' }),
        ]);

        const accessResult = await accessResponse.json().catch(() => ({}));
        const slotResult = await slotResponse.json().catch(() => ({}));

        nextSnapshot = normalizeAccessSnapshot({
          ...localSnapshot,
          mode: accessResponse.ok ? accessResult.accessSettings?.stockSim : localSnapshot.mode,
          activeKey: slotResponse.ok ? slotResult.prototypeSlot?.activeKey : localSnapshot.activeKey,
        });
      } catch (error) {
        nextSnapshot = normalizeAccessSnapshot(localSnapshot);
      }

      if (!cancelled) {
        setAccessSnapshot(nextSnapshot);
      }
    }

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

  useEffect(() => {
    if (!selectedCharacterId && roster.length > 0) {
      setSelectedCharacterId(roster[0].id);
    }
  }, [selectedCharacterId, roster]);

  const accessMessage = !accessSnapshot.userId
    ? '로그인 후에만 Auto PvP 프로토타입에 입장할 수 있습니다.'
    : accessSnapshot.activeKey !== 'autoPvp'
      ? '현재 메인 프로토타입 슬롯에 Auto PvP가 적용되어 있지 않습니다.'
      : accessSnapshot.mode === 'maintenance'
        ? 'Auto PvP는 현재 점검중입니다.'
        : accessSnapshot.mode === 'admin' && !accessSnapshot.isAdmin
          ? '현재 관리자만 Auto PvP에 입장할 수 있습니다.'
          : !accessSnapshot.isRegular
            ? '승인된 회원만 Auto PvP를 플레이할 수 있습니다.'
            : '';

  if (accessMessage) {
    return <AccessBlocked message={accessMessage} />;
  }

  const storeLike = {
    userProfile: profile,
    roster,
    inventory,
    teamPresets,
    activeTeamId,
    battleReports: reports,
    pendingRewards,
    pveRuns,
    missionBoard,
    collection,
    activity,
    dailyLogin,
    season,
    lastProcessedAt,
    lastOpenedAt,
    version,
  };

  const rosterView = buildRosterView(storeLike);
  const inventoryView = buildInventoryView(storeLike);
  const todaySummary = buildTodaySummary(storeLike);
  const missionGroups = buildMissionGroups(storeLike);
  const ranking = buildRanking(storeLike);
  const currencySummary = getCurrencySummary(storeLike);
  const growthTargets = buildRecommendedGrowthTargets(storeLike);
  const recentPveRuns = buildRecentPveRuns(storeLike);
  const collectionProgress = buildCollectionProgress(storeLike);
  const teamAnalysis = getTeamAnalysis(storeLike);
  const activeTeam = getActiveTeamState(storeLike);
  const canClaimDaily = getClaimableDailyLogin(storeLike, Date.now());
  const dungeon = getDungeonById('growth-rift');

  const tabs: Array<{ id: AppTab; label: string; icon: typeof Medal }> = [
    { id: 'home', label: '대시보드', icon: ChartNoAxesColumn },
    { id: 'characters', label: '캐릭터', icon: Users },
    { id: 'team', label: '팀 편성', icon: ShieldPlus },
    { id: 'equipment', label: '장비', icon: Package },
    { id: 'reports', label: '리포트', icon: Swords },
    { id: 'ranking', label: '랭킹', icon: Medal },
    { id: 'missions', label: '미션', icon: ClipboardList },
  ];

  const reportFeed = reports.slice(0, 4).map((report) => ({
    id: report.id,
    result: report.result,
    opponentName: report.opponent.name,
    mvpCharacterId: report.mvpCharacterId,
    defeatReason: report.defeatReason,
    keyLog: report.keyLog,
  }));
  const rosterMap = Object.fromEntries(roster.map((character) => [character.id, character]));
  const getCharacterName = (characterId: string) => {
    const character = rosterMap[characterId];
    if (!character) return characterId;
    return character.definitionId ? CHARACTER_DEFINITION_MAP[character.definitionId].name : characterId;
  };
  const standoutName = todaySummary.standoutCharacterId ? getCharacterName(todaySummary.standoutCharacterId) : '';

  return (
    <div className="ap-shell">
      <header className="ap-topbar">
        <div>
          <p className="ap-kicker">Prototype 15</p>
          <h1>Auto PvP</h1>
          <span>세팅, 조합, 수집, 성장, 장기 경쟁을 중심으로 설계된 방치형 PvP 프로토타입</span>
        </div>
        <div className="ap-profile-chip">
          <strong>{profile.displayName}</strong>
          <span>
            {profile.tier} · {profile.score.toLocaleString('ko-KR')} RP
          </span>
        </div>
      </header>

      <nav className="ap-nav">
        {tabs.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`ap-nav-button ${tab === item.id ? 'is-active' : ''}`}
              onClick={() => setTab(item.id)}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <main className="ap-main">
        {tab === 'home' ? (
          <HomeDashboard
            summary={todaySummary}
            pendingRewards={pendingRewards}
            currencies={currencySummary}
            growthTargets={growthTargets}
            standoutName={standoutName}
            offlineText={describeOfflineResult(offlineResult)}
            tier={profile.tier}
            score={profile.score}
            teamPower={teamAnalysis.power}
            synergyNotes={teamAnalysis.notes}
            onClaimRewards={claimArenaRewards}
            onClaimDaily={claimDailyAttendance}
            canClaimDaily={canClaimDaily}
            onRunQuickBattles={runQuickBattles}
            onGrowCharacter={growRosterCharacter}
            onRunPve={(stage) => runDungeonStage('growth-rift', stage)}
            getCharacterName={getCharacterName}
            recentReports={reportFeed}
          />
        ) : null}

        {tab === 'characters' ? (
          <CharactersView
            roster={rosterView}
            selectedCharacterId={selectedCharacterId}
            onSelectCharacter={setSelectedCharacterId}
            onGrowCharacter={growRosterCharacter}
            profile={profile}
          />
        ) : null}

        {tab === 'team' ? (
          <TeamBuilderView
            activeTeam={activeTeam}
            roster={rosterView}
            selectedSlotId={selectedSlotId}
            onSelectSlot={setSelectedSlotId}
            onAssignCharacter={assignSlot}
            analysis={teamAnalysis}
          />
        ) : null}

        {tab === 'equipment' ? (
          <EquipmentView
            roster={rosterView}
            inventory={inventoryView}
            selectedCharacterId={selectedCharacterId}
            onSelectCharacter={setSelectedCharacterId}
            onEquip={equipToCharacter}
            onUnequip={unequipFromCharacter}
            onUpgrade={upgradeInventoryItem}
            profile={profile}
          />
        ) : null}

        {tab === 'reports' ? <ReportsView reports={reports.slice(0, 14)} getCharacterName={getCharacterName} /> : null}

        {tab === 'ranking' ? <RankingView entries={ranking} teamAnalysis={teamAnalysis} season={season} /> : null}

        {tab === 'missions' ? (
          <MissionsView
            missionGroups={missionGroups}
            pendingRewards={pendingRewards}
            canClaimDaily={canClaimDaily}
            onClaimDaily={claimDailyAttendance}
            onClaimMission={claimMissionItem}
            recentPveRuns={recentPveRuns}
            collectionProgress={collectionProgress}
            onRunPve={(stage) => runDungeonStage(dungeon?.id || 'growth-rift', stage)}
          />
        ) : null}
      </main>
    </div>
  );
}
