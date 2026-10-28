# 20261019_012 공통관리 > 기초정보 > 부자재마스터(BSSubMaterialMasterView) 메뉴 추가 변경 이력

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-10-19 |
| 대상 DB | songyeon (PostgreSQL) |
| 유형 | 데이터 변경 (스키마 변경 없음) |
| 대상 표 | `tb_menu`, `tb_menu_permission`, `tb_role_menu_permission` (SONGYEON 테넌트) |
| 적용 | 2026-10-19 적용 완료 (트랜잭션 시험 실행 후 적용) |
| 롤백 | `20261019_012_rollback.sql` |

## 내용

- 요청: "부자재BOM 도 부자재마스터로 따로 뺄 건데 아이디 골라줘" → `BSSubMaterialMasterView`, "부자재 만들어주고 기초정보 화면 없애. 서버관리 필요없어"
  - 탭 전용 그리드는 새 화면 쪽으로 옮겼다. 기초정보 화면(메뉴 `settings`)은 `20261019_013` 에서 지운다.
- 추가한 `tb_menu` 한 줄

| 칸 | 값 |
|---|---|
| `menu_code` | `BSSubMaterialMasterView` (화면ID) |
| `menu_nm` | 부자재마스터 |
| `menu_url` | `/co/master/BSSubMaterialMasterView` |
| 부모 | 분류 `master`(이름 '기초정보') |
| `sort_order` | 90 (… 거래처별 제품조회 70 · 원재료마스터 80 다음) |
| `menu_dc` | 비움 |

- 권한 행: 같은 분류의 기초정보(`settings`)와 똑같이 복사했다(`tb_menu_permission` 5행, 역할 0행).

## 영향 범위

- 메뉴판(013 뒤): 기초정보 ▾ 포장유형 · 공통코드 관리 · 창고등록 · 제품마스터 · 거래처마스터 · 거래처별 제품조회 · 원재료마스터 · 부자재마스터
- 자료는 바뀌지 않는다. 새 화면은 기존 부자재 API(`/api/v1/co/basic-info/sub-material-master`)를 그대로 쓴다.

## 확인

- 한 트랜잭션 안에서 적용 → 다시 적용(같은 결과) → 롤백 스크립트(원래대로) → ROLLBACK 을 했다.
- ROLLBACK 후 메뉴 · 권한 세 표 전체가 시험 전과 같았다.
- 그 뒤 적용했다.
