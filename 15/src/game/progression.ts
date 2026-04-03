import {
  BATTLE_INTERVAL_MS,
  DAILY_LOGIN_REWARD_GOLD,
  DAILY_LOGIN_REWARD_GROWTH,
  MAX_BATTLE_REPORTS,
  OFFLINE_CAP_MS,
} from '@/config/gameConfig';
import { CHARACTER_DEFINITIONS } from '@/data/characters';
import { ACHIEVEMENTS, CURRENT_SEASON, DAILY_MISSIONS, PVE_DUNGEONS, RIVAL_PROFILES, WEEKLY_MISSIONS } from '@/data/content';
import { EQUIPMENT_DEFINITION_MAP } from '@/data/equipment';
import { createInitialSaveState } from '@/data/seedState';
import { analyzeTeam, buildRivalBattleSeed, buildUserBattleSeed, simulateBattle } from '@/game/battleEngine';
import type {
  Achievement,
  AutoPvpSaveState,
  BattleSummary,
  Mission,
  MissionStatus,
  OfflineProgressResult,
  RankingEntry,
  Reward,
  RivalProfile,
  TeamPreset,
  TodaySummary,
  UserCharacter,
} from '@/types/game';
import { formatDuration, formatNumber, getDayKey, getTierFromScore, getWeekKey } from '@/utils/format';

function makeId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function cloneState(state: AutoPvpSaveState) {
  return structuredClone(state);
}

export function loadGameSave(storageKey: string) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    return JSON.parse(raw) as AutoPvpSaveState;
  } catch {
    return null;
  }
}

export function saveGameSave(storageKey: string, state: AutoPvpSaveState) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKey, JSON.stringify(state));
}

function ensurePeriods(state: AutoPvpSaveState, now: number) {
  const dailyKey = getDayKey(now);
  const weeklyKey = getWeekKey(now);
  if (state.activity.dailyKey !== dailyKey) {
    state.activity.dailyKey = dailyKey;
    state.activity.dailyBattles = 0;
    state.activity.dailyWins = 0;
    state.activity.dailyPveClears = 0;
    state.activity.dailyGrowths = 0;
    state.activity.dailyEquipmentUpgrades = 0;
    state.activity.dailyRewardsClaimed = 0;
    state.missionBoard.dailyClaimedIds = [];
  }
  if (state.activity.weeklyKey !== weeklyKey) {
    state.activity.weeklyKey = weeklyKey;
    state.activity.weeklyBattles = 0;
    state.activity.weeklyWins = 0;
    state.activity.weeklyPveClears = 0;
    state.activity.weeklyGrowths = 0;
    state.missionBoard.weeklyClaimedIds = [];
  }
}

function getActiveTeam(state: AutoPvpSaveState) {
  return state.teamPresets.find((team) => team.id === state.activeTeamId) || state.teamPresets[0];
}

function getRosterMap(state: AutoPvpSaveState) {
  return Object.fromEntries(state.roster.map((character) => [character.id, character]));
}

function getInventoryMap(state: AutoPvpSaveState) {
  return Object.fromEntries(state.inventory.map((item) => [item.id, item]));
}

function pickRivalForScore(score: number, index: number) {
  const sorted = [...RIVAL_PROFILES].sort(
    (left, right) => Math.abs(left.score - score) - Math.abs(right.score - score) || left.score - right.score,
  );
  return sorted[Math.min(sorted.length - 1, index % Math.min(sorted.length, 3))];
}

