import { MAX_BATTLE_TURNS, MAX_KEY_LOGS, TEAM_SLOT_ORDER } from '@/config/gameConfig';
import { CHARACTER_DEFINITION_MAP } from '@/data/characters';
import { EQUIPMENT_DEFINITION_MAP } from '@/data/equipment';
import type {
  BattleLog,
  BattleResult,
  BattleSummary,
  CharacterRole,
  PassiveEffectDefinition,
  ResolvedStats,
  Reward,
  RivalProfile,
  SkillActionDefinition,
  SkillDefinition,
  StatusEffectKind,
  TeamAnalysis,
  TeamPreset,
  TierName,
  UserCharacter,
  UserEquipment,
} from '@/types/game';

type TeamSide = 'ally' | 'enemy';
type PositionLane = 'front' | 'back';

interface StatusInstance {
  id: string;
  kind: StatusEffectKind;
  value: number;
  duration: number;
  sourceName: string;
}

interface RuntimeUnit {
  combatId: string;
  sourceCharacterId: string;
  definitionId: string;
  name: string;
  role: CharacterRole;
  side: TeamSide;
  lane: PositionLane;
  slotIndex: number;
  maxHp: number;
  currentHp: number;
  shield: number;
  stats: ResolvedStats;
  statuses: StatusInstance[];
  cooldowns: Record<string, number>;
  passives: PassiveEffectDefinition[];
  equipmentEffects: PassiveEffectDefinition[];
  lowHpShieldTriggered: boolean;
  totalDamage: number;
  totalHealing: number;
  totalTaken: number;
  kills: number;
  alive: boolean;
}

export interface BattleSideSeed {
  id: string;
  name: string;
  teamName: string;
  score: number;
  tier: TierName;
  members: Array<{
    sourceCharacterId: string;
    definitionId: string;
    level: number;
    slotId: (typeof TEAM_SLOT_ORDER)[number];
    equipmentDefinitionIds: string[];
    bonusStats?: Partial<ResolvedStats>;
  }>;
}

