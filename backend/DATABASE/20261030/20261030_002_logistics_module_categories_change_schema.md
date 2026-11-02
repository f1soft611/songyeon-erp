# 20261030_002 물류관리 중분류 변경 이력

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-10-30 |
| 대상 DB | songyeon (PostgreSQL) |
| 유형 | 메뉴 데이터 변경(중분류 2행 추가, 화면 3행의 화면ID · 주소 · 부모 · 순서) |
| 대상 표 | `tb_menu`(추가 2행 · 수정 3행) |
| 적용 | 2026-10-30 적용 완료 (트랜잭션 시험 실행: 다시 적용해도 같음, 롤백하면 처음과 같음, 권한 행 그대로 확인 후 적용) |
| 롤백 | `20261030_002_rollback.sql` |

## 내용

- 요청: "물류관리 도 중분류 필요해". 사용자 결정은 재고관리 / 출고관리 두 중분류, 그리고 생산관리처럼 폴더 · API · 화면ID 까지 맞추고 표준 구조로 정리하는 것.
- 모듈: `LG /lg` 그대로. S_ERP 에 물류관리 모듈이 없어 주소를 바꾸지 않았다.
- 중분류: 권한 행이 없고, 영업관리 · 생산관리 중분류와 같은 모양이다. 영업관리 > 출하관리와 이름이 겹치지 않게 '출고관리'로 했다.

  | 순서 | menu_code | 이름 | 주소 |
  |---|---|---|---|
  | 1 | `LG_STOCK` | 재고관리 | `/lg/stock` |
  | 2 | `LG_OUTBOUND` | 출고관리 | `/lg/outbound` |

- 화면ID: 분류 글자 + 화면 뜻 + View. 생산관리 `PP…View` · `PR…View`, 영업관리 `PM…View` 와 같은 규칙이다.

  | 중분류 | 예전 | 새 화면ID · 주소 | 순서 |
  |---|---|---|---|
  | 재고관리(ST) | `product-stock` | `STProductStockView` · `/lg/stock/STProductStockView` | 10 |
  | 출고관리(OB) | `ship-confirm` | `OBShipConfirmView` · `/lg/outbound/OBShipConfirmView` | 10 |
  | 출고관리(OB) | `ship-status` | `OBShipStatusView` · `/lg/outbound/OBShipStatusView` | 20 |

- 메뉴 번호 · 이름 · 권한 행(`tb_menu_permission` · `tb_role_menu_permission`)은 그대로다.

## 같이 바뀐 코드(폴더 구조 = 메뉴 구조)

| 화면 | 프론트 폴더 | 백엔드 패키지 · 매퍼 | API |
|---|---|---|---|
| 제품재고관리 | `pages/lg/stock/product-stock` | `let/lg/stock/productstock` | `/api/v1/lg/stock/product-stock` |
| 출하확정 | `pages/lg/outbound/ship-confirm` | `let/lg/outbound/shipconfirm` | `/api/v1/lg/outbound/ship-confirm` |
| 출하현황 | `pages/lg/outbound/ship-status` | `let/lg/outbound/shipstatus` | `/api/v1/lg/outbound/ship-status` |

- 구매관리 > 재고조정 화면도 제품재고관리 API(제품 전체 재고 · 로트)를 쓴다. 그래서 새 주소를 쓰도록 같이 바꿨다.

## 영향 범위

- 화면(`DashboardContent`)은 모듈 `lg` 와 위 화면ID 로 화면을 고른다.
  - 이 스크립트를 적용하지 않으면 새 화면 코드에서 물류관리 화면이 열리지 않는다.
  - 반대로 적용하면 예전 화면 코드에서 물류관리 화면이 열리지 않는다.
- API 주소가 바뀌어 프론트(Vercel)와 백엔드(war)를 같이 올려야 한다. 예전 프론트는 새 백엔드에서 물류관리 · 재고조정 API 를 부를 수 없다.
- 그래서 DB 적용 · war 배포 · 프론트 배포를 한 번에 한다.
- 브라우저에 남은 예전 주소(최근 사용 · 즐겨찾기의 `/lg/product-stock` 등)는 열리지 않는다. 메뉴에서 다시 열면 된다.
- 롤백하면 중분류 2행을 지우고 화면을 모듈 바로 아래(예전 화면 키 · 주소 · 순서)로 돌린다. 화면 · 서버 코드도 함께 돌려야 한다.
