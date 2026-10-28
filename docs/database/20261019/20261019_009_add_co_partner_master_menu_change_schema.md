# 20261019_009 공통관리 > 기초정보 > 거래처마스터(BSPartnerMasterView) 메뉴 추가 변경 이력

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-10-19 |
| 대상 DB | songyeon (PostgreSQL) |
| 유형 | 데이터 변경 (스키마 변경 없음) |
| 대상 표 | `tb_menu`, `tb_menu_permission`, `tb_role_menu_permission` (SONGYEON 테넌트) |
| 적용 | 2026-10-19 적용 완료 (트랜잭션 시험 실행 후 적용) |
| 롤백 | `20261019_009_rollback.sql` |

## 내용

- 요청: "BSPartnerMasterView 거래처마스터로 거래처BOM 화면 옮겨줘. 근데 조회 조건에 분류도 추가해줘"
  - 거래처BOM 탭과 그 파일(화면 · API · 서버)은 새 화면 쪽으로 옮기고 탭은 지웠다.
- 추가한 `tb_menu` 한 줄

| 칸 | 값 |
|---|---|
| `menu_code` | `BSPartnerMasterView` (화면ID) |
| `menu_nm` | 거래처마스터 |
| `menu_url` | `/co/master/BSPartnerMasterView` |
| 부모 | 분류 `master`(이름 '기초정보') |
| `sort_order` | 60 (… 창고등록 40 · 제품마스터 50 다음) |
| `menu_dc` | 비움 |

- 권한 행: 같은 분류의 기초정보(`settings`)와 똑같이 복사했다(`tb_menu_permission` 5행, 역할 0행).

## 영향 범위

- 메뉴판: 기초정보 ▾ 기초정보 · 포장유형 · 공통코드 관리 · 창고등록 · 제품마스터 · 거래처마스터
- 거래처 자료(`clients`)는 바뀌지 않는다. API 는 `/api/v1/co/basic-info/client-master` 에서 `/api/v1/co/master/partner-master` 로 옮겼다.

## 확인

- 한 트랜잭션 안에서 적용 → 다시 적용(같은 결과) → 롤백 스크립트(원래대로) → ROLLBACK 을 했다.
- ROLLBACK 후 메뉴 · 권한 세 표 전체가 시험 전과 같았다.
- 그 뒤 적용했다.
