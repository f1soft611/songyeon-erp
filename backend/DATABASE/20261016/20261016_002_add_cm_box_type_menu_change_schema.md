# 20261016_002 공통관리 > 기준정보 > 포장유형(BSBoxTypeView) 메뉴 추가 변경 이력

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-10-16 |
| 대상 DB | songyeon (PostgreSQL) |
| 유형 | 데이터 변경 (스키마 변경 없음) |
| 대상 표 | `tb_menu`, `tb_menu_permission`, `tb_role_menu_permission` (SONGYEON 테넌트) |
| 적용 | 2026-10-16 적용 완료 (트랜잭션 시험 실행 후 적용) |
| 롤백 | `20261016_002_rollback.sql` |
| 앞선 작업 | `20261016_001` (분류 '기준정보' `standard`) |

## 내용

- 기초정보의 '포장유형' 탭을 화면으로 뺐다. 그 화면의 메뉴를 추가했다.
  - 위치: 공통관리 > 기준정보 > 포장유형
- 추가한 `tb_menu` 한 줄

| 칸 | 값 |
|---|---|
| `menu_code` | `BSBoxTypeView` (화면ID) |
| `menu_nm` | 포장유형 |
| `menu_url` | `/cm/standard/BSBoxTypeView` (마지막 칸이 화면 키) |
| 부모 | 기준정보 (`standard`) |
| `sort_order` | 20 (기초정보 10 다음) |
| `menu_dc` | 포장유형별 고정값 관리 |

- 권한 행: 같은 표를 다루던 기초정보(`settings`)와 똑같이 복사했다.
  - `tb_menu_permission`: 5행 (READ · CREATE · UPDATE · DELETE · EXCEL)
  - `tb_role_menu_permission`: 기초정보와 같게(지금 0행)
- 기초정보 설명(`menu_dc`)에서 포장유형을 뺐다(탭이 없어졌다).
  - 전: '포장유형별 고정값, 확정 제품의 배합비(BOM) 관리'
  - 후: '확정 제품의 배합비(BOM) 관리'
  - 전 값이 그대로일 때만 바꾼다.

## 영향 범위

- 메뉴판: 기준정보 아래 기초정보 · 포장유형
- 포장유형 자료(`packaging_types` 등)와 API 는 바뀌지 않는다. 같은 API 를 새 화면이 부른다.
- 기초정보 화면의 탭에서 포장유형이 빠진다. 첫 탭은 포장방법이다(프론트 변경).

## 확인

- 한 트랜잭션 안에서 다음을 차례로 했다.
  1. 적용: 포장유형 #20, 권한 5 · 0, 기초정보 설명 바뀜
  2. 다시 적용: 같은 결과
  3. 롤백 스크립트: 원래대로
  4. ROLLBACK
- ROLLBACK 후 `tb_menu` · `tb_menu_permission` · `tb_role_menu_permission` 전체가 시험 전과 같았다.
- 그 뒤 적용했다.
