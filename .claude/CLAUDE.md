# Travel Planner Harness

여행 계획의 목적지분석→일정→숙소→예산→현지정보를 에이전트 팀이 협업하여 생성하는 하네스.

## 구조

```
travel-planner/
├── .claude/
│   ├── agents/
│   │   ├── destination-analyst.md  — 목적지 분석 (관광지, 계절, 비자, 안전정보)
│   │   ├── itinerary-designer.md   — 일정 설계 (일별 코스, 동선, 시간 배분)
│   │   ├── budget-manager.md       — 예산 관리 (항공, 숙소, 식비, 교통, 기타)
│   │   └── local-guide.md          — 현지 정보 (교통, 맛집, 문화, 긴급연락처)
│   ├── skills/
│   │   ├── travel-planner/
│   │   │   └── skill.md            — 오케스트레이터 (팀 조율, 워크플로우, 에러핸들링)
│   │   ├── route-optimizer/
│   │   │   └── skill.md            — 동선 최적화 (itinerary-designer용)
│   │   └── budget-calculator/
│   │       └── skill.md            — 여행 예산 계산기 (budget-manager용)
│   └── CLAUDE.md                   — 이 파일
└── trips/
    └── <trip-name>/                — 여행별 산출물 격리 폴더
        ├── 00_input.md
        ├── 01_destination_analysis.md
        ├── 02_itinerary.md
        ├── 03_accommodation.md     (당일치기는 생략)
        ├── 04_budget.md
        ├── 05_local_guide.md
        ├── web/                    (선택 — 정적 뷰어)
        └── screenshots/            (선택)
```

## 사용법

`/travel-planner` 스킬을 트리거하거나, "여행 계획 짜줘" 같은 자연어로 요청한다.

## 산출물

모든 산출물은 `trips/<trip-name>/` 디렉토리에 저장된다. `<trip-name>`은 `YYYY-MM-<목적지슬러그>` 형식이다 (예: `2026-04-everland`, `2026-07-tokyo`):

- `00_input.md` — 사용자 입력 정리
- `01_destination_analysis.md` — 목적지 분석 보고서
- `02_itinerary.md` — 일정표
- `03_accommodation.md` — 숙소 가이드 (당일치기는 생략)
- `04_budget.md` — 예산 계획서
- `05_local_guide.md` — 현지 정보 가이드

이전 여행은 같은 `trips/` 아래 각자의 폴더에 그대로 보관된다.
