# 20261016_006 공통관리 모듈 코드 · 주소 cm → co 변경 이력

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-10-16 |
| 대상 DB | songyeon (PostgreSQL) |
| 유형 | 데이터 변경 (스키마 변경 없음) |
| 대상 표 | `tb_module`, `tb_menu` (SONGYEON 테넌트, 공통관리) |
| 적용 | 2026-10-16 적용 완료 (트랜잭션 시험 실행 후 적용) |
| 롤백 | `20261016_006_rollback.sql` (코드도 함께 되돌려야 한다) |

## 내용

- 공통관리를 S_ERP 기준정보 모듈처럼 `co` 로 바꿨다.
  - `tb_module`: `module_code` CM → CO, `module_url` `/cm` → `/co`
  - `tb_menu`: 공통관리 메뉴 주소 6줄

| 메뉴 | 전 | 후 |
|---|---|---|
| 기초정보(분류) | `/cm/master` | `/co/master` |
| 생산스케줄 | `/cm/production` | `/co/production` |
| 물류스케줄 | `/cm/logistics` | `/co/logistics` |
| 기초정보 | `/cm/master/settings` | `/co/master/settings` |
| 포장유형 | `/cm/master/BSBoxTypeView` | `/co/master/BSBoxTypeView` |
| 공통코드 관리 | `/cm/master/cmncodes` | `/co/master/cmncodes` |

- 이름 · 순서 · 설명 · `menu_id` · `module_id` · 권한 행은 그대로다.
- `CO` 코드가 이미 있으면 바꾸지 않는다. 적용 전 확인: 0건
- 같은 날 코드도 함께 옮겼다.
  - 백엔드 패키지 `egovframework.let.cm.*` → `egovframework.let.co.*`
  - 매퍼 `mapper/let/cm` → `mapper/let/co`
  - API `/api/v1/cm/...` → `/api/v1/co/...`
  - 프론트 `pages/cm` → `pages/co`

## 영향 범위

- 옛 주소 `/cm/...`(화면) · `/api/v1/cm/...`(API)는 없어진다(404).
- DB 의 글자 칸 전체를 훑었다(값은 찍지 않았다). 옛 주소가 저장된 곳은 이 메뉴 주소 6줄뿐이었다. 첨부파일 주소 등은 DB 에 저장돼 있지 않다.
- 브라우저 '최근 사용' 에 남은 옛 주소는 메뉴에서 새로 들어가면 된다.

## 확인

- 한 트랜잭션 안에서 적용 → 다시 적용(같은 결과) → 롤백 스크립트(원래대로) → ROLLBACK 을 했다.
- ROLLBACK 후 메뉴 · 권한 · 모듈이 시험 전과 같았다.
- 그 뒤 적용했다.
