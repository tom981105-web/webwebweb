import { CURRENT_SEASON } from '@/data/content';
import type { AutoPvpSaveState, TeamPreset, UserCharacter, UserEquipment, UserProfile } from '@/types/game';
import { getDayKey, getTierFromScore, getWeekKey } from '@/utils/format';

function createProfile(userId: string): UserProfile {
  const score = 1188;
  return {
    userId,
    displayName: userId,
    tier: getTierFromScore(score),
    score,
    bestScore: score,
    level: 23,
    experience: 0,
    currencies: {
      gold: 2880,
      growth: 320,
      gearCore: 180,
      arenaToken: 95,
      gem: 140,
    },
    seasonId: CURRENT_SEASON.id,
    guildName: '연결 대기중',
    title: '전술 관리자',
    avatarFrame: '브론즈 프레임',
  };
}

function createRoster(): UserCharacter[] {
  return [
    { id: 'uc-ronan', definitionId: 'ronan-bastion', level: 24, stars: 4, growthRank: 2, equipmentIds: { armor: 'ue-fortress-mail', accessory: 'ue-iron-ring' }, bonusStats: { hp: 80, defense: 8 }, wins: 42, battles: 68 },
    { id: 'uc-kael', definitionId: 'kael-quake', level: 23, stars: 4, growthRank: 1, equipmentIds: { weapon: 'ue-sentinel-hammer', accessory: 'ue-bloodline-charm' }, bonusStats: { attack: 12 }, wins: 38, battles: 66 },
    { id: 'uc-nyra', definitionId: 'nyra-veil', level: 24, stars: 5, growthRank: 2, equipmentIds: { weapon: 'ue-stormcoil-lance', accessory: 'ue-veil-sigil' }, bonusStats: { speed: 6, critRate: 4 }, wins: 49, battles: 68 },
    { id: 'uc-selene', definitionId: 'selene-comet', level: 23, stars: 4, growthRank: 1, equipmentIds: { weapon: 'ue-phantom-bow', accessory: 'ue-chrono-brooch' }, bonusStats: { attack: 14, accuracy: 6 }, wins: 41, battles: 68 },
    { id: 'uc-vesper', definitionId: 'vesper-cryo', level: 23, stars: 4, growthRank: 1, equipmentIds: { weapon: 'ue-aurora-catalyst' }, bonusStats: { attack: 16 }, wins: 35, battles: 62 },
    { id: 'uc-liora', definitionId: 'liora-sun', level: 22, stars: 4, growthRank: 2, equipmentIds: { accessory: 'ue-sunwell-orb', armor: 'ue-medic-habit' }, bonusStats: { hp: 70, resistance: 8 }, wins: 40, battles: 66 },
    { id: 'uc-mino', definitionId: 'mino-signal', level: 21, stars: 3, growthRank: 1, equipmentIds: { accessory: 'ue-spare-chrono' }, bonusStats: { speed: 8 }, wins: 28, battles: 54 },
    { id: 'uc-brakka', definitionId: 'brakka-wall', level: 21, stars: 3, growthRank: 1, equipmentIds: { armor: 'ue-warden-plate' }, bonusStats: { hp: 60, defense: 10 }, wins: 17, battles: 39 },
    { id: 'uc-kestrel', definitionId: 'kestrel-mark', level: 22, stars: 3, growthRank: 1, equipmentIds: { weapon: 'ue-spare-emberfang' }, bonusStats: { accuracy: 8 }, wins: 22, battles: 48 },
    { id: 'uc-eirene', definitionId: 'eirene-mirror', level: 22, stars: 4, growthRank: 1, equipmentIds: {}, bonusStats: { resistance: 10 }, wins: 26, battles: 49 },
    { id: 'uc-morrow', definitionId: 'morrow-hex', level: 22, stars: 3, growthRank: 1, equipmentIds: {}, bonusStats: { attack: 12 }, wins: 20, battles: 45 },
    { id: 'uc-dorian', definitionId: 'dorian-rift', level: 24, stars: 5, growthRank: 2, equipmentIds: { weapon: 'ue-emberfang-blade', accessory: 'ue-bloodline-charm-2' }, bonusStats: { attack: 18, hp: 60 }, wins: 47, battles: 70 },
    { id: 'uc-astra', definitionId: 'astra-cantor', level: 21, stars: 3, growthRank: 1, equipmentIds: {}, bonusStats: { speed: 6 }, wins: 18, battles: 42 },
  ];
}