function createArenaRewards(result: BattleSummary['result'], rival: RivalProfile) {
  const goldBase = result === 'win' ? 180 : 96;
  const growthBase = result === 'win' ? 24 : 12;
  const gearCoreBase = result === 'win' ? 14 : 8;
  const tokenBase = result === 'win' ? 8 : 4;
  const rewards: Reward[] = [
    { id: makeId('reward-gold'), type: 'gold', amount: goldBase + Math.round(rival.score / 28), label: `골드 +${goldBase + Math.round(rival.score / 28)}` },
    { id: makeId('reward-growth'), type: 'growth', amount: growthBase + Math.round(rival.score / 120), label: `성장 재료 +${growthBase + Math.round(rival.score / 120)}` },
    { id: makeId('reward-core'), type: 'gearCore', amount: gearCoreBase + Math.round(rival.score / 180), label: `강화 코어 +${gearCoreBase + Math.round(rival.score / 180)}` },
    { id: makeId('reward-token'), type: 'arenaToken', amount: tokenBase, label: `아레나 토큰 +${tokenBase}` },
  ];
  if (result === 'win' && Math.random() < 0.28) {
    const equipmentPool = ['fortress-mail', 'chrono-brooch', 'emberfang-blade', 'medic-habit', 'veil-sigil'];
    const equipmentDefinitionId = equipmentPool[Math.floor(Math.random() * equipmentPool.length)];
    rewards.push({
      id: makeId('reward-eq'),
      type: 'equipment',
      equipmentDefinitionId,
      rarity: EQUIPMENT_DEFINITION_MAP[equipmentDefinitionId].rarity,
      label: `${EQUIPMENT_DEFINITION_MAP[equipmentDefinitionId].name} 획득`,
    });
  }
  return rewards;
}

function appendReports(state: AutoPvpSaveState, reports: BattleSummary[]) {
  state.battleReports = [...reports, ...state.battleReports].slice(0, MAX_BATTLE_REPORTS);
}

function applyBattleOutcomeToState(state: AutoPvpSaveState, summary: BattleSummary) {
  const rosterMap = getRosterMap(state);
  const resultDelta = summary.result === 'win' ? 14 + Math.round((summary.opponent.score - state.userProfile.score) / 90) : -10;
  const safeDelta = Math.max(summary.result === 'win' ? 8 : -18, Math.min(summary.result === 'win' ? 24 : -6, resultDelta));
  summary.tierDelta = safeDelta;

  state.userProfile.score = Math.max(820, state.userProfile.score + safeDelta);
  state.userProfile.tier = getTierFromScore(state.userProfile.score);
  state.userProfile.bestScore = Math.max(state.userProfile.bestScore, state.userProfile.score);
  state.pendingRewards.push(...summary.rewards);
  state.activity.dailyBattles += 1;
  state.activity.weeklyBattles += 1;
  state.activity.totalBattles += 1;

  if (summary.result === 'win') {
    state.activity.dailyWins += 1;
    state.activity.weeklyWins += 1;
    state.activity.totalWins += 1;
  } else {
    state.activity.totalLosses += 1;
  }

  const mvp = rosterMap[summary.mvpCharacterId];
  if (mvp) {
    mvp.battles += 1;
    if (summary.result === 'win') mvp.wins += 1;
  }

  getActiveTeam(state).slots
    .map((slot) => (slot.characterId ? rosterMap[slot.characterId] : null))
    .filter(Boolean)
    .forEach((character) => {
      const target = character as UserCharacter;
      target.battles += 1;
      if (summary.result === 'win') target.wins += 1;
    });
}

function resolveRewardClaim(state: AutoPvpSaveState, reward: Reward) {
  switch (reward.type) {
    case 'gold':
      state.userProfile.currencies.gold += Number(reward.amount || 0);
      return;
    case 'growth':
      state.userProfile.currencies.growth += Number(reward.amount || 0);
      return;
    case 'gearCore':
      state.userProfile.currencies.gearCore += Number(reward.amount || 0);
      return;
    case 'arenaToken':
      state.userProfile.currencies.arenaToken += Number(reward.amount || 0);
      return;
    case 'gem':
      state.userProfile.currencies.gem += Number(reward.amount || 0);
      return;
    case 'equipment':
      if (!reward.equipmentDefinitionId) return;
      state.inventory.unshift({
        id: makeId('user-eq'),
        definitionId: reward.equipmentDefinitionId,
        level: 1,
        locked: false,
      });
      if (!state.collection.discoveredEquipmentDefinitionIds.includes(reward.equipmentDefinitionId)) {
        state.collection.discoveredEquipmentDefinitionIds.push(reward.equipmentDefinitionId);
      }
      return;
  }
}

