# 확률조작게임

장기 운영형 성장 게임 프로토타입입니다. 플레이어는 확률을 조작하는 공방의 운영자가 되어 강화, 연구, 제작, 분해, 원정, 시설 성장, 자동화, 도감/업적, 시즌 목표를 하나의 루프로 키워 갑니다.

## 폴더 구조

```text
16
├─ dist
├─ src
│  ├─ app
│  ├─ components
│  │  ├─ panels
│  │  └─ ui
│  ├─ config
│  ├─ data
│  ├─ game
│  ├─ hooks
│  ├─ store
│  ├─ styles
│  ├─ types
│  └─ utils
├─ index.html
├─ package.json
├─ tailwind.config.ts
├─ tsconfig.json
└─ vite.config.ts
```

## 핵심 시스템

- 계정 영구 성장: 계정 레벨, XP, 명성, 최고 기록, 통계, 칭호, 영구 보너스
- 공방 운영: 강화실, 연구실, 분해실, 제작실, 보관고, 원정 관제실, 자동화 라인
- 장비 시스템: 무기, 방어구, 보조장치, 아티팩트, 공방 코어, 유물 장비
- 확률 조작: 일반, 안정, 집중, 난수폭주, 누적보정, 역전보정, 보호특화, 자동화 제어
- 강화 리스크: 단계 하락, 내구도 감소, 과열, 강화 차단
- 원정 루프: 다수 지역, 지역 고유 재료/드랍/이벤트
- 제작 생태계: 아이템 제작, 장비 제작, 분해, 재조합
- 연구 트리: 강화공학, 보호공학, 확률역학, 자동화기술, 원정학, 유물복원학, 상점교섭학
- 일일/주간/시즌 목표: 미션 보상과 시즌 통화 구조
- 자동화: 자동 강화, 자동 분해, 자동 제작, 자동 원정, 오프라인 보상

## 저장 구조

- `localStorage` 저장 키: `probability_forge_save_v1`
- 저장 버전: `src/config/balance.ts`
- 마이그레이션 진입점: `src/game/migrations.ts`
- 저장/불러오기/초기화/문자열 내보내기: `src/game/save.ts`, `src/store/useGameStore.ts`

## 서버 확장 포인트

- 현재는 프론트 단독 실행이지만 저장 상태는 `GameSaveState` 기준으로 분리돼 있어 API 이관이 쉽습니다.
- 추천 서버 API 분리 지점
  - 계정/인벤토리 저장: `store/useGameStore.ts`
  - 원정 처리: `game/researchExpedition.ts`
  - 강화 처리: `game/enhancement.ts`
  - 제작/분해 처리: `game/crafting.ts`
  - 시즌 보상 및 랭킹: `data/missions.ts`, `store/useGameStore.ts`
- 서버 이관 시 우선 고정할 값
  - 장비 인스턴스 생성 시드
  - 강화 결과 판정
  - 원정 보상 판정
  - 시즌 통화 적립/보상 수령

## 시즌 확장 포인트

- 시즌 미션 정의: `src/data/missions.ts`
- 시즌 보상 정의: `src/data/missions.ts`
- 시즌 상태 저장: `GameSaveState.season`
- 향후 확장 예시
  - 시즌 전용 장비 템플릿 추가
  - 시즌 전용 지역과 시즌 재화 추가
  - 시즌 리셋 시 유지/초기화 규칙 분리
  - 시즌 랭킹, 시즌 칭호, 시즌 도감 추가

## 밸런스 수정 포인트

- 기본 수치와 공식: `src/config/balance.ts`
- 장비/세트/아이템/시설/연구/원정/레시피 데이터: `src/data/*`
- 강화 확률/리스크 계산: `src/game/calculations.ts`
- 강화 실제 처리: `src/game/enhancement.ts`
- 자동화 주기와 오프라인 보상: `src/game/automation.ts`

## 실행

```bash
npm install
npm run dev
```

## 빌드

```bash
npm run build
```
