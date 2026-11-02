# 20261030_001 생산관리 중분류 변경 이력

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-10-30 |
| 대상 DB | songyeon (PostgreSQL) |
| 유형 | 메뉴 데이터 변경(중분류 3행 추가, 화면 4행의 화면ID · 주소 · 부모 · 순서) |
| 대상 표 | `tb_menu`(추가 3행 · 수정 4행) |
| 적용 | 2026-10-30 적용 완료 (트랜잭션 시험 실행: 다시 적용해도 같음, 롤백하면 처음과 같음, 권한 행 그대로 확인 후 적용) |
| 롤백 | `20261030_001_rollback.sql` |

## 내용

- 요청: "생산관리쪽 메뉴도 안에 중분류 있었으면 좋게는데". 사용자 결정은 중분류 3개, 그리고 영업관리처럼 폴더 · API · 화면ID 까지 맞추는 것.
- 모듈: `PD /pd` 그대로. S_ERP 에 생산관리 모듈이 없어 주소를 바꾸지 않았다.
- 중분류: 권한 행이 없고, 영업관리 · 기준정보 중분류와 같은 모양이다.

  | 순서 | menu_code | 이름 | 주소 |
  |---|---|---|---|
  | 1 | `PD_PLAN` | 생산계획 | `/pd/plan` |
  | 2 | `PD_RESULT` | 생산실적 | `/pd/result` |
  | 3 | `PD_LABEL` | 라벨관리 | `/pd/label` |

- 화면ID: 분류 글자 + 화면 뜻 + View. 영업관리 `PM…View` · `OM…View`, 기준정보 `BS…View` 와 같은 규칙이다.

  | 중분류 | 예전 | 새 화면ID · 주소 | 순서 |
  |---|---|---|---|
  | 생산계획(PP) | `prod-confirm` | `PPProdConfirmView` · `/pd/plan/PPProdConfirmView` | 10 |
  | 생산실적(PR) | `actual` | `PRProdActualView` · `/pd/result/PRProdActualView` | 10 |
  | 생산실적(PR) | `prod-status` | `PRProdStatusView` · `/pd/result/PRProdStatusView` | 20 |
  | 라벨관리(LB) | `label-print` | `LBLabelPrintView` · `/pd/label/LBLabelPrintView` | 10 |

- 메뉴 번호 · 이름 · 권한 행(`tb_menu_permission` · `tb_role_menu_permission`)은 그대로다.

## 같이 바뀐 코드(폴더 구조 = 메뉴 구조)

| 화면 | 프론트 폴더 | 백엔드 패키지 · 매퍼 | API |
|---|---|---|---|
| 생산확정 | `pages/pd/plan/prod-confirm` | `let/pd/plan/prodconfirm` | `/api/v1/pd/plan/prod-confirm` |
| 생산입고 | `pages/pd/result/prod-actual` | `let/pd/result/prodactual` | `/api/v1/pd/result/prod-actual` |
| 생산현황 | `pages/pd/result/prod-status` | `let/pd/result/prodstatus` | `/api/v1/pd/result/prod-status` |
| 라벨출력 | `pages/pd/label/label-print` | `let/pd/label/labelprint` | `/api/v1/pd/label/label-print` |

## 영향 범위

- 화면(`DashboardContent`)은 모듈 `pd` 와 위 화면ID 로 화면을 고른다.
  - 이 스크립트를 적용하지 않으면 새 화면 코드에서 생산관리 화면이 열리지 않는다.
  - 반대로 적용하면 예전 화면 코드에서 생산관리 화면이 열리지 않는다.
- API 주소가 바뀌어 프론트(Vercel)와 백엔드(war)를 같이 올려야 한다. 예전 프론트는 새 백엔드에서, 새 프론트는 예전 백엔드에서 생산관리 API 를 부를 수 없다.
- 그래서 DB 적용 · war 배포 · 프론트 배포를 한 번에 한다.
- 브라우저에 남은 예전 주소(최근 사용 · 즐겨찾기의 `/pd/prod-confirm` 등)는 열리지 않는다. 메뉴에서 다시 열면 된다.
- 롤백하면 중분류 3행을 지우고 화면을 모듈 바로 아래(예전 화면 키 · 주소 · 순서)로 돌린다. 화면 · 서버 코드도 함께 돌려야 한다.