export function initializeState(userId: string, existingState: AutoPvpSaveState | null, now: number) {
  const base = existingState ? cloneState(existingState) : createInitialSaveState(userId);
  base.season = CURRENT_SEASON;
  ensurePeriods(base, now);

  const elapsed = now - base.lastProcessedAt;
  const capped = Math.max(0, Math.min(elapsed, OFFLINE_CAP_MS));
  const battleCount = Math.floor(capped / BATTLE_INTERVAL_MS);
  const reports: BattleSummary[] = [];

  if (battleCount > 0) {
    const activeTeam = getActiveTeam(base);
    for (let index = 0; index < battleCount; index += 1) {
      const rival = pickRivalForScore(base.userProfile.score, index);
      const assumedWin = Math.random() < 0.58;
      const rewards = createArenaRewards(assumedWin ? 'win' : 'loss', rival);
      const allySeed = buildUserBattleSeed(
        base.roster,
        base.inventory,
        activeTeam,
        base.userProfile.displayName,
        base.userProfile.score,
        base.userProfile.tier,
      );
      const enemySeed = buildRivalBattleSeed(rival);
      const summary = simulateBattle(
        allySeed,
        enemySeed,
        'pvp',
        rewards,
        makeId('battle'),
        now - capped + index * BATTLE_INTERVAL_MS,
      );
      applyBattleOutcomeToState(base, summary);
      reports.push(summary);
    }
    appendReports(base, reports);
  }

  base.lastProcessedAt = now;
  base.lastOpenedAt = now;
  return {
    state: base,
    offlineResult: {
      simulatedBattles: battleCount,
      cappedDurationMs: capped,
      reports,
    } satisfies OfflineProgressResult,
  };
}

export function runArenaBurst(state: AutoPvpSaveState, count: number, now: number) {
  const next = cloneState(state);
  ensurePeriods(next, now);
  const activeTeam = getActiveTeam(next);
  const reports: BattleSummary[] = [];

  for (let index = 0; index < count; index += 1) {
    const rival = pickRivalForScore(next.userProfile.score, index);
    const rewards = createArenaRewards('win', rival);
    const allySeed = buildUserBattleSeed(
      next.roster,
      next.inventory,
      activeTeam,
      next.userProfile.displayName,
      next.userProfile.score,
      next.userProfile.tier,
    );
    const enemySeed = buildRivalBattleSeed(rival);
    const summary = simulateBattle(allySeed, enemySeed, 'pvp', rewards, makeId('battle'), now + index * 1000);
    applyBattleOutcomeToState(next, summary);
    reports.push(summary);
  }

  appendReports(next, reports);
  next.lastProcessedAt = now;
  next.lastOpenedAt = now;
  return next;
}

export function claimPendingRewards(state: AutoPvpSaveState, now: number) {
  const next = cloneState(state);
  ensurePeriods(next, now);
  next.pendingRewards.forEach((reward) => resolveRewardClaim(next, reward));
  if (next.pendingRewards.length > 0) {
    next.activity.dailyRewardsClaimed += 1;
  }
  next.pendingRewards = [];
  next.lastOpenedAt = now;
  return next;
}

export function claimDailyLogin(state: AutoPvpSaveState, now: number) {
  const next = cloneState(state);
  ensurePeriods(next, now);
  const dayKey = getDayKey(now);
  if (next.dailyLogin.lastClaimedDay === dayKey) return next;

  next.dailyLogin.lastClaimedDay = dayKey;
  next.dailyLogin.streak += 1;
  next.activity.dailyRewardsClaimed += 1;
  resolveRewardClaim(next, { id: makeId('daily-gold'), type: 'gold', amount: DAILY_LOGIN_REWARD_GOLD, label: `골드 +${DAILY_LOGIN_REWARD_GOLD}` });
  resolveRewardClaim(next, { id: makeId('daily-growth'), type: 'growth', amount: DAILY_LOGIN_REWARD_GROWTH, label: `성장 재료 +${DAILY_LOGIN_REWARD_GROWTH}` });
  if (next.dailyLogin.streak % 3 === 0) {
    resolveRewardClaim(next, {
      id: makeId('daily-streak-eq'),
      type: 'equipment',
      equipmentDefinitionId: 'chrono-brooch',
      rarity: 'epic',
      label: '출석 보너스 장신구',
    });
  }
  next.lastOpenedAt = now;
  return next;
}

