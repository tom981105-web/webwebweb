import { useState } from 'react';
import { Sparkles, Sword } from 'lucide-react';

import { CHARACTER_DEFINITION_MAP } from '@/data/characters';
import { EQUIPMENT_DEFINITION_MAP } from '@/data/equipment';
import type { UserCharacter, UserEquipment, UserProfile } from '@/types/game';
import { formatEquipmentSlotLabel, formatRarityLabel } from '@/utils/format';
import { SectionCard } from '@/components/SectionCard';

type EquipmentViewProps = {
  roster: UserCharacter[];
  inventory: UserEquipment[];
  selectedCharacterId: string;
  onSelectCharacter: (characterId: string) => void;
  onEquip: (itemId: string, characterId: string) => void;
  onUnequip: (itemId: string) => void;
  onUpgrade: (itemId: string) => void;
  profile: UserProfile;
};

export function EquipmentView({
  roster,
  inventory,
  selectedCharacterId,
  onSelectCharacter,
  onEquip,
  onUnequip,
  onUpgrade,
  profile,
}: EquipmentViewProps) {
  const [slotFilter, setSlotFilter] = useState<'all' | 'weapon' | 'armor' | 'accessory'>('all');
  const selectedCharacter = roster.find((character) => character.id === selectedCharacterId) || roster[0];
  const selectedDefinition = CHARACTER_DEFINITION_MAP[selectedCharacter.definitionId];
  const filteredInventory = inventory.filter((item) => {
    const definition = EQUIPMENT_DEFINITION_MAP[item.definitionId];
    return slotFilter === 'all' || definition.slot === slotFilter;
  });

  return (
    <div className="ap-two-column">
      <SectionCard kicker="Target" title="장착 대상" subtitle="장비를 비교할 캐릭터를 먼저 고르세요.">
        <div className="ap-character-grid ap-compact-cards">
          {roster.map((character) => {
            const definition = CHARACTER_DEFINITION_MAP[character.definitionId];
            return (
              <button
                key={character.id}
                className={`ap-character-card ${selectedCharacter.id === character.id ? 'is-active' : ''}`}
                onClick={() => onSelectCharacter(character.id)}
              >
                <div className="ap-character-art" style={{ background: definition.artAccent }}>
                  <span>{definition.name.slice(0, 1)}</span>
                </div>
                <div>
                  <strong>{definition.name}</strong>
                  <p>
                    Lv.{character.level} · {definition.summary}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="ap-equipment-summary">
          <article className="ap-equip-panel">
            <h3>{selectedDefinition.name} 장착 상태</h3>
            {(['weapon', 'armor', 'accessory'] as const).map((slot) => {
              const itemId = selectedCharacter.equipmentIds[slot];
              const item = itemId ? inventory.find((entry) => entry.id === itemId) : null;
              const definition = item ? EQUIPMENT_DEFINITION_MAP[item.definitionId] : null;
              return (
                <div key={slot} className="ap-equipped-row">
                  <span>{formatEquipmentSlotLabel(slot)}</span>
                  <strong>{definition ? `${definition.name} +${item?.level}` : '미장착'}</strong>
                </div>
              );
            })}
          </article>
          <article className="ap-equip-panel">
            <h3>강화 여유 재화</h3>
            <div className="ap-currency-grid">
              <div className="ap-currency-item">
                <Sword size={16} />
                <span>골드</span>
                <strong>{profile.currencies.gold.toLocaleString('ko-KR')}</strong>
              </div>
              <div className="ap-currency-item">
                <Sparkles size={16} />
                <span>강화 코어</span>
                <strong>{profile.currencies.gearCore.toLocaleString('ko-KR')}</strong>
              </div>
            </div>
          </article>
        </div>
      </SectionCard>

      <SectionCard
        kicker="Inventory"
        title="장비 목록"
        subtitle="정렬/필터/장착/해제/강화를 한 화면에서 처리합니다."
        action={
          <div className="ap-tab-strip">
            {(['all', 'weapon', 'armor', 'accessory'] as const).map((filter) => (
              <button
                key={filter}
                className={`ap-tab-button ${slotFilter === filter ? 'is-active' : ''}`}
                onClick={() => setSlotFilter(filter)}
              >
                {filter === 'all' ? '전체' : formatEquipmentSlotLabel(filter)}
              </button>
            ))}
          </div>
        }
      >
        <div className="ap-equipment-list">
          {filteredInventory.map((item) => {
            const definition = EQUIPMENT_DEFINITION_MAP[item.definitionId];
            const equipped = item.equippedByCharacterId === selectedCharacter.id;
            return (
              <article key={item.id} className="ap-equipment-item">
                <div className="ap-equipment-copy">
                  <div className="ap-inline-line">
                    <strong>{definition.name}</strong>
                    <span className="ap-role-chip">{formatRarityLabel(definition.rarity)}</span>
                  </div>
                  <p>
                    {formatEquipmentSlotLabel(definition.slot)} · {definition.description}
                  </p>
                  <small>
                    +{item.level} / 공격 {definition.statBonuses.attack || 0} · 체력 {definition.statBonuses.hp || 0} · 방어{' '}
                    {definition.statBonuses.defense || 0}
                  </small>
                </div>
                <div className="ap-equipment-actions">
                  {equipped ? (
                    <button className="ap-button" onClick={() => onUnequip(item.id)}>
                      해제
                    </button>
                  ) : (
                    <button className="ap-button ap-button-primary" onClick={() => onEquip(item.id, selectedCharacter.id)}>
                      장착
                    </button>
                  )}
                  <button className="ap-button" onClick={() => onUpgrade(item.id)}>
                    강화
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}
