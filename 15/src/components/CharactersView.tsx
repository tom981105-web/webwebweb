import { Heart, Shield, Sparkles, Swords, Wind } from 'lucide-react';

import { CHARACTER_DEFINITION_MAP } from '@/data/characters';
import type { UserCharacter, UserProfile } from '@/types/game';
import { formatPercent, formatRoleLabel } from '@/utils/format';
import { SectionCard } from '@/components/SectionCard';

type CharactersViewProps = {
  roster: UserCharacter[];
  selectedCharacterId: string;
  onSelectCharacter: (characterId: string) => void;
  onGrowCharacter: (characterId: string) => void;
  profile: UserProfile;
};

export function CharactersView({
  roster,
  selectedCharacterId,
  onSelectCharacter,
  onGrowCharacter,
  profile,
}: CharactersViewProps) {
  const selected = roster.find((character) => character.id === selectedCharacterId) || roster[0];
  const definition = CHARACTER_DEFINITION_MAP[selected.definitionId];

  return (
    <div className="ap-two-column">
      <SectionCard kicker="Roster" title="캐릭터 목록" subtitle="역할군과 성장 상태를 한 번에 비교할 수 있습니다.">
        <div className="ap-character-grid">
          {roster.map((character) => {
            const characterDefinition = CHARACTER_DEFINITION_MAP[character.definitionId];
            const selectedState = character.id === selected.id;
            return (
              <button
                key={character.id}
                className={`ap-character-card ${selectedState ? 'is-active' : ''}`}
                onClick={() => onSelectCharacter(character.id)}
              >
                <div className="ap-character-art" style={{ background: characterDefinition.artAccent }}>
                  <span>{characterDefinition.name.slice(0, 1)}</span>
                </div>
                <div>
                  <div className="ap-inline-line">
                    <strong>{characterDefinition.name}</strong>
                    <span className="ap-role-chip">{formatRoleLabel(characterDefinition.role)}</span>
                  </div>
                  <p>{characterDefinition.epithet}</p>
                  <span>Lv.{character.level} / 성장 {character.growthRank}</span>
                </div>
              </button>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard
        kicker="Detail"
        title={`${definition.name} 상세`}
        subtitle={definition.summary}
        action={
          <button className="ap-button ap-button-primary" onClick={() => onGrowCharacter(selected.id)}>
            성장하기
          </button>
        }
      >
        <div className="ap-detail-hero">
          <div className="ap-detail-avatar" style={{ background: definition.artAccent }}>
            {definition.name}
          </div>
          <div className="ap-detail-copy">
            <p>{definition.epithet}</p>
            <strong>{formatRoleLabel(definition.role)}</strong>
            <span>
              Lv.{selected.level} / 성장 랭크 {selected.growthRank} / 승률{' '}
              {formatPercent(selected.battles > 0 ? (selected.wins / selected.battles) * 100 : 0, 1)}
            </span>
            <div className="ap-inline-note">
              성장 비용은 골드와 성장 재료를 함께 사용합니다. 현재 보유: 골드 {profile.currencies.gold.toLocaleString('ko-KR')} / 재료{' '}
              {profile.currencies.growth.toLocaleString('ko-KR')}
            </div>
          </div>
        </div>

        <div className="ap-stat-grid">
          <div className="ap-stat-item">
            <Heart size={18} />
            <span>HP</span>
            <strong>{definition.baseStats.hp + selected.level * 34}</strong>
          </div>
          <div className="ap-stat-item">
            <Swords size={18} />
            <span>공격력</span>
            <strong>{definition.baseStats.attack + selected.level * 5}</strong>
          </div>
          <div className="ap-stat-item">
            <Shield size={18} />
            <span>방어력</span>
            <strong>{definition.baseStats.defense + selected.level * 3}</strong>
          </div>
          <div className="ap-stat-item">
            <Wind size={18} />
            <span>속도</span>
            <strong>{definition.baseStats.speed + Math.floor(selected.level / 4)}</strong>
          </div>
          <div className="ap-stat-item">
            <Sparkles size={18} />
            <span>치명타</span>
            <strong>{definition.baseStats.critRate}%</strong>
          </div>
          <div className="ap-stat-item">
            <Sparkles size={18} />
            <span>저항</span>
            <strong>{definition.baseStats.resistance}%</strong>
          </div>
        </div>

        <div className="ap-skill-block">
          <article className="ap-skill-card">
            <h3>패시브 · {definition.passive.name}</h3>
            <p>{definition.passive.description}</p>
          </article>
          {definition.activeSkills.map((skill) => (
            <article key={skill.id} className="ap-skill-card">
              <h3>
                액티브 · {skill.name} <span>CD {skill.cooldown}</span>
              </h3>
              <p>{skill.description}</p>
            </article>
          ))}
          <article className="ap-skill-card is-ultimate">
            <h3>
              궁극기 · {definition.ultimate.name} <span>CD {definition.ultimate.cooldown}</span>
            </h3>
            <p>{definition.ultimate.description}</p>
          </article>
        </div>
      </SectionCard>
    </div>
  );
}