export function growCharacter(state: AutoPvpSaveState, characterId: string, now: number) {
  const next = cloneState(state);
  ensurePeriods(next, now);
  const target = next.roster.find((character) => character.id === characterId);
  if (!target) return next;
  const costGold = 180 + target.level * 24;
  const costGrowth = 32 + target.growthRank * 18;
  if (next.userProfile.currencies.gold < costGold || next.userProfile.currencies.growth < costGrowth) return next;

  next.userProfile.currencies.gold -= costGold;
  next.userProfile.currencies.growth -= costGrowth;
  target.level += 1;
  target.growthRank = Math.min(4, target.growthRank + (target.level % 5 === 0 ? 1 : 0));
  next.activity.dailyGrowths += 1;
  next.activity.weeklyGrowths += 1;
  next.lastOpenedAt = now;
  return next;
}

export function assignCharacterToTeam(state: AutoPvpSaveState, slotId: TeamPreset['slots'][number]['slotId'], characterId: string | undefined, now: number) {
  const next = cloneState(state);
  const activeTeam = getActiveTeam(next);
  activeTeam.slots.forEach((slot) => {
    if (slot.characterId === characterId) slot.characterId = undefined;
  });
  const targetSlot = activeTeam.slots.find((slot) => slot.slotId === slotId);
  if (targetSlot) targetSlot.characterId = characterId;
  next.lastOpenedAt = now;
  return next;
}

export function equipItemToCharacter(state: AutoPvpSaveState, itemId: string, characterId: string, now: number) {
  const next = cloneState(state);
  const inventoryMap = getInventoryMap(next);
  const rosterMap = getRosterMap(next);
  const item = inventoryMap[itemId];
  const targetCharacter = rosterMap[characterId];
  if (!item || !targetCharacter) return next;
  const definition = EQUIPMENT_DEFINITION_MAP[item.definitionId];
  const currentItemId = targetCharacter.equipmentIds[definition.slot];
  if (currentItemId) {
    const currentItem = inventoryMap[currentItemId];
    if (currentItem) currentItem.equippedByCharacterId = undefined;
  }
  if (item.equippedByCharacterId) {
    const previousCharacter = rosterMap[item.equippedByCharacterId];
    if (previousCharacter) previousCharacter.equipmentIds[definition.slot] = undefined;
  }
  targetCharacter.equipmentIds[definition.slot] = item.id;
  item.equippedByCharacterId = characterId;
  next.lastOpenedAt = now;
  return next;
}

export function unequipItem(state: AutoPvpSaveState, itemId: string, now: number) {
  const next = cloneState(state);
  const item = next.inventory.find((entry) => entry.id === itemId);
  if (!item || !item.equippedByCharacterId) return next;
  const owner = next.roster.find((character) => character.id === item.equippedByCharacterId);
  if (owner) {
    const definition = EQUIPMENT_DEFINITION_MAP[item.definitionId];
    owner.equipmentIds[definition.slot] = undefined;
  }
  item.equippedByCharacterId = undefined;
  next.lastOpenedAt = now;
  return next;
}

export function upgradeEquipment(state: AutoPvpSaveState, itemId: string, now: number) {
  const next = cloneState(state);
  ensurePeriods(next, now);
  const item = next.inventory.find((entry) => entry.id === itemId);
  if (!item) return next;
  const costGold = 120 + item.level * 48;
  const costCore = 12 + item.level * 4;
  if (next.userProfile.currencies.gold < costGold || next.userProfile.currencies.gearCore < costCore) return next;
  next.userProfile.currencies.gold -= costGold;
  next.userProfile.currencies.gearCore -= costCore;
  item.level += 1;
  next.activity.dailyEquipmentUpgrades += 1;
  next.lastOpenedAt = now;
  return next;
}

