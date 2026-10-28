# 20261016_003 공통관리 기준정보 분류 코드 · 주소 standard → master 변경 이력

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-10-16 |
| 대상 DB | songyeon (PostgreSQL) |
| 유형 | 데이터 변경 (스키마 변경 없음) |
| 대상 표 | `tb_menu` (SONGYEON 테넌트, 공통관리 모듈 `CM`) |
| 적용 | 2026-10-16 적용 완료 (트랜잭션 시험 실행 후 적용) |
| 롤백 | `20261016_003_rollback.sql` |
| 앞선 작업 | `20261016_001` (분류 추가) · `20261016_002` (포장유형 화면) |

## 내용

- S_ERP 의 기준정보 분류 주소(`/co/master/...`, 예: `/co/master/cmncodes`)와 같게 이름을 맞췄다.

| 줄 | 전 | 후 |
|---|---|---|
| 기준정보(분류) | `standard`, `/cm/standard` | `master`, `/cm/master` |
| 기초정보 | `/cm/standard/settings` | `/cm/master/settings` |
| 포장유형 | `/cm/standard/BSBoxTypeView` | `/cm/master/BSBoxTypeView` |

- 그대로 둔 것: 이름 · 순서 · 설명 · `menu_id` · 권한 행
- 화면 키(주소 마지막 칸 `settings` · `BSBoxTypeView`)가 그대로라 화면 연결도 그대로다.
- 이미 `master` 코드가 있으면 바꾸지 않는다(겹침 방지). 적용 전 확인: 0건

## 영향 범위

- `/cm/standard/...` 옛 주소는 '페이지를 찾을 수 없습니다' 가 된다.
- 코드 안의 링크 두 곳(세금계산서 · 온도모니터링의 서버관리 안내)은 `/cm/master/settings` 로 바꿨다.

## 확인

- 한 트랜잭션 안에서 적용 → 다시 적용(같은 결과) → 롤백 스크립트(원래대로) → ROLLBACK 을 했다.
- ROLLBACK 후 `tb_menu` · `tb_menu_permission` · `tb_role_menu_permission` 전체가 시험 전과 같았다.
- 그 뒤 적용했다. 적용 후 공통관리: 기준정보 `/cm/master` #1 · 생산스케줄 #2 · 물류스케줄 #3 · 기초정보 `/cm/master/settings` #10 · 포장유형 `/cm/master/BSBoxTypeView` #20
