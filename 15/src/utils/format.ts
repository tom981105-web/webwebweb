import { EQUIPMENT_SLOT_LABELS, RARITY_LABELS, ROLE_LABELS, TIER_RULES } from '@/config/gameConfig';
import type { EquipmentSlot, Rarity, StatBlock, TierName } from '@/types/game';

export function formatNumber(value: number) {
  return Math.round(value).toLocaleString('ko-KR');
}

export function formatPercent(value: number, digits = 0) {
  return `${value.toFixed(digits)}%`;
}

export function getDayKey(timestamp: number) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getWeekKey(timestamp: number) {
  const date = new Date(timestamp);
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = copy.getDay() || 7;
  copy.setDate(copy.getDate() - day + 1);
  return getDayKey(copy.getTime());
}

export function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatDuration(ms: number) {
  const minutes = Math.max(0, Math.floor(ms / 60000));
  const hours = Math.floor(minutes / 60);
  const remainMinutes = minutes % 60;
  if (hours > 0) {
    return `${hours}시간 ${remainMinutes}분`;
  }
  return `${remainMinutes}분`;
}

export function getTierFromScore(score: number): TierName {
  const sorted = [...TIER_RULES].sort((left, right) => right.minScore - left.minScore);
  const found = sorted.find((rule) => score >= rule.minScore);
  return (found?.tier || 'Bronze') as TierName;
}

export function getTierAccent(score: number) {
  const tier = getTierFromScore(score);
  return TIER_RULES.find((rule) => rule.tier === tier)?.accent || '#f4c971';
}

export function formatRoleLabel(role: keyof typeof ROLE_LABELS) {
  return ROLE_LABELS[role];
}

export function formatRarityLabel(rarity: Rarity) {
  return RARITY_LABELS[rarity];
}

export function formatEquipmentSlotLabel(slot: EquipmentSlot) {
  return EQUIPMENT_SLOT_LABELS[slot];
}

export function sumStats(stats: Partial<StatBlock>) {
  return Object.values(stats).reduce((total, value) => total + Number(value || 0), 0);
}