function getMissionValue(state: AutoPvpSaveState, definition: Mission | Achievement) {
  switch (definition.metric) {
    case 'dailyBattles':
      return state.activity.dailyBattles;
    case 'dailyWins':
      return state.activity.dailyWins;
    case 'dailyPveClears':
      return state.activity.dailyPveClears;
    case 'dailyGrowths':
      return state.activity.dailyGrowths;
    case 'dailyEquipmentUpgrades':
      return state.activity.dailyEquipmentUpgrades;
    case 'dailyRewardsClaimed':
      return state.activity.dailyRewardsClaimed;
    case 'weeklyBattles':
      return state.activity.weeklyBattles;
    case 'weeklyWins':
      return state.activity.weeklyWins;
    case 'weeklyPveClears':
      return state.activity.weeklyPveClears;
    case 'weeklyGrowths':
      return state.activity.weeklyGrowths;
    case 'collectionCount':
      return state.collection.discoveredCharacterIds.length;
    case 'bestScore':
      return state.userProfile.bestScore;
    default:
      return 0;
  }
}

function claimRewardList(next: AutoPvpSaveState, rewards: Reward[]) {
  rewards.forEach((reward) => resolveRewardClaim(next, reward));
  next.activity.dailyRewardsClaimed += 1;
}

export function claimMissionReward(state: AutoPvpSaveState, missionId: string, group: 'daily' | 'weekly' | 'achievement', now: number) {
  const next = cloneState(state);
  ensurePeriods(next, now);
  if (group === 'daily') {
    const definition = DAILY_MISSIONS.find((mission) => mission.id === missionId);
    if (!definition || next.missionBoard.dailyClaimedIds.includes(missionId) || getMissionValue(next, definition) < definition.target) return next;
    next.missionBoard.dailyClaimedIds.push(missionId);
    claimRewardList(next, definition.rewards);
    return next;
  }
  if (group === 'weekly') {
    const definition = WEEKLY_MISSIONS.find((mission) => mission.id === missionId);
    if (!definition || next.missionBoard.weeklyClaimedIds.includes(missionId) || getMissionValue(next, definition) < definition.target) return next;
    next.missionBoard.weeklyClaimedIds.push(missionId);
    claimRewardList(next, definition.rewards);
    return next;
  }
  const definition = ACHIEVEMENTS.find((achievement) => achievement.id === missionId);
  if (!definition || next.missionBoard.achievementClaimedIds.includes(missionId) || getMissionValue(next, definition) < definition.target) return next;
  next.missionBoard.achievementClaimedIds.push(missionId);
  claimRewardList(next, definition.rewards);
  return next;
}

export function runPveStage(state: AutoPvpSaveState, dungeonId: string, stage: number, now: number) {
  const next = cloneState(state);
  ensurePeriods(next, now);
  const dungeon = PVE_DUNGEONS.find((entry) => entry.id === dungeonId);
  const selectedStage = dungeon?.stages.find((entry) => entry.stage === stage);
  if (!dungeon || !selectedStage) return next;
  const rival = RIVAL_PROFILES.find((entry) => entry.id === selectedStage.rivalId);
  if (!rival) return next;

  const activeTeam = getActiveTeam(next);
  const allySeed = buildUserBattleSeed(next.roster, next.inventory, activeTeam, next.userProfile.displayName, next.userProfile.score, next.userProfile.tier);
  const enemySeed = buildRivalBattleSeed(rival);
  const summary = simulateBattle(allySeed, enemySeed, 'pve', selectedStage.rewardTable, makeId('pve'), now);
  if (summary.result === 'win') {
    selectedStage.rewardTable.forEach((reward) => resolveRewardClaim(next, reward));
    next.activity.dailyPveClears += 1;
    next.activity.weeklyPveClears += 1;
  }
  next.pveRuns.unshift({ id: makeId('pve-run'), dungeonId, stage, result: summary.result, summaryId: summary.id, happenedAt: now, rewards: selectedStage.rewardTable });
  appendReports(next, [summary]);
  next.lastOpenedAt = now;
  return next;
}

