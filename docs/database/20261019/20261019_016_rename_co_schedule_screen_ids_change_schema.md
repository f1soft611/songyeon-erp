# 20261019_016 스케줄관리 화면ID 변경 이력

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-10-19 |
| 대상 DB | songyeon (PostgreSQL) |
| 유형 | 데이터 변경 (스키마 변경 없음) |
| 대상 표 | `tb_menu` (SONGYEON 테넌트) |
| 적용 | 2026-10-19 적용 완료 (트랜잭션 시험 실행 후 적용) |
| 롤백 | `20261019_016_rollback.sql` |

## 내용

- 요청: "생산, 물류스케줄 화면명도 기초정보처럼 맞추고 싶은데 SC로 시작해야 하나" → "SCProductionScheduleView, SCLogisticsScheduleView 이렇게 바꾸고 구조도 동일하게"
- 화면ID 규칙: 분류 글자 + 화면 뜻(영어) + View
  - 기초정보 = `BS`, 스케줄관리 = `SC`

| 화면 | menu_code | menu_url |
|---|---|---|
| 생산스케줄 | `production` → `SCProductionScheduleView` | `/co/schedule/production` → `/co/schedule/SCProductionScheduleView` |
| 물류스케줄 | `logistics` → `SCLogisticsScheduleView` | `/co/schedule/logistics` → `/co/schedule/SCLogisticsScheduleView` |

- 메뉴 번호 · 이름 · 순서 · 권한 행은 그대로다.

## 영향 범위

- 화면 키(`DashboardContent.tsx`)를 새 화면ID 로 바꿨다. 옛 주소는 '페이지 없음'이 나온다.
- 현장 TV 화면(`/tv/production` · `/tv/logistics`)은 메뉴가 아니라 그대로다.

## 확인

- 한 트랜잭션 안에서 아래를 했다.
  1. 적용 → 다시 적용(같음)
  2. 롤백 스크립트(원래대로)
  3. ROLLBACK
- ROLLBACK 뒤 DB 는 그대로였다. 그 뒤 적용했다.
