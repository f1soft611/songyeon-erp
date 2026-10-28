# 20261019_013 공통관리 > 기초정보 > 기초정보(settings) 메뉴 삭제 변경 이력

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-10-19 |
| 대상 DB | songyeon (PostgreSQL) |
| 유형 | 데이터 변경 (스키마 변경 없음, 백업 표 3개 추가) |
| 대상 표 | `tb_menu`, `tb_menu_permission`, `tb_role_menu_permission` (SONGYEON 테넌트) |
| 적용 | 2026-10-19 적용 완료 (012 와 함께 트랜잭션 시험 실행 후 적용) |
| 롤백 | `20261019_013_rollback.sql` |

## 내용

- 요청: "부자재 만들어주고 기초정보 화면 없애. 서버관리 필요없어"
- 지운 메뉴: 분류 '기초정보'(`master`) 아래 '기초정보'(`menu_code = 'settings'`, 송연 CM0001)
  - 메뉴 1행, `tb_menu_permission` 5행, `tb_role_menu_permission` 0행
  - 하위 메뉴 없음, 게시판 종류(`tb_board_type`)가 가리키는 곳 없음
- 탭은 모두 화면으로 뺐다.
  - 포장유형(`BSBoxTypeView`), 창고등록(`BSWarehouseView`)
  - 제품마스터(`BSItemMasterView`), 거래처마스터(`BSPartnerMasterView`), 거래처별 제품조회(`BSPartnerItemView`)
  - 원재료마스터(`BSMaterialMasterView`), 부자재마스터(`BSSubMaterialMasterView`)
- 포장방법 · 차량정보 탭은 앞서 지웠고, 서버관리 탭은 쓰지 않기로 했다.
- 지우기 전 행은 백업 표에 남긴다(같은 번호로 되살릴 수 있게).
  - `bak_20261019_013_menu`
  - `bak_20261019_013_menu_permission`
  - `bak_20261019_013_role_menu_permission`

## 영향 범위

- 메뉴판: 기초정보 ▾ 포장유형 · 공통코드 관리 · 창고등록 · 제품마스터 · 거래처마스터 · 거래처별 제품조회 · 원재료마스터 · 부자재마스터
- `004` · `008` ~ `012` 메뉴 스크립트는 이 메뉴의 권한 행을 복사한다.
  - 새 DB 에 다시 돌릴 때는 그 파일들을 이 파일보다 먼저 돌린다.
  - 이미 만든 메뉴의 권한 행은 그대로 있다.
- 서버관리 값 표(`external_api_settings`)는 그대로다. 세금계산서(팝빌) · 온도관리(라디오노드)가 계속 읽는다.
  - 화면 · 수정 API 가 없어져서 키 · 주소를 바꾸려면 DB 에서 직접 고쳐야 한다.

## 확인

- 한 트랜잭션 안에서 아래를 차례로 했다.
  1. 012 → 013 적용 → 다시 적용(같은 결과)
  2. 롤백 스크립트(013 → 012): 메뉴 · 권한 세 표 전체가 원래와 같음
  3. ROLLBACK
- ROLLBACK 후 DB 는 시험 전과 같았다. 그 뒤 적용했다.