function getMissionStatuses<T extends Mission | Achievement>(definitions: T[], claimedIds: string[], state: AutoPvpSaveState): MissionStatus[] {
  return definitions.map((definition) => {
    const progress = getMissionValue(state, definition);
    return { definition, progress, target: definition.target, completed: progress >= definition.target, claimed: claimedIds.includes(definition.id) };
  });
}

export function buildRanking(state: AutoPvpSaveState): RankingEntry[] {
  const activeTeam = getActiveTeam(state);
  const playerSeed = buildUserBattleSeed(state.roster, state.inventory, activeTeam, state.userProfile.displayName, state.userProfile.score, state.userProfile.tier);
  const entries: RankingEntry[] = [
    {
      rank: 0,
      userId: state.userProfile.userId,
      displayName: state.userProfile.displayName,
      tier: state.userProfile.tier,
      score: state.userProfile.score,
      winRate: state.activity.totalBattles > 0 ? (state.activity.totalWins / state.activity.totalBattles) * 100 : 0,
      teamPower: analyzeTeam(playerSeed).power,
      isCurrentUser: true,
    },
    ...RIVAL_PROFILES.map((rival) => ({
      rank: 0,
      userId: rival.id,
      displayName: rival.name,
      tier: rival.tier,
      score: rival.score,
      winRate: rival.winRateHint,
      teamPower: analyzeTeam(buildRivalBattleSeed(rival)).power,
      isCurrentUser: false,
    })),
  ];
  return entries.sort((left, right) => right.score - left.score || right.winRate - left.winRate).map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export function buildTodaySummary(state: AutoPvpSaveState): TodaySummary {
  const reports = state.battleReports.filter((report) => getDayKey(report.happenedAt) === state.activity.dailyKey);
  const wins = reports.filter((report) => report.result === 'win').length;
  const losses = reports.length - wins;
  const tierDelta = reports.reduce((total, report) => total + report.tierDelta, 0);
  const standoutCharacterId =
    Object.entries(reports.reduce<Record<string, number>>((total, report) => {
      total[report.mvpCharacterId] = (total[report.mvpCharacterId] || 0) + 1;
      return total;
    }, {})).sort((left, right) => right[1] - left[1])[0]?.[0] || undefined;
  const recentLoot = reports.flatMap((report) => report.rewards).slice(0, 6);
  const defeatReasons = reports.filter((report) => report.result === 'loss').map((report) => report.defeatReason).filter(Boolean).slice(0, 3);

  const recommendedActions: string[] = [];
  const analysis = getTeamAnalysis(state);
  if (state.pendingRewards.length > 0) recommendedActions.push(`누적 보상 ${state.pendingRewards.length}개를 먼저 수령하세요.`);
  if (analysis.missingRoles.includes('healer')) recommendedActions.push('힐러를 투입해 장기전 유지력을 보강하세요.');
  if (losses > wins && defeatReasons.some((reason) => reason.includes('전열'))) recommendedActions.push('전열 장비와 성장 수치를 먼저 보강해 보세요.');
  if (state.userProfile.currencies.growth >= 120) recommendedActions.push('성장 재료가 충분합니다. 핵심 딜러를 1단계 더 육성하세요.');
  if (state.activity.dailyPveClears < 3) recommendedActions.push('성장 균열을 돌아 오늘의 PvE 미션을 채우세요.');
  while (recommendedActions.length < 3) recommendedActions.push('팀 배치를 바꾸고 즉시 전투로 승률 변화를 확인해 보세요.');

  return {
    battles: reports.length,
    wins,
    losses,
    winRate: reports.length > 0 ? (wins / reports.length) * 100 : 0,
    tierDelta,
    standoutCharacterId,
    recentLoot,
    defeatReasons,
    recommendedActions: recommendedActions.slice(0, 3),
  };
}

export function getClaimableDailyLogin(state: AutoPvpSaveState, now: number) {
  return state.dailyLogin.lastClaimedDay !== getDayKey(now);
}

export function buildMissionGroups(state: AutoPvpSaveState) {
  return {
    daily: getMissionStatuses(DAILY_MISSIONS, state.missionBoard.dailyClaimedIds, state),
    weekly: getMissionStatuses(WEEKLY_MISSIONS, state.missionBoard.weeklyClaimedIds, state),
    achievements: getMissionStatuses(ACHIEVEMENTS, state.missionBoard.achievementClaimedIds, state),
  };
}

export function buildRecommendedGrowthTargets(state: AutoPvpSaveState) {
  return [...state.roster]
    .sort((left, right) => right.wins + right.level * 0.6 + right.growthRank * 10 - (left.wins + left.level * 0.6 + left.growthRank * 10))
    .slice(0, 4);
}

export function buildInventoryView(state: AutoPvpSaveState) {
  return [...state.inventory].sort((left, right) => {
    const rightDefinition = EQUIPMENT_DEFINITION_MAP[right.definitionId];
    const leftDefinition = EQUIPMENT_DEFINITION_MAP[left.definitionId];
    return right.level - left.level || rightDefinition.rarity.localeCompare(leftDefinition.rarity) || leftDefinition.slot.localeCompare(rightDefinition.slot);
  });
}

export function buildRosterView(state: AutoPvpSaveState) {
  return [...state.roster].sort((left, right) => right.level + right.growthRank - (left.level + left.growthRank));
}

export function buildCollectionProgress(state: AutoPvpSaveState) {
  return {
    characters: `${state.collection.discoveredCharacterIds.length}/${CHARACTER_DEFINITIONS.length}`,
    equipment: `${state.collection.discoveredEquipmentDefinitionIds.length}/${Object.keys(EQUIPMENT_DEFINITION_MAP).length}`,
  };
}

export function buildRecentPveRuns(state: AutoPvpSaveState) {
  return state.pveRuns.slice(0, 5);
}

export function buildRewardPreview(rewards: Reward[]) {
  return rewards.slice(0, 6).map((reward) => reward.label).join(', ');
}

export function describeOfflineResult(result: OfflineProgressResult | null) {
  if (!result || result.simulatedBattles === 0) return '오프라인 누적 전투가 없습니다.';
  return `${formatDuration(result.cappedDurationMs)} 동안 ${result.simulatedBattles}회 자동 전투가 진행되었습니다.`;
}

export function getCurrencySummary(state: AutoPvpSaveState) {
  return [
    { key: 'gold', label: '골드', value: formatNumber(state.userProfile.currencies.gold) },
    { key: 'growth', label: '성장 재료', value: formatNumber(state.userProfile.currencies.growth) },
    { key: 'gearCore', label: '강화 코어', value: formatNumber(state.userProfile.currencies.gearCore) },
    { key: 'arenaToken', label: '아레나 토큰', value: formatNumber(state.userProfile.currencies.arenaToken) },
    { key: 'gem', label: '젬', value: formatNumber(state.userProfile.currencies.gem) },
  ];
}

export function getTeamAnalysis(state: AutoPvpSaveState) {
  const activeTeam = getActiveTeam(state);
  const seed = buildUserBattleSeed(state.roster, state.inventory, activeTeam, state.userProfile.displayName, state.userProfile.score, state.userProfile.tier);
  return analyzeTeam(seed);
}

export function getActiveTeamState(state: AutoPvpSaveState) {
  return getActiveTeam(state);
}

export function getRivalById(rivalId: string) {
  return RIVAL_PROFILES.find((rival) => rival.id === rivalId) || null;
}

export function getDungeonById(dungeonId: string) {
  return PVE_DUNGEONS.find((dungeon) => dungeon.id === dungeonId) || null;
}