const ROLE_ADVANTAGE: Record<CharacterRole, Partial<Record<CharacterRole, number>>> = {
  tank: { assassin: 1.1, ranger: 1.05 },
  bruiser: { ranger: 1.08, support: 1.08 },
  assassin: { ranger: 1.14, mage: 1.16, healer: 1.12, support: 1.1 },
  ranger: { healer: 1.08, support: 1.1 },
  mage: { tank: 1.12, bruiser: 1.08 },
  healer: {},
  support: {},
};

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function chance(rate: number) {
  return Math.random() < rate;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getLane(slotId: (typeof TEAM_SLOT_ORDER)[number]): PositionLane {
  return slotId.startsWith('front') ? 'front' : 'back';
}

function getDefenseBreakValue(unit: RuntimeUnit) {
  return unit.statuses
    .filter((status) => status.kind === 'defenseBreak')
    .reduce((total, status) => total + status.value, 0);
}

function getBuffValue(unit: RuntimeUnit, kind: Extract<StatusEffectKind, 'attackUp' | 'speedUp' | 'guardUp' | 'healUp'>) {
  return unit.statuses
    .filter((status) => status.kind === kind)
    .reduce((total, status) => total + status.value, 0);
}

function getEffectiveSpeed(unit: RuntimeUnit) {
  return unit.stats.speed + getBuffValue(unit, 'speedUp');
}

function resolveEquipmentEffects(equipmentDefinitionIds: string[]): PassiveEffectDefinition[] {
  const effects: PassiveEffectDefinition[] = [];
  equipmentDefinitionIds
    .map((equipmentId) => EQUIPMENT_DEFINITION_MAP[equipmentId])
    .filter((definition): definition is NonNullable<typeof definition> => Boolean(definition))
    .forEach((definition) => {
      const effect = definition.effect;
      if (!effect) return;
      switch (effect.kind) {
        case 'battleStartShield':
          effects.push({ kind: 'battleStartShield', value: effect.value });
          return;
        case 'battleStartSpeed':
          effects.push({ kind: 'battleStartStatus', statusKind: 'speedUp', value: effect.value, duration: effect.duration || 2 });
          return;
        case 'critBleed':
          effects.push({ kind: 'critBleed', value: effect.value });
          return;
        case 'damageReduction':
          effects.push({ kind: 'damageReduction', value: effect.value });
          return;
        case 'healingBoost':
          effects.push({ kind: 'healBoost', value: effect.value });
          return;
        case 'lifesteal':
          effects.push({ kind: 'lifesteal', value: effect.value });
          return;
        case 'lowHpShield':
          effects.push({ kind: 'lowHpGuard', value: effect.value, threshold: effect.threshold });
          return;
        case 'statusWard':
          effects.push({ kind: 'statBonus', target: 'self', mode: 'flat', stats: { resistance: effect.value } });
          return;
      }
    });
  return effects;
}

function createBaseResolvedStats(
  definitionId: string,
  level: number,
  equipmentDefinitionIds: string[],
  bonusStats: Partial<ResolvedStats> | undefined,
) {
  const definition = CHARACTER_DEFINITION_MAP[definitionId];
  const base = definition.baseStats;
  const equipmentBonuses = equipmentDefinitionIds
    .map((equipmentId) => EQUIPMENT_DEFINITION_MAP[equipmentId])
    .filter(Boolean)
    .reduce(
      (total, definitionItem) => ({
        hp: total.hp + Number(definitionItem.statBonuses.hp || 0),
        attack: total.attack + Number(definitionItem.statBonuses.attack || 0),
        defense: total.defense + Number(definitionItem.statBonuses.defense || 0),
        speed: total.speed + Number(definitionItem.statBonuses.speed || 0),
        critRate: total.critRate + Number(definitionItem.statBonuses.critRate || 0),
        critDamage: total.critDamage + Number(definitionItem.statBonuses.critDamage || 0),
        accuracy: total.accuracy + Number(definitionItem.statBonuses.accuracy || 0),
        evasion: total.evasion + Number(definitionItem.statBonuses.evasion || 0),
        resistance: total.resistance + Number(definitionItem.statBonuses.resistance || 0),
      }),
      { hp: 0, attack: 0, defense: 0, speed: 0, critRate: 0, critDamage: 0, accuracy: 0, evasion: 0, resistance: 0 },
    );

  return {
    hp: base.hp + level * 34 + equipmentBonuses.hp + Number(bonusStats?.hp || 0),
    attack: base.attack + level * 5 + equipmentBonuses.attack + Number(bonusStats?.attack || 0),
    defense: base.defense + level * 3 + equipmentBonuses.defense + Number(bonusStats?.defense || 0),
    speed: base.speed + Math.floor(level / 4) + equipmentBonuses.speed + Number(bonusStats?.speed || 0),
    critRate: base.critRate + equipmentBonuses.critRate + Number(bonusStats?.critRate || 0),
    critDamage: base.critDamage + equipmentBonuses.critDamage + Number(bonusStats?.critDamage || 0),
    accuracy: base.accuracy + equipmentBonuses.accuracy + Number(bonusStats?.accuracy || 0),
    evasion: base.evasion + equipmentBonuses.evasion + Number(bonusStats?.evasion || 0),
    resistance: base.resistance + equipmentBonuses.resistance + Number(bonusStats?.resistance || 0),
    healBoost: 0,
    damageReduction: 0,
    lifesteal: 0,
  } satisfies ResolvedStats;
}

function applyPassiveEffectToStats(unit: RuntimeUnit, effect: PassiveEffectDefinition) {
  if (effect.kind === 'statBonus' && effect.stats) {
    const mode = effect.mode || 'flat';
    Object.entries(effect.stats).forEach(([key, rawValue]) => {
      const statKey = key as keyof ResolvedStats;
      const value = Number(rawValue || 0);
      if (mode === 'percent') {
        const current = Number(unit.stats[statKey] || 0);
        unit.stats[statKey] = Number(current + current * (value / 100));
      } else {
        unit.stats[statKey] = Number(unit.stats[statKey] || 0) + value;
      }
    });
  }

  if (effect.kind === 'healBoost') {
    unit.stats.healBoost += Number(effect.value || 0);
  }
  if (effect.kind === 'damageReduction') {
    unit.stats.damageReduction += Number(effect.value || 0);
  }
  if (effect.kind === 'lifesteal') {
    unit.stats.lifesteal += Number(effect.value || 0);
  }
}

function addStatus(unit: RuntimeUnit, status: StatusInstance, logs: BattleLog[], turn: number) {
  if (!unit.alive) return;
  unit.statuses.push(status);
  logs.push({
    turn,
    type: 'status',
    actorName: status.sourceName,
    text: `${unit.name}에게 ${status.kind} 효과가 ${status.duration}턴 적용되었습니다.`,
  });
}

function cleanupStatuses(unit: RuntimeUnit) {
  unit.statuses = unit.statuses.filter((status) => status.duration > 0);
}

function applyTeamSynergy(units: RuntimeUnit[]) {
  const notes: string[] = [];
  const uniqueRoles = new Set(units.map((unit) => unit.role));
  const frontline = units.filter((unit) => unit.lane === 'front');
  const backline = units.filter((unit) => unit.lane === 'back');
  const hasHealer = units.some((unit) => unit.role === 'healer');
  const hasSupport = units.some((unit) => unit.role === 'support');
  const hasTankFront = frontline.some((unit) => unit.role === 'tank');

  if (uniqueRoles.size >= 4) {
    units.forEach((unit) => {
      unit.stats.speed += 8;
    });
    notes.push('4개 이상 역할 조합: 전체 속도 +8');
  }

  if (frontline.filter((unit) => unit.role === 'tank' || unit.role === 'bruiser').length >= 2) {
    frontline.forEach((unit) => {
      unit.stats.defense *= 1.12;
    });
    notes.push('전열 내구 균형: 전열 방어 +12%');
  }

  if (hasHealer && hasSupport) {
    units.forEach((unit) => {
      unit.stats.healBoost += 12;
    });
    notes.push('힐러 + 서포터: 회복량 +12%');
  }

  if (hasTankFront && backline.some((unit) => ['assassin', 'ranger', 'mage'].includes(unit.role))) {
    backline.forEach((unit) => {
      unit.stats.attack *= 1.1;
    });
    notes.push('후열 보호 완성: 후열 공격 +10%');
  }

  return notes;
}

function createRuntimeUnits(side: TeamSide, seed: BattleSideSeed) {
  const units: RuntimeUnit[] = seed.members.map((member, index) => {
    const definition = CHARACTER_DEFINITION_MAP[member.definitionId];
    const stats = createBaseResolvedStats(member.definitionId, member.level, member.equipmentDefinitionIds, member.bonusStats);
    const passives = definition.passive.effects;
    const equipmentEffects = resolveEquipmentEffects(member.equipmentDefinitionIds);

    const unit: RuntimeUnit = {
      combatId: `${side}-${member.sourceCharacterId}`,
      sourceCharacterId: member.sourceCharacterId,
      definitionId: member.definitionId,
      name: definition.name,
      role: definition.role,
      side,
      lane: getLane(member.slotId),
      slotIndex: index,
      maxHp: stats.hp,
      currentHp: stats.hp,
      shield: 0,
      stats,
      statuses: [],
      cooldowns: {
        [definition.activeSkills[0].id]: 0,
        [definition.activeSkills[1].id]: 0,
        [definition.ultimate.id]: 1,
      },
      passives,
      equipmentEffects,
      lowHpShieldTriggered: false,
      totalDamage: 0,
      totalHealing: 0,
      totalTaken: 0,
      kills: 0,
      alive: true,
    };

    [...passives, ...equipmentEffects].forEach((effect) => applyPassiveEffectToStats(unit, effect));
    return unit;
  });

  const notes = applyTeamSynergy(units);

  units.forEach((unit) => {
    [...unit.passives, ...unit.equipmentEffects].forEach((effect) => {
      if (effect.kind === 'battleStartShield' && Number(effect.value || 0) > 0) {
        unit.shield += unit.maxHp * (Number(effect.value || 0) / 100);
      }
      if (effect.kind === 'battleStartStatus' && effect.statusKind) {
        unit.statuses.push({
          id: `${unit.combatId}-${effect.statusKind}-start`,
          kind: effect.statusKind,
          value: Number(effect.value || 0),
          duration: Number(effect.duration || 1),
          sourceName: unit.name,
        });
      }
    });
  });

  return { units, notes };
}

function getAlive(units: RuntimeUnit[], side: TeamSide) {
  return units.filter((unit) => unit.side === side && unit.alive);
}

function pickTargets(action: SkillActionDefinition, actor: RuntimeUnit, units: RuntimeUnit[]) {
  const allies = getAlive(units, actor.side);
  const enemies = getAlive(units, actor.side === 'ally' ? 'enemy' : 'ally');
  const frontlineEnemies = enemies.filter((unit) => unit.lane === 'front');
  const frontlineAllies = allies.filter((unit) => unit.lane === 'front');
  const backlineAllies = allies.filter((unit) => unit.lane === 'back');
  const backlineEnemies = enemies.filter((unit) => unit.lane === 'back');

  switch (action.target) {
    case 'frontline':
      return frontlineEnemies.length ? [frontlineEnemies[0]] : enemies.slice(0, 1);
    case 'backline':
      return backlineEnemies.length ? [backlineEnemies[0]] : enemies.slice(-1);
    case 'lowestHpEnemy':
      return enemies.length
        ? [
            [...enemies].sort(
              (left, right) => left.currentHp / left.maxHp - right.currentHp / right.maxHp || left.currentHp - right.currentHp,
            )[0],
          ]
        : [];
    case 'randomEnemy':
      return enemies.length ? [enemies[Math.floor(Math.random() * enemies.length)]] : [];
    case 'allEnemies':
      return enemies;
    case 'self':
      return [actor];
    case 'lowestHpAlly':
      return allies.length
        ? [
            [...allies].sort(
              (left, right) => left.currentHp / left.maxHp - right.currentHp / right.maxHp || left.currentHp - right.currentHp,
            )[0],
          ]
        : [];
    case 'allAllies':
      return allies;
    case 'frontlineAllies':
      return frontlineAllies;
    case 'backlineAllies':
      return backlineAllies;
    default:
      return [];
  }
}

function applyDamage(actor: RuntimeUnit, target: RuntimeUnit, action: SkillActionDefinition, logs: BattleLog[], turn: number) {
  const accuracyDelta = actor.stats.accuracy - target.stats.evasion;
  const hitRate = clamp(0.82 + accuracyDelta / 220, 0.58, 0.97);
  if (!chance(hitRate)) {
    logs.push({ turn, type: 'action', actorName: actor.name, text: `${actor.name}의 공격을 ${target.name}가 회피했습니다.` });
    return;
  }

  const roleModifier = ROLE_ADVANTAGE[actor.role][target.role] || 1;
  const critRate = clamp((actor.stats.critRate + accuracyDelta * 0.05) / 100, 0.04, 0.68);
  const isCrit = chance(critRate);
  const attackBuff = 1 + getBuffValue(actor, 'attackUp') / 100;
  const attackPower = actor.stats.attack * attackBuff;
  const defenseBreak = getDefenseBreakValue(target);
  const guardBuff = getBuffValue(target, 'guardUp');
  const effectiveDefense = target.stats.defense * (1 - defenseBreak / 100) * (1 + guardBuff / 100) * (1 - (action.ignoreDefense || 0));
  let damage = attackPower * Number(action.scaling || 1) * roleModifier * randomBetween(0.92, 1.08);

  if (target.lane === 'back' && [...actor.passives, ...actor.equipmentEffects].some((effect) => effect.kind === 'backlineHunter')) {
    const bonus = [...actor.passives, ...actor.equipmentEffects]
      .filter((effect) => effect.kind === 'backlineHunter')
      .reduce((total, effect) => total + Number(effect.value || 0), 0);
    damage *= 1 + bonus / 100;
  }

  [...actor.passives, ...actor.equipmentEffects]
    .filter((effect) => effect.kind === 'execute')
    .forEach((effect) => {
      const threshold = Number(effect.threshold || 0);
      if ((target.currentHp / target.maxHp) * 100 <= threshold) {
        damage *= 1 + Number(effect.value || 0) / 100;
      }
    });

  damage *= 100 / (100 + effectiveDefense * 0.72);
  damage *= 1 - clamp(target.stats.damageReduction / 100, 0, 0.5);

  [...target.passives, ...target.equipmentEffects]
    .filter((effect) => effect.kind === 'lowHpGuard')
    .forEach((effect) => {
      const threshold = Number(effect.threshold || 0);
      if ((target.currentHp / target.maxHp) * 100 <= threshold) {
        damage *= 1 - Number(effect.value || 0) / 100;
      }
    });

  if (isCrit) {
    damage *= 1 + actor.stats.critDamage / 100;
  }

  damage = Math.max(38, Math.round(damage));

  if (!target.lowHpShieldTriggered) {
    const shieldTrigger = target.equipmentEffects.find((effect) => effect.kind === 'lowHpGuard');
    if (shieldTrigger && (target.currentHp / target.maxHp) * 100 <= Number(shieldTrigger.threshold || 30)) {
      target.shield += target.maxHp * (Number(shieldTrigger.value || 0) / 100);
      target.lowHpShieldTriggered = true;
      logs.push({ turn, type: 'system', actorName: target.name, text: `${target.name}의 장비 효과가 발동해 보호막이 생성되었습니다.` });
    }
  }

  let remainingDamage = damage;
  if (target.shield > 0) {
    const absorbed = Math.min(target.shield, remainingDamage);
    target.shield -= absorbed;
    remainingDamage -= absorbed;
  }

  target.currentHp -= remainingDamage;
  target.totalTaken += remainingDamage;
  actor.totalDamage += remainingDamage;

  if (action.status && target.alive) {
    const resistRate = clamp(target.stats.resistance / 140, 0.06, 0.5);
    if (chance(action.status.chance * (1 - resistRate))) {
      addStatus(
        target,
        { id: `${actor.combatId}-${action.status.kind}-${turn}`, kind: action.status.kind, value: action.status.value, duration: action.status.duration, sourceName: actor.name },
        logs,
        turn,
      );
    }
  }

  if (isCrit && [...actor.passives, ...actor.equipmentEffects].some((effect) => effect.kind === 'critBleed')) {
    addStatus(
      target,
      { id: `${actor.combatId}-crit-bleed-${turn}`, kind: 'bleed', value: 14, duration: 2, sourceName: actor.name },
      logs,
      turn,
    );
  }

  const lifeStealValue = clamp(actor.stats.lifesteal / 100, 0, 0.35);
  if (lifeStealValue > 0) {
    const healAmount = Math.round(remainingDamage * lifeStealValue);
    actor.currentHp = clamp(actor.currentHp + healAmount, 0, actor.maxHp);
    actor.totalHealing += healAmount;
  }

  logs.push({
    turn,
    type: 'damage',
    actorName: actor.name,
    text: `${actor.name}가 ${target.name}에게 ${remainingDamage.toLocaleString('ko-KR')} 피해${isCrit ? ' (치명타)' : ''}를 입혔습니다.`,
  });

  if (target.currentHp <= 0) {
    target.currentHp = 0;
    target.alive = false;
    actor.kills += 1;
    logs.push({ turn, type: 'system', actorName: actor.name, text: `${target.name}가 쓰러졌습니다.` });
  }
}

function applyHeal(actor: RuntimeUnit, target: RuntimeUnit, action: SkillActionDefinition, logs: BattleLog[], turn: number) {
  if (!target.alive) return;
  const healBoost = 1 + (actor.stats.healBoost + getBuffValue(actor, 'healUp')) / 100;
  const healValue = Math.round(actor.stats.attack * Number(action.scaling || 1) * healBoost);
  const beforeHp = target.currentHp;
  target.currentHp = clamp(target.currentHp + healValue, 0, target.maxHp);
  const restored = target.currentHp - beforeHp;
  actor.totalHealing += restored;
  logs.push({ turn, type: 'heal', actorName: actor.name, text: `${actor.name}가 ${target.name}를 ${restored.toLocaleString('ko-KR')} 회복했습니다.` });
}

function applyShield(actor: RuntimeUnit, target: RuntimeUnit, action: SkillActionDefinition, logs: BattleLog[], turn: number) {
  const scale = Number(action.scaling || 0);
  const base = action.basedOn === 'maxHp' ? target.maxHp : actor.stats.attack;
  const shieldValue = Math.round(base * scale);
  target.shield += shieldValue;
  logs.push({ turn, type: 'system', actorName: actor.name, text: `${actor.name}가 ${target.name}에게 보호막 ${shieldValue.toLocaleString('ko-KR')}을 부여했습니다.` });
}

function applyBuff(actor: RuntimeUnit, target: RuntimeUnit, action: SkillActionDefinition, logs: BattleLog[], turn: number) {
  if (!action.buffKind) return;
  const value = Math.round(Number(action.scaling || 0));
  addStatus(
    target,
    { id: `${actor.combatId}-${action.buffKind}-${turn}-${target.combatId}`, kind: action.buffKind, value, duration: 2, sourceName: actor.name },
    logs,
    turn,
  );
}

function applyCleanse(actor: RuntimeUnit, target: RuntimeUnit, action: SkillActionDefinition, logs: BattleLog[], turn: number) {
  const cleanseCount = Number(action.cleanseCount || 1);
  const removable = target.statuses.filter((status) => ['stun', 'bleed', 'defenseBreak'].includes(status.kind));
  const nextIds = new Set(removable.slice(0, cleanseCount).map((status) => status.id));
  target.statuses = target.statuses.filter((status) => !nextIds.has(status.id));
  if (nextIds.size > 0) {
    logs.push({ turn, type: 'status', actorName: actor.name, text: `${actor.name}가 ${target.name}의 약화 효과 ${nextIds.size}개를 해제했습니다.` });
  }
}

function shouldUseSkill(actor: RuntimeUnit, skill: SkillDefinition, units: RuntimeUnit[]) {
  if (actor.cooldowns[skill.id] > 0) return false;
  const hasHeal = skill.actions.some((action) => action.kind === 'heal' || action.kind === 'cleanse');
  const allies = getAlive(units, actor.side);
  if (hasHeal) {
    return allies.some((ally) => ally.currentHp / ally.maxHp < 0.82 || ally.statuses.some((status) => ['bleed', 'stun'].includes(status.kind)));
  }
  return true;
}

function chooseSkill(actor: RuntimeUnit, units: RuntimeUnit[]) {
  const definition = CHARACTER_DEFINITION_MAP[actor.definitionId];
  const skills = [...definition.activeSkills, definition.ultimate]
    .filter((skill) => shouldUseSkill(actor, skill, units))
    .sort((left, right) => right.priority - left.priority);

  return skills[0] || null;
}

function runTurnStart(unit: RuntimeUnit, logs: BattleLog[], turn: number) {
  if (!unit.alive) return { skipped: false };

  unit.statuses.forEach((status) => {
    if (status.kind === 'bleed') {
      const bleedDamage = Math.round(unit.maxHp * (status.value / 100) * 0.42);
      unit.currentHp -= bleedDamage;
      unit.totalTaken += bleedDamage;
      logs.push({ turn, type: 'status', actorName: status.sourceName, text: `${unit.name}가 출혈로 ${bleedDamage.toLocaleString('ko-KR')} 피해를 받았습니다.` });
    }
  });

  if (unit.currentHp <= 0) {
    unit.currentHp = 0;
    unit.alive = false;
    return { skipped: true };
  }

  unit.passives
    .filter((effect) => effect.kind === 'selfRegen')
    .forEach((effect) => {
      const healValue = Math.round(unit.maxHp * (Number(effect.value || 0) / 100));
      unit.currentHp = clamp(unit.currentHp + healValue, 0, unit.maxHp);
      unit.totalHealing += healValue;
      logs.push({ turn, type: 'heal', actorName: unit.name, text: `${unit.name}가 재생 효과로 ${healValue.toLocaleString('ko-KR')} 회복했습니다.` });
    });

  const stun = unit.statuses.find((status) => status.kind === 'stun');
  if (stun) {
    stun.duration -= 1;
    cleanupStatuses(unit);
    logs.push({ turn, type: 'status', actorName: unit.name, text: `${unit.name}가 기절하여 행동하지 못했습니다.` });
    return { skipped: true };
  }

  return { skipped: false };
}

function decreaseStatuses(unit: RuntimeUnit) {
  unit.statuses.forEach((status) => {
    if (status.kind !== 'stun') status.duration -= 1;
  });
  cleanupStatuses(unit);
}

function executeSkill(actor: RuntimeUnit, skill: SkillDefinition | null, units: RuntimeUnit[], logs: BattleLog[], turn: number) {
  const label = skill ? skill.name : '기본 공격';
  const actions = skill ? skill.actions : [{ kind: 'attack', target: 'frontline', scaling: 1 } satisfies SkillActionDefinition];

  logs.push({ turn, type: 'action', actorName: actor.name, text: `${actor.name}가 ${label}을 사용했습니다.` });

  actions.forEach((action) => {
    const baseTargets = pickTargets(action, actor, units);
    const hits = Number(action.hits || 1);
    for (let hit = 0; hit < hits; hit += 1) {
      const targets = action.target === 'randomEnemy' && baseTargets.length > 0 ? [baseTargets[Math.floor(Math.random() * baseTargets.length)]] : baseTargets;
      targets.forEach((target) => {
        if (!target || !target.alive) return;
        if (action.kind === 'attack') applyDamage(actor, target, action, logs, turn);
        if (action.kind === 'heal') applyHeal(actor, target, action, logs, turn);
        if (action.kind === 'shield') applyShield(actor, target, action, logs, turn);
        if (action.kind === 'buff') applyBuff(actor, target, action, logs, turn);
        if (action.kind === 'cleanse') applyCleanse(actor, target, action, logs, turn);
      });
      if (action.target !== 'randomEnemy') break;
    }
  });

  if (skill?.id === CHARACTER_DEFINITION_MAP[actor.definitionId].ultimate.id) {
    const healLowestEffect = actor.passives.find((effect) => effect.kind === 'onUltimateHealLowest');
    if (healLowestEffect) {
      const allies = getAlive(units, actor.side);
      const lowest = [...allies].sort((left, right) => left.currentHp / left.maxHp - right.currentHp / right.maxHp)[0];
      if (lowest) {
        const healValue = Math.round(actor.stats.attack * (Number(healLowestEffect.value || 0) / 100));
        const before = lowest.currentHp;
        lowest.currentHp = clamp(lowest.currentHp + healValue, 0, lowest.maxHp);
        actor.totalHealing += lowest.currentHp - before;
        logs.push({ turn, type: 'heal', actorName: actor.name, text: `${actor.name}의 패시브로 ${lowest.name}가 추가 회복되었습니다.` });
      }
    }
  }

  if (skill) actor.cooldowns[skill.id] = skill.cooldown;
}

function tickCooldowns(unit: RuntimeUnit) {
  Object.keys(unit.cooldowns).forEach((key) => {
    unit.cooldowns[key] = Math.max(0, unit.cooldowns[key] - 1);
  });
}

function calculateTeamPower(seed: BattleSideSeed) {
  return Math.round(
    seed.members.reduce((total, member) => {
      const stats = createBaseResolvedStats(member.definitionId, member.level, member.equipmentDefinitionIds, member.bonusStats);
      return total + stats.hp * 0.35 + stats.attack * 6 + stats.defense * 5 + stats.speed * 10;
    }, 0),
  );
}

export function analyzeTeam(seed: BattleSideSeed): TeamAnalysis {
  const notes = createRuntimeUnits('ally', seed).notes;
  const roles = new Set(seed.members.map((member) => CHARACTER_DEFINITION_MAP[member.definitionId].role));
  const missingRoles = (['tank', 'healer', 'support'] as CharacterRole[]).filter((role) => !roles.has(role));
  return { power: calculateTeamPower(seed), notes, missingRoles };
}

export function simulateBattle(
  allySeed: BattleSideSeed,
  enemySeed: BattleSideSeed,
  mode: BattleSummary['mode'],
  rewards: Reward[],
  summaryId: string,
  happenedAt: number,
): BattleSummary {
  const allyBundle = createRuntimeUnits('ally', allySeed);
  const enemyBundle = createRuntimeUnits('enemy', enemySeed);
  const units = [...allyBundle.units, ...enemyBundle.units];
  const logs: BattleLog[] = [];
  let turnCount = 0;

  for (let round = 1; round <= MAX_BATTLE_TURNS; round += 1) {
    const turnOrder = units
      .filter((unit) => unit.alive)
      .sort((left, right) => getEffectiveSpeed(right) - getEffectiveSpeed(left) || left.slotIndex - right.slotIndex);

    for (const unit of turnOrder) {
      if (!unit.alive) continue;
      tickCooldowns(unit);
      turnCount += 1;
      const turnState = runTurnStart(unit, logs, round);
      if (turnState.skipped) {
        if (!getAlive(units, 'ally').length || !getAlive(units, 'enemy').length) break;
        decreaseStatuses(unit);
        continue;
      }
      executeSkill(unit, chooseSkill(unit, units), units, logs, round);
      decreaseStatuses(unit);
      if (!getAlive(units, 'ally').length || !getAlive(units, 'enemy').length) break;
    }
    if (!getAlive(units, 'ally').length || !getAlive(units, 'enemy').length) break;
  }

  const allyAlive = getAlive(units, 'ally');
  const enemyAlive = getAlive(units, 'enemy');
  const result: BattleResult = allyAlive.length > 0 && enemyAlive.length === 0 ? 'win' : 'loss';
  const allyUnits = units.filter((unit) => unit.side === 'ally');
  const enemyUnits = units.filter((unit) => unit.side === 'enemy');
  const mvpUnit =
    [...allyUnits].sort((left, right) => right.totalDamage + right.totalHealing * 1.2 + right.kills * 480 - (left.totalDamage + left.totalHealing * 1.2 + left.kills * 480))[0] || allyUnits[0];
  const totalDamage = allyUnits.reduce((total, unit) => total + unit.totalDamage, 0);
  const totalHealing = allyUnits.reduce((total, unit) => total + unit.totalHealing, 0);
  const enemyHealing = enemyUnits.reduce((total, unit) => total + unit.totalHealing, 0);
  const backlineDeaths = allyUnits.filter((unit) => unit.lane === 'back' && !unit.alive).length;
  const frontlineDeaths = allyUnits.filter((unit) => unit.lane === 'front' && !unit.alive).length;
  const enemySpeed = enemyUnits.reduce((total, unit) => total + unit.stats.speed, 0);
  const allySpeed = allyUnits.reduce((total, unit) => total + unit.stats.speed, 0);
  let defeatReason = '';

  if (result === 'loss') {
    if (frontlineDeaths >= 2 && turnCount <= 8) defeatReason = '전열 붕괴가 너무 빨랐습니다';
    else if (totalHealing < enemyHealing * 0.65) defeatReason = '회복량이 부족했습니다';
    else if (enemySpeed > allySpeed + 32 && turnCount <= 8) defeatReason = '상대의 선공을 버티지 못했습니다';
    else if (backlineDeaths >= 2) defeatReason = '후열 딜러 보호에 실패했습니다';
    else if (logs.filter((log) => log.text.includes('출혈') || log.text.includes('기절')).length >= 6) defeatReason = '상태이상 저항이 부족했습니다';
    else defeatReason = '생존력과 화력 균형이 아쉬웠습니다';
  } else {
    defeatReason = '전열 유지와 후열 화력이 안정적으로 이어졌습니다';
  }

  const keyLog = logs.filter((entry) => entry.type !== 'system' || entry.text.includes('쓰러졌습니다') || entry.text.includes('보호막')).map((entry) => entry.text).slice(-MAX_KEY_LOGS);

  return {
    id: summaryId,
    mode,
    result,
    opponent: { id: enemySeed.id, name: enemySeed.name, teamName: enemySeed.teamName, tier: enemySeed.tier, score: enemySeed.score },
    happenedAt,
    turnCount,
    survivors: { ally: allyAlive.length, enemy: enemyAlive.length },
    totalDamage,
    totalHealing,
    mvpCharacterId: mvpUnit?.sourceCharacterId || allyUnits[0]?.sourceCharacterId || '',
    keyLog,
    defeatReason,
    rewards,
    tierDelta: 0,
    logs,
  };
}

export function buildUserBattleSeed(
  roster: UserCharacter[],
  inventory: UserEquipment[],
  activeTeam: TeamPreset,
  profileName: string,
  score: number,
  tier: TierName,
): BattleSideSeed {
  const inventoryMap = Object.fromEntries(inventory.map((item) => [item.id, item]));
  const rosterMap = Object.fromEntries(roster.map((character) => [character.id, character]));
  const members = activeTeam.slots
    .map((slot) => {
      const character = slot.characterId ? rosterMap[slot.characterId] : null;
      if (!character) return null;
      const equipmentDefinitionIds = Object.values(character.equipmentIds).map((equipmentId) => (equipmentId ? inventoryMap[equipmentId]?.definitionId : undefined)).filter(Boolean) as string[];
      return { sourceCharacterId: character.id, definitionId: character.definitionId, level: character.level + character.growthRank, slotId: slot.slotId, equipmentDefinitionIds, bonusStats: character.bonusStats };
    })
    .filter(Boolean) as BattleSideSeed['members'];

  return { id: 'current-user', name: profileName, teamName: activeTeam.name, score, tier, members };
}

export function buildRivalBattleSeed(rival: RivalProfile): BattleSideSeed {
  return {
    id: rival.id,
    name: rival.name,
    teamName: rival.teamName,
    score: rival.score,
    tier: rival.tier,
    members: rival.members.map((member, index) => ({
      sourceCharacterId: `${rival.id}-${index}`,
      definitionId: member.definitionId,
      level: member.level,
      slotId: member.slotId,
      equipmentDefinitionIds: member.equipmentDefinitionIds,
    })),
  };
}
