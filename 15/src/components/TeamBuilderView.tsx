import { ArrowRightLeft, Shield, Sparkles } from 'lucide-react';

import { CHARACTER_DEFINITION_MAP } from '@/data/characters';
import type { TeamAnalysis, TeamPreset, UserCharacter } from '@/types/game';
import { formatRoleLabel } from '@/utils/format';
import { SectionCard } from '@/components/SectionCard';

type TeamBuilderViewProps = {
  activeTeam: TeamPreset;
  roster: UserCharacter[];
  selectedSlotId: TeamPreset['slots'][number]['slotId'];
  onSelectSlot: (slotId: TeamPreset['slots'][number]['slotId']) => void;
  onAssignCharacter: (slotId: TeamPreset['slots'][number]['slotId'], characterId?: string) => void;
  analysis: TeamAnalysis;
};

export function TeamBuilderView({
  activeTeam,
  roster,
  selectedSlotId,
  onSelectSlot,
  onAssignCharacter,
  analysis,
}: TeamBuilderViewProps) {
  const selectedSlot = activeTeam.slots.find((slot) => slot.slotId === selectedSlotId) || activeTeam.slots[0];

  return (
    <div className="ap-two-column">
      <SectionCard kicker="Formation" title="팀 편성" subtitle="전열 3, 후열 2 구성으로 조합과 배치를 실험할 수 있습니다.">
        <div className="ap-formation-board">
          <div className="ap-lane">
            <header>전열</header>
            <div className="ap-lane-slots">
              {activeTeam.slots
                .filter((slot) => slot.slotId.startsWith('front'))
                .map((slot) => {
                  const character = roster.find((item) => item.id === slot.characterId);
                  const definition = character ? CHARACTER_DEFINITION_MAP[character.definitionId] : null;
                  return (
                    <button
                      key={slot.slotId}
                      className={`ap-slot-card ${selectedSlotId === slot.slotId ? 'is-active' : ''}`}
                      onClick={() => onSelectSlot(slot.slotId)}
                    >
                      <span>{slot.slotId.replace('front-', 'F')}</span>
                      <strong>{definition ? definition.name : '비어 있음'}</strong>
                      <small>{definition ? formatRoleLabel(definition.role) : '배치 선택'}</small>
                    </button>
                  );
                })}
            </div>
          </div>
          <div className="ap-lane">
            <header>후열</header>
            <div className="ap-lane-slots">
              {activeTeam.slots
                .filter((slot) => slot.slotId.startsWith('back'))
                .map((slot) => {
                  const character = roster.find((item) => item.id === slot.characterId);
                  const definition = character ? CHARACTER_DEFINITION_MAP[character.definitionId] : null;
                  return (
                    <button
                      key={slot.slotId}
                      className={`ap-slot-card ${selectedSlotId === slot.slotId ? 'is-active' : ''}`}
                      onClick={() => onSelectSlot(slot.slotId)}
                    >
                      <span>{slot.slotId.replace('back-', 'B')}</span>
                      <strong>{definition ? definition.name : '비어 있음'}</strong>
                      <small>{definition ? formatRoleLabel(definition.role) : '배치 선택'}</small>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>

        <div className="ap-analysis-box">
          <div className="ap-metric-grid">
            <div className="ap-metric-item">
              <Shield size={18} />
              <span>팀 전투력</span>
              <strong>{analysis.power.toLocaleString('ko-KR')}</strong>
            </div>
            <div className="ap-metric-item">
              <Sparkles size={18} />
              <span>활성 시너지</span>
              <strong>{analysis.notes.length}개</strong>
            </div>
            <div className="ap-metric-item">
              <ArrowRightLeft size={18} />
              <span>보완 필요</span>
              <strong>{analysis.missingRoles.length ? analysis.missingRoles.join(', ') : '없음'}</strong>
            </div>
          </div>
          <ul className="ap-compact-list">
            {analysis.notes.map((note) => (
              <li key={note}>
                <Sparkles size={16} />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>
      </SectionCard>

      <SectionCard kicker="Assign" title={`${selectedSlot.slotId}에 배치할 캐릭터`} subtitle="클릭만으로 교체됩니다. 이미 배치된 캐릭터를 선택하면 자동으로 이동합니다.">
        <div className="ap-team-roster">
          <button className="ap-growth-item ap-empty-action" onClick={() => onAssignCharacter(selectedSlot.slotId, undefined)}>
            현재 슬롯 비우기
          </button>
          {roster.map((character) => {
            const definition = CHARACTER_DEFINITION_MAP[character.definitionId];
            return (
              <button key={character.id} className="ap-growth-item" onClick={() => onAssignCharacter(selectedSlot.slotId, character.id)}>
                <div className="ap-mini-avatar" style={{ background: definition.artAccent }}>
                  {definition.name.slice(0, 1)}
                </div>
                <div>
                  <strong>{definition.name}</strong>
                  <span>
                    {formatRoleLabel(definition.role)} · Lv.{character.level} · 성장 {character.growthRank}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}
