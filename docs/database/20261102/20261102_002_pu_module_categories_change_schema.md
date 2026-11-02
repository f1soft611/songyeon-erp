# 20261102_002 구매관리 중분류 · 발주현황 화면 변경 이력

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-11-02 |
| 대상 DB | songyeon (PostgreSQL) |
| 유형 | 메뉴 데이터 변경(중분류 4행 · 새 화면 1행 추가, 화면 7행의 화면ID · 주소 · 부모 · 순서, 새 화면 권한 행 복사) |
| 대상 표 | `tb_menu`(추가 5행 · 수정 7행), `tb_menu_permission` · `tb_role_menu_permission`(발주현황 행 추가) |
| 적용 | 2026-11-02 적용 완료 (트랜잭션 시험 실행: 다시 적용해도 같음, 롤백하면 처음과 같음, 기존 권한 행 그대로 확인 후 적용) |
| 롤백 | `20261102_002_rollback.sql` |

## 내용

- 요청: "구매관리도 중분류 나눠주는데 발주관리에 발주등록 발주현황 화면 따로 만드려고 탭으로 안 하고". 사용자 결정은 중분류 4개, 입고관리 탭은 그대로, 폴더 · API · 화면ID 까지 맞추고 표준 구조로 정리하는 것.
- 모듈: `PU /pu` 그대로.
- 중분류: 권한 행이 없고, 영업관리 · 생산관리 · 물류관리 · 판매관리 중분류와 같은 모양이다.

  | 순서 | menu_code | 이름 | 주소 |
  |---|---|---|---|
  | 1 | `PU_ORDER` | 발주관리 | `/pu/order` |
  | 2 | `PU_INBOUND` | 입고관리 | `/pu/inbound` |
  | 3 | `PU_STOCK` | 재고관리 | `/pu/stock` |
  | 4 | `PU_DOCUMENT` | 문서관리 | `/pu/document` |

- 화면ID: 분류 글자 + 화면 뜻 + View.

  | 중분류 | 예전 | 새 화면ID · 주소 | 순서 |
  |---|---|---|---|
  | 발주관리(PO) | `po` 발주관리 | `POOrderRegisterView` 발주등록 · `/pu/order/POOrderRegisterView` | 10 |
  | 발주관리(PO) | (새 화면) | `POOrderStatusView` 발주현황 · `/pu/order/POOrderStatusView` | 20 |
  | 입고관리(IB) | `recv` | `IBReceivingView` · `/pu/inbound/IBReceivingView` | 10 |
  | 입고관리(IB) | `mat-sub` | `IBSubstitutionView` · `/pu/inbound/IBSubstitutionView` | 20 |
  | 재고관리(ST) | `purchase` | `STStockLedgerView` · `/pu/stock/STStockLedgerView` | 10 |
  | 재고관리(ST) | `stock` | `STStockAdjustView` · `/pu/stock/STStockAdjustView` | 20 |
  | 재고관리(ST) | `stock-status` | `STStockStatusView` · `/pu/stock/STStockStatusView` | 30 |
  | 문서관리(DC) | `documents` | `DCDocumentBoxView` · `/pu/document/DCDocumentBoxView` | 10 |

- 발주관리 화면은 이름을 발주등록으로 바꾸고 설명(`menu_dc`)도 맞췄다. 메뉴 번호는 그대로다.
- 새 화면 발주현황의 권한은 예전 발주관리의 메뉴 권한 · 역할 권한을 그대로 복사했다. 탭일 때와 같은 사람이 같은 권한으로 본다.
- 기존 메뉴의 권한 행은 바뀌지 않는다.

## 같이 바뀐 코드(폴더 구조 = 메뉴 구조)

| 화면 | 프론트 폴더 | 백엔드 패키지 · 매퍼 | API |
|---|---|---|---|
| 발주등록 | `pages/pu/order/order-register` | `let/pu/order/purchaseorder` | `/api/v1/pu/order/purchase-orders` |
| 발주현황 | `pages/pu/order/order-status` | `let/pu/order/purchaseorder`(발주등록과 같음) | `/api/v1/pu/order/purchase-orders` |
| 입고관리 | `pages/pu/inbound/receiving` | `let/pu/inbound/receiving` | `/api/v1/pu/inbound/receivings` |
| 재료 치환등록 | `pages/pu/inbound/substitution` | `let/pu/inbound/substitution` | `/api/v1/pu/inbound/material-substitution` |
| 수불대장 | `pages/pu/stock/stock-ledger` | `let/pu/stock/stockledger` | `/api/v1/pu/stock/stock-ledger` |
| 재고조정 | `pages/pu/stock/stock-adjust` | `let/pu/stock/stockadjust` | `/api/v1/pu/stock/stock-adjust` |
| 재고현황 | `pages/pu/stock/stock-status` | `let/pu/stock/stockstatus` | `/api/v1/pu/stock/stock-status` |
| 문서함 | `pages/pu/document/document-box` | `let/pu/document/documentbox` | `/api/v1/pu/document/documents` |

## 영향 범위

- 화면(`DashboardContent`)은 모듈 `pu` 와 위 화면ID 로 화면을 고른다.
  - 이 스크립트를 적용하지 않으면 새 화면 코드에서 구매관리 화면이 열리지 않는다.
  - 반대로 적용하면 예전 화면 코드에서 구매관리 화면이 열리지 않는다.
- API 주소가 바뀌어 프론트(Vercel)와 백엔드(war)를 같이 올려야 한다.
- 그래서 DB 적용 · war 배포 · 프론트 배포를 한 번에 한다.
- 브라우저에 남은 예전 주소(최근 사용 · 즐겨찾기의 `/pu/po` 등)는 열리지 않는다. 메뉴에서 다시 열면 된다.
- 롤백하면 발주현황 메뉴(권한 행은 FK CASCADE 로 함께)와 중분류 4행을 지우고, 화면을 모듈 바로 아래(예전 화면 키 · 주소 · 순서 · 이름)로 돌린다. 화면 · 서버 코드도 함께 돌려야 한다.
