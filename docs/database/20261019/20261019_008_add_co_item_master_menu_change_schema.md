# 20261019_008 공통관리 > 기초정보 > 제품마스터(BSItemMasterView) 메뉴 추가 변경 이력

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-10-19 |
| 대상 DB | songyeon (PostgreSQL) |
| 유형 | 데이터 변경 (스키마 변경 없음) |
| 대상 표 | `tb_menu`, `tb_menu_permission`, `tb_role_menu_permission` (SONGYEON 테넌트) |
| 적용 | 2026-10-19 적용 완료 (트랜잭션 시험 실행 후 적용) |
| 롤백 | `20261019_008_rollback.sql` |

## 내용

- 요청: "BSItemMasteView 화면아이디로 제품마스터라는 화면 만들어줘. 기초정보 화면에 제품 bom 탭이야"
  - 화면ID 철자는 사용자 확인으로 `BSItemMasterView` 로 했다.
  - 제품BOM 탭과 그 탭 전용 파일은 지운다(사용자 결정).
- 추가한 `tb_menu` 한 줄

| 칸 | 값 |
|---|---|
| `menu_code` | `BSItemMasterView` (화면ID) |
| `menu_nm` | 제품마스터 |
| `menu_url` | `/co/master/BSItemMasterView` |
| 부모 | 분류 `master`(이름 '기초정보') |
| `sort_order` | 50 (기초정보 10 · 포장유형 20 · 공통코드 관리 30 · 창고등록 40 다음) |
| `menu_dc` | 비움 |

- 권한 행: 같은 분류의 기초정보(`settings`)와 똑같이 복사했다(`tb_menu_permission` 5행, 역할 0행).

## 영향 범위

- 메뉴판: 기초정보 ▾ 기초정보 · 포장유형 · 공통코드 관리 · 창고등록 · 제품마스터
- 제품 자료는 바뀌지 않는다. 새 화면은 기존 제품BOM API(`/api/v1/co/basic-info/products…`)를 그대로 쓴다.

## 확인

- 한 트랜잭션 안에서 적용 → 다시 적용(같은 결과) → 롤백 스크립트(원래대로) → ROLLBACK 을 했다.
- ROLLBACK 후 메뉴 · 권한 세 표 전체가 시험 전과 같았다.
- 그 뒤 적용했다.