function createInventory(): UserEquipment[] {
  return [
    { id: 'ue-emberfang-blade', definitionId: 'emberfang-blade', level: 6, equippedByCharacterId: 'uc-dorian', locked: false },
    { id: 'ue-stormcoil-lance', definitionId: 'stormcoil-lance', level: 5, equippedByCharacterId: 'uc-nyra', locked: false },
    { id: 'ue-aurora-catalyst', definitionId: 'aurora-catalyst', level: 4, equippedByCharacterId: 'uc-vesper', locked: false },
    { id: 'ue-sentinel-hammer', definitionId: 'sentinel-hammer', level: 4, equippedByCharacterId: 'uc-kael', locked: false },
    { id: 'ue-phantom-bow', definitionId: 'phantom-bow', level: 5, equippedByCharacterId: 'uc-selene', locked: false },
    { id: 'ue-fortress-mail', definitionId: 'fortress-mail', level: 5, equippedByCharacterId: 'uc-ronan', locked: false },
    { id: 'ue-nightweave-cloak', definitionId: 'nightweave-cloak', level: 3, locked: false },
    { id: 'ue-medic-habit', definitionId: 'medic-habit', level: 4, equippedByCharacterId: 'uc-liora', locked: false },
    { id: 'ue-warden-plate', definitionId: 'warden-plate', level: 4, equippedByCharacterId: 'uc-brakka', locked: false },
    { id: 'ue-glacier-shell', definitionId: 'glacier-shell', level: 2, locked: false },
    { id: 'ue-bloodline-charm', definitionId: 'bloodline-charm', level: 5, equippedByCharacterId: 'uc-kael', locked: false },
    { id: 'ue-chrono-brooch', definitionId: 'chrono-brooch', level: 5, equippedByCharacterId: 'uc-selene', locked: false },
    { id: 'ue-sunwell-orb', definitionId: 'sunwell-orb', level: 4, equippedByCharacterId: 'uc-liora', locked: false },
    { id: 'ue-iron-ring', definitionId: 'iron-oath-ring', level: 4, equippedByCharacterId: 'uc-ronan', locked: false },
    { id: 'ue-veil-sigil', definitionId: 'veil-sigil', level: 4, equippedByCharacterId: 'uc-nyra', locked: false },
    { id: 'ue-spare-chrono', definitionId: 'chrono-brooch', level: 2, equippedByCharacterId: 'uc-mino', locked: false },
    { id: 'ue-spare-emberfang', definitionId: 'emberfang-blade', level: 2, equippedByCharacterId: 'uc-kestrel', locked: false },
    { id: 'ue-bloodline-charm-2', definitionId: 'bloodline-charm', level: 3, equippedByCharacterId: 'uc-dorian', locked: false },
  ];
}

function createTeamPreset(): TeamPreset {
  return {
    id: 'team-alpha',
    name: '메인 아레나 조합',
    formation: 'balanced',
    slots: [
      { slotId: 'front-1', characterId: 'uc-ronan' },
      { slotId: 'front-2', characterId: 'uc-kael' },
      { slotId: 'front-3', characterId: 'uc-dorian' },
      { slotId: 'back-1', characterId: 'uc-selene' },
      { slotId: 'back-2', characterId: 'uc-liora' },
    ],
  };
}

export function createInitialSaveState(userId: string): AutoPvpSaveState {
  const now = Date.now();
  const roster = createRoster();
  const inventory = createInventory();
  return {
    version: 1,
    userProfile: createProfile(userId),
    roster,
    inventory,
    teamPresets: [createTeamPreset()],
    activeTeamId: 'team-alpha',
    battleReports: [],
    pendingRewards: [],
    pveRuns: [],
    missionBoard: {
      dailyClaimedIds: [],
      weeklyClaimedIds: [],
      achievementClaimedIds: [],
    },
    collection: {
      discoveredCharacterIds: roster.map((character) => character.definitionId),
      discoveredEquipmentDefinitionIds: inventory.map((item) => item.definitionId),
    },
    activity: {
      dailyKey: getDayKey(now),
      weeklyKey: getWeekKey(now),
      dailyBattles: 0,
      dailyWins: 0,
      dailyPveClears: 0,
      dailyGrowths: 0,
      dailyEquipmentUpgrades: 0,
      dailyRewardsClaimed: 0,
      weeklyBattles: 0,
      weeklyWins: 0,
      weeklyPveClears: 0,
      weeklyGrowths: 0,
      totalBattles: 0,
      totalWins: 0,
      totalLosses: 0,
    },
    dailyLogin: {
      lastClaimedDay: '',
      streak: 0,
    },
    season: CURRENT_SEASON,
    lastProcessedAt: now - 1000 * 60 * 60 * 3,
    lastOpenedAt: now - 1000 * 60 * 60 * 3,
  };
}
