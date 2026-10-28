# 20261028_003 영업관리 /sales · 중분류 변경 이력

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-10-28 |
| 대상 DB | songyeon (PostgreSQL) |
| 유형 | 메뉴 데이터 변경(모듈 코드 · 주소, 중분류 3행 추가, 화면 6행의 화면ID · 주소 · 부모 · 순서) |
| 대상 표 | `tb_module`(1행), `tb_menu`(추가 3행 · 수정 6행) |
| 적용 | 2026-10-28 적용 완료 (트랜잭션 시험 실행: 다시 적용해도 같음, 롤백하면 처음과 같음, 권한 행 그대로 확인 후 적용. 적용 뒤 권한 행 해시 그대로) |
| 롤백 | `20261028_003_rollback.sql` |

## 내용

- 요청: "영업관리 sa 로 되어있는거 sales로 바꾸고 기준정보처럼 중분류도 넣고싶은데", "3개로 하고 기준정보처럼 맞추고 프로젝트 구조도 폴더 구조랑 맞춰줘 sales로 맞추는것도 맞고"
- 모듈: `SA /sa` → `SALES /sales`(S_ERP 영업관리와 같은 주소)
- 중분류(권한 행 없음, 기준정보 중분류와 같은 모양)

  | 순서 | menu_code | 이름 | 주소 |
  |---|---|---|---|
  | 1 | `SALES_PRODUCT` | 제품관리 | `/sales/product` |
  | 2 | `SALES_ORDER` | 수주관리 | `/sales/order` |
  | 3 | `SALES_SHIPMENT` | 출하관리 | `/sales/shipment` |

- 화면ID: 분류 글자 + 화면 뜻 + View(기준정보 `BS…View`, 스케줄관리 `SC…View` 와 같은 규칙)

  | 중분류 | 예전 | 새 화면ID · 주소 | 순서 |
  |---|---|---|---|
  | 제품관리(PM) | `product` | `PMProductRegisterView` · `/sales/product/PMProductRegisterView` | 10 |
  | 제품관리(PM) | `pricing` | `PMPricingView` · `/sales/product/PMPricingView` | 20 |
  | 수주관리(OM) | `quote` | `OMQuoteView` · `/sales/order/OMQuoteView` | 10 |
  | 수주관리(OM) | `order` | `OMOrderRegisterView` · `/sales/order/OMOrderRegisterView` | 20 |
  | 수주관리(OM) | `prod-check` | `OMProdCheckView` · `/sales/order/OMProdCheckView` | 30 |
  | 출하관리(SH) | `shipment` | `SHShipmentRegisterView` · `/sales/shipment/SHShipmentRegisterView` | 10 |

- 메뉴 번호 · 이름 · 권한 행(`tb_menu_permission` · `tb_role_menu_permission`)은 그대로다.

## 같이 바뀐 코드(폴더 구조 = 메뉴 구조)

| 화면 | 프론트 폴더 | 백엔드 패키지 · 매퍼 | API |
|---|---|---|---|
| 제품등록 | `pages/sales/product/product-register` | `let/sales/product/productregister` | `/api/v1/sales/product/product-register` |
| 단가관리 | `pages/sales/product/pricing` | `let/sales/product/pricing` | `/api/v1/sales/product/pricing` |
| 견적 | `pages/sales/order/quote` | `let/sales/order/quote` | `/api/v1/sales/order/quote` |
| 수주등록 | `pages/sales/order/order-register` | `let/sales/order/orderregister` | `/api/v1/sales/order/order-register` |
| 생산가능확인 | `pages/sales/order/prod-check` | `let/sales/order/prodcheck` | `/api/v1/sales/order/prod-check` |
| 출하등록 | `pages/sales/shipment/shipment-register` | `let/sales/shipment/shipmentregister` | `/api/v1/sales/shipment/shipment-register` |

## 영향 범위

- 화면(`DashboardContent`)은 모듈 `sales` 와 위 화면ID 로 화면을 고른다. 이 스크립트를 적용하지 않으면 새 화면 코드에서 영업관리 화면이 열리지 않는다. 반대로 예전 화면 코드에서는 적용 뒤 영업관리 화면이 열리지 않는다.
- API 주소가 바뀌어 프론트(Vercel) · 백엔드(war)도 같이 올려야 한다. 예전 프론트는 새 백엔드에서, 새 프론트는 예전 백엔드에서 영업관리 API 를 부를 수 없다.
- 그래서 DB 적용 · war 배포 · 프론트 배포를 한 번에 한다.
- 롤백하면 `/sa` · 예전 화면 키 · 모듈 바로 아래로 돌아가고 중분류 3행을 지운다. 화면 · 서버 코드도 함께 돌려야 한다.
