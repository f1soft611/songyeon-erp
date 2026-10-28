# 화면·파일·테스트 목록

생성일: 2026-09-18. 소스 파일 기준이며 테스트 실행 결과가 아니다.

## Python 모듈

| 파일 | 줄 수 | 명시적 메서드·경로 조합 |
|---|---:|---:|
| [accounting.py](../../MES_프로토타입_20260916/accounting.py) | 1091 | 25 |
| [ai.py](../../MES_프로토타입_20260916/ai.py) | 697 | 5 |
| [app.py](../../MES_프로토타입_20260916/app.py) | 5987 | 153 |
| [attachments.py](../../MES_프로토타입_20260916/attachments.py) | 987 | 17 |
| [auth.py](../../MES_프로토타입_20260916/auth.py) | 293 | 5 |
| [chat.py](../../MES_프로토타입_20260916/chat.py) | 560 | 12 |
| [common.py](../../MES_프로토타입_20260916/common.py) | 457 | 0 |
| [config.py](../../MES_프로토타입_20260916/config.py) | 127 | 0 |
| [db.py](../../MES_프로토타입_20260916/db.py) | 71 | 0 |
| [import_data.py](../../MES_프로토타입_20260916/import_data.py) | 241 | 0 |
| [label.py](../../MES_프로토타입_20260916/label.py) | 1039 | 32 |
| [permissions.py](../../MES_프로토타입_20260916/permissions.py) | 528 | 0 |
| [recipe.py](../../MES_프로토타입_20260916/recipe.py) | 920 | 21 |
| [run_dev.py](../../MES_프로토타입_20260916/run_dev.py) | 20 | 0 |
| [sales.py](../../MES_프로토타입_20260916/sales.py) | 303 | 6 |
| [schema.py](../../MES_프로토타입_20260916/schema.py) | 2428 | 0 |
| [secrets_store.py](../../MES_프로토타입_20260916/secrets_store.py) | 69 | 0 |
| [temperature.py](../../MES_프로토타입_20260916/temperature.py) | 325 | 14 |

## 화면 스크립트 (39개)

React 전환 시 아래 파일을 업무별 기능 경계의 출발점으로 사용한다. 공유 전역 함수와 HTML DOM ID 참조는 별도 분리가 필요하다.

| 파일 | 줄 수 | 파일 머리말 |
|---|---:|---|
| [static/js/01-core.js](../../MES_프로토타입_20260916/static/js/01-core.js) | 882 | 공용 팝업·서버응답 처리·엑셀·토스트 |
| [static/js/02-chat.js](../../MES_프로토타입_20260916/static/js/02-chat.js) | 693 | 사내 메신저 |
| [static/js/03-shell.js](../../MES_프로토타입_20260916/static/js/03-shell.js) | 759 | 로그인정보/권한 적용, 단축키, 사이드바 |
| [static/js/04-product.js](../../MES_프로토타입_20260916/static/js/04-product.js) | 556 | 제품등록 |
| [static/js/05-quote.js](../../MES_프로토타입_20260916/static/js/05-quote.js) | 470 | 포장유형 설정, 견적 |
| [static/js/06-bom.js](../../MES_프로토타입_20260916/static/js/06-bom.js) | 409 | 제품BOM, 원재료명 서식 |
| [static/js/07-label.js](../../MES_프로토타입_20260916/static/js/07-label.js) | 1391 | 라벨 정보 입력·미리보기·인쇄 |
| [static/js/08-basic-info.js](../../MES_프로토타입_20260916/static/js/08-basic-info.js) | 197 | 포장방법, 차량정보 |
| [static/js/09-recipe.js](../../MES_프로토타입_20260916/static/js/09-recipe.js) | 858 | 상품개발(레시피) |
| [static/js/10-accounting.js](../../MES_프로토타입_20260916/static/js/10-accounting.js) | 346 | 매출·매입관리 |
| [static/js/11-ai.js](../../MES_프로토타입_20260916/static/js/11-ai.js) | 138 | AI 분석·이미지생성 |
| [static/js/12-tax-invoice.js](../../MES_프로토타입_20260916/static/js/12-tax-invoice.js) | 137 | 세금계산서 |
| [static/js/13-delivery-statement.js](../../MES_프로토타입_20260916/static/js/13-delivery-statement.js) | 396 | 거래명세표 |
| [static/js/14-temperature.js](../../MES_프로토타입_20260916/static/js/14-temperature.js) | 289 | 온도센서 |
| [static/js/15-label-print.js](../../MES_프로토타입_20260916/static/js/15-label-print.js) | 45 | 라벨출력(생산관리) |
| [static/js/16-material.js](../../MES_프로토타입_20260916/static/js/16-material.js) | 564 | 원재료BOM, 신규 원재료 등록 |
| [static/js/17-employee.js](../../MES_프로토타입_20260916/static/js/17-employee.js) | 310 | 로그인계정관리 — 아이디·비밀번호·권한 |
| [static/js/18-stock.js](../../MES_프로토타입_20260916/static/js/18-stock.js) | 1138 | 재고조정·재고조회 |
| [static/js/19-purchase.js](../../MES_프로토타입_20260916/static/js/19-purchase.js) | 1109 | 발주·입고 |
| [static/js/20-production.js](../../MES_프로토타입_20260916/static/js/20-production.js) | 881 | 생산스케줄·생산확정·생산입고·제품재고 |
| [static/js/21-logistics.js](../../MES_프로토타입_20260916/static/js/21-logistics.js) | 948 | 물류·출하등록·출하확정 |
| [static/js/22-dashboard.js](../../MES_프로토타입_20260916/static/js/22-dashboard.js) | 195 | 대시보드 캘린더 메모 |
| [static/js/23-ship-status.js](../../MES_프로토타입_20260916/static/js/23-ship-status.js) | 54 | 출하현황 |
| [static/js/24-server-settings.js](../../MES_프로토타입_20260916/static/js/24-server-settings.js) | 70 | 기초정보: 서버관리 |
| [static/js/25-label-register.js](../../MES_프로토타입_20260916/static/js/25-label-register.js) | 69 | 라벨등록 화면 (품질관리) |
| [static/js/26-label-format.js](../../MES_프로토타입_20260916/static/js/26-label-format.js) | 831 | 라벨양식 만들기 (품질관리 > 라벨양식) |
| [static/js/27-label-request.js](../../MES_프로토타입_20260916/static/js/27-label-request.js) | 139 | 표시사항 요청 (품질관리 > 라벨등록 > 두 번째 탭) |
| [static/js/28-documents.js](../../MES_프로토타입_20260916/static/js/28-documents.js) | 668 | 문서함 |
| [static/js/29-stock-status.js](../../MES_프로토타입_20260916/static/js/29-stock-status.js) | 188 | 재고현황 — 날짜 기준 재고와 입고 로트별 내역 |
| [static/js/30-warehouse-move.js](../../MES_프로토타입_20260916/static/js/30-warehouse-move.js) | 161 | 창고이동 — 자재창고에서 계량창고로 완포장 옮기기 |
| [static/js/31-acc-basic.js](../../MES_프로토타입_20260916/static/js/31-acc-basic.js) | 261 | 기초회계정보 — 계정과목 · 계좌 · 카드 |
| [static/js/32-hr.js](../../MES_프로토타입_20260916/static/js/32-hr.js) | 178 | 사원관리 (인사정보) |
| [static/js/33-acc-cash.js](../../MES_프로토타입_20260916/static/js/33-acc-cash.js) | 541 | 회계거래현황 · 입·출금관리 · 거래처별관리대장(채권·채무) |
| [static/js/34-prod-check.js](../../MES_프로토타입_20260916/static/js/34-prod-check.js) | 322 | 생산가능확인 — 만들 제품·수량을 적으면 그 날짜 원재료 재고로 되는지 본다. |
| [static/js/35-leave.js](../../MES_프로토타입_20260916/static/js/35-leave.js) | 216 | 근태관리 (연차) |
| [static/js/36-sales.js](../../MES_프로토타입_20260916/static/js/36-sales.js) | 317 | 판매관리 — 판매등록 · 판매현황 · 토탈집계 |
| [static/js/37-recv-status.js](../../MES_프로토타입_20260916/static/js/37-recv-status.js) | 194 | 입고현황 탭 — 기간 안에 들어온 원재료를 한 줄씩 편다. |
| [static/js/38-po-status.js](../../MES_프로토타입_20260916/static/js/38-po-status.js) | 145 | 발주현황 탭 — 기간 안에 낸 발주를 한 줄씩 편다. |
| [static/js/39-material-substitute.js](../../MES_프로토타입_20260916/static/js/39-material-substitute.js) | 185 | 재료 치환등록 (구매관리) |

## pricing.html 화면 컨테이너 (43개)

id가 `screen-`으로 시작하는 요소를 추출한 수이며 메뉴 수나 독립 URL 수와 같지 않다.

`screen-dashboard`, `screen-chat`, `screen-product`, `screen-pricing`, `screen-settings`, `screen-hr`, `screen-stock`, `screen-purchase`, `screen-po`, `screen-mat-sub`, `screen-recv`, `screen-stock-status`, `screen-documents`, `screen-quote`, `screen-order`, `screen-prod-confirm`, `screen-production`, `screen-actual`, `screen-prod-status`, `screen-label-print`, `screen-label-register`, `screen-product-stock`, `screen-logistics`, `screen-shipment`, `screen-ship-confirm`, `screen-ship-status`, `screen-recipe-write`, `screen-recipe-share`, `screen-recipe-log`, `screen-recipe-shared`, `screen-prod-check`, `screen-sales-register`, `screen-sales-status`, `screen-sales-total`, `screen-acc-tx`, `screen-acc-in-report`, `screen-acc-basic`, `screen-acc-sales`, `screen-acc-receivable`, `screen-ai-chat`, `screen-temp-monitor`, `screen-tax-invoice`, `screen-delivery-statement`

## 테스트 (49개 파일)

`run_tests.bat`에서 참조하는 테스트는 36개이다. 개별 파일에 여러 시나리오가 있으므로 파일 수는 테스트 케이스 수가 아니다.

| 파일 | 배치 포함 | 목적 (모듈 문서 첫 단락) |
|---|---|---|
| [tests/test_acc_basic.py](../../MES_프로토타입_20260916/tests/test_acc_basic.py) | 아니오 | 기초회계정보(계정과목·계좌·카드) 검사. |
| [tests/test_acc_cash.py](../../MES_프로토타입_20260916/tests/test_acc_cash.py) | 아니오 | 입금·출금 전표와 입·출금관리·채무대장 검사. |
| [tests/test_api_key_lock.py](../../MES_프로토타입_20260916/tests/test_api_key_lock.py) | 예 | 외부 서비스 API 키가 잠긴 채로 저장되는지 확인하는 테스트. |
| [tests/test_attachment_scope.py](../../MES_프로토타입_20260916/tests/test_attachment_scope.py) | 아니오 | 올려둔 파일을 권한 없는 사람이 못 꺼내는지 검사. |
| [tests/test_auto_receive_on_ship.py](../../MES_프로토타입_20260916/tests/test_auto_receive_on_ship.py) | 예 | 생산입고를 건너뛴 로트로 출하확정했을 때 재고가 맞는지 확인하는 테스트. |
| [tests/test_bom_code_match.py](../../MES_프로토타입_20260916/tests/test_bom_code_match.py) | 예 | 제품BOM을 저장할 때 원재료를 코드로 붙들어두는지 검사. |
| [tests/test_carryover_date.py](../../MES_프로토타입_20260916/tests/test_carryover_date.py) | 예 | 이월 날짜 검사. |
| [tests/test_client_excel.py](../../MES_프로토타입_20260916/tests/test_client_excel.py) | 예 | 거래처BOM 엑셀 내려받기/올리기를 확인하는 테스트. |
| [tests/test_client_single_source.py](../../MES_프로토타입_20260916/tests/test_client_single_source.py) | 예 | 거래처명이 거래처BOM 한 곳에서만 나오는지 확인하는 테스트. |
| [tests/test_document_box.py](../../MES_프로토타입_20260916/tests/test_document_box.py) | 아니오 | 문서함 - 공용/개인 구분 검사. |
| [tests/test_document_lock.py](../../MES_프로토타입_20260916/tests/test_document_lock.py) | 아니오 | 문서함 폴더 비밀번호 검사. |
| [tests/test_document_share.py](../../MES_프로토타입_20260916/tests/test_document_share.py) | 아니오 | 개인문서함 문서 공유 + 메신저 알림 검사. |
| [tests/test_flow_integrity.py](../../MES_프로토타입_20260916/tests/test_flow_integrity.py) | 예 | 상품개발부터 매출까지 한 줄로 이어질 때 어긋나던 것들 검사. |
| [tests/test_hr_account_split.py](../../MES_프로토타입_20260916/tests/test_hr_account_split.py) | 아니오 | 사원관리(인사정보)와 로그인계정관리를 갈라둔 것이 지켜지는지 검사. |
| [tests/test_html_js_ids.py](../../MES_프로토타입_20260916/tests/test_html_js_ids.py) | 예 | 화면(HTML)에 없는 id를 코드(JS)가 찾고 있지 않은지 확인한다. |
| [tests/test_import_data.py](../../MES_프로토타입_20260916/tests/test_import_data.py) | 예 | 엑셀 가져오기(import_data.py)가 기존 자료를 지우지 않는지 확인하는 테스트. |
| [tests/test_js_globals.py](../../MES_프로토타입_20260916/tests/test_js_globals.py) | 아니오 | 화면 조각들이 같은 이름을 두 번 만들지 않는지 검사. |
| [tests/test_js_syntax.py](../../MES_프로토타입_20260916/tests/test_js_syntax.py) | 아니오 | static/js 의 JS 파일에서 '조용히 죽는' 문법 실수를 잡는다. |
| [tests/test_label_versions.py](../../MES_프로토타입_20260916/tests/test_label_versions.py) | 예 | 라벨 수정 이력(버전)이 제대로 남는지 확인하는 테스트. |
| [tests/test_leave.py](../../MES_프로토타입_20260916/tests/test_leave.py) | 예 | 근태관리(연차) 검사. |
| [tests/test_login_security.py](../../MES_프로토타입_20260916/tests/test_login_security.py) | 예 | 로그인 보안(시도 횟수 제한)이 동작하는지 확인하는 테스트. |
| [tests/test_lot_allocation.py](../../MES_프로토타입_20260916/tests/test_lot_allocation.py) | 예 | 출하 한 줄을 로트 여러 개로 나눠 적을 수 있는지 확인하는 테스트. |
| [tests/test_lot_no.py](../../MES_프로토타입_20260916/tests/test_lot_no.py) | 예 | 로트번호가 품목별·생산일자별로 다르게 붙는지 확인하는 테스트. |
| [tests/test_lot_pick_planned.py](../../MES_프로토타입_20260916/tests/test_lot_pick_planned.py) | 예 | 출하등록 로트선택에서 '생산입고 전' 건이 사라지지 않는지 확인하는 테스트. |
| [tests/test_material_rename.py](../../MES_프로토타입_20260916/tests/test_material_rename.py) | 예 | 원재료 이름을 바꿨을 때 배합표가 따라가는지 검사. |
| [tests/test_material_substitute.py](../../MES_프로토타입_20260916/tests/test_material_substitute.py) | 예 | 생산확정의 원재료 치환·투입지시서·라벨 검사. |
| [tests/test_password_change.py](../../MES_프로토타입_20260916/tests/test_password_change.py) | 예 | 스스로 비밀번호를 바꾸는 기능이 제대로 막고 열리는지 확인하는 테스트. |
| [tests/test_permissions.py](../../MES_프로토타입_20260916/tests/test_permissions.py) | 예 | 권한 검사가 제대로 동작하는지 자동으로 확인하는 테스트. |
| [tests/test_po_status.py](../../MES_프로토타입_20260916/tests/test_po_status.py) | 예 | 발주현황 검사. |
| [tests/test_product_code_link.py](../../MES_프로토타입_20260916/tests/test_product_code_link.py) | 예 | 생산·물류·수주 기록이 제품코드로 이어지는지 확인하는 테스트. |
| [tests/test_product_discontinue.py](../../MES_프로토타입_20260916/tests/test_product_discontinue.py) | 예 | 제품 '사용안함' 처리를 확인하는 테스트. |
| [tests/test_product_stock_ledger.py](../../MES_프로토타입_20260916/tests/test_product_stock_ledger.py) | 예 | 제품 입출고 원장을 확인하는 테스트. |
| [tests/test_production_check.py](../../MES_프로토타입_20260916/tests/test_production_check.py) | 예 | 생산가능확인 검사. |
| [tests/test_purchase_batch.py](../../MES_프로토타입_20260916/tests/test_purchase_batch.py) | 예 | 구매관리 확장분 검사. |
| [tests/test_recipe_client_folder.py](../../MES_프로토타입_20260916/tests/test_recipe_client_folder.py) | 예 | 업체 폴더와 영업담당자가 제대로 남는지 확인하는 테스트. |
| [tests/test_recipe_code.py](../../MES_프로토타입_20260916/tests/test_recipe_code.py) | 예 | 레시피 배합표가 원재료를 코드로 물고 있는지 검사. |
| [tests/test_recipe_handoff.py](../../MES_프로토타입_20260916/tests/test_recipe_handoff.py) | 예 | 레시피를 다음 부서로 넘기는 기능(확정/견적/기타)을 확인하는 테스트. |
| [tests/test_recipe_share_version.py](../../MES_프로토타입_20260916/tests/test_recipe_share_version.py) | 예 | 레시피를 공유할 때 '어느 버전인지' 가 못박히는지 확인하는 테스트. |
| [tests/test_recv_status.py](../../MES_프로토타입_20260916/tests/test_recv_status.py) | 예 | 입고현황 검사. |
| [tests/test_sales.py](../../MES_프로토타입_20260916/tests/test_sales.py) | 예 | 판매관리 검사. |
| [tests/test_sales_order_client.py](../../MES_프로토타입_20260916/tests/test_sales_order_client.py) | 예 | 수주등록의 거래처가 거래처BOM 기준으로 묶이는지 확인하는 테스트. |
| [tests/test_ship_actual_qty.py](../../MES_프로토타입_20260916/tests/test_ship_actual_qty.py) | 예 | 출하확정에서 '출하예정량' 과 '실출하량' 을 따로 다루는지 확인하는 테스트. |
| [tests/test_stock_production_flag.py](../../MES_프로토타입_20260916/tests/test_stock_production_flag.py) | 예 | 수주등록의 '재고생산' 표시가 끝까지 따라가는지 확인하는 테스트. |
| [tests/test_stock_two_screens.py](../../MES_프로토타입_20260916/tests/test_stock_two_screens.py) | 아니오 | 수불대장과 재고현황이 같은 값을 내놓는지 확인하는 테스트. |
| [tests/test_sub_materials.py](../../MES_프로토타입_20260916/tests/test_sub_materials.py) | 예 | 부자재(필름·파우치·박스) 재고 차감 검사. |
| [tests/test_trade_report.py](../../MES_프로토타입_20260916/tests/test_trade_report.py) | 예 | 매출·매입 조회 검사. |
| [tests/test_warehouse.py](../../MES_프로토타입_20260916/tests/test_warehouse.py) | 아니오 | 창고등록 검사. |
| [tests/test_warehouse_move.py](../../MES_프로토타입_20260916/tests/test_warehouse_move.py) | 아니오 | 창고이동(자재창고 -> 계량창고) 검사. |
| [tests/test_warehouse_split.py](../../MES_프로토타입_20260916/tests/test_warehouse_split.py) | 아니오 | 입고 창고 · 단위중량/박스입수량 · 수불대장 창고별 내역 검사. |

## 기타 도구

| 파일 | 설명 |
|---|---|
| [tools/backup_db.py](../../MES_프로토타입_20260916/tools/backup_db.py) | DB를 안전하게 백업한다. |
| [tools/dump_schema.py](../../MES_프로토타입_20260916/tools/dump_schema.py) | DB의 테이블/인덱스 구조만 data/schema.sql 로 뽑아낸다. |
| [tools/fetch_vendor.py](../../MES_프로토타입_20260916/tools/fetch_vendor.py) | 바코드·엑셀 라이브러리를 프로그램 폴더로 내려받는다. |
| [tools/make_sample_db.py](../../MES_프로토타입_20260916/tools/make_sample_db.py) | 이어서 개발할 때 쓸 샘플 데이터베이스를 만든다. |
| [tools/make_system_doc.py](../../MES_프로토타입_20260916/tools/make_system_doc.py) | 프로그램 전체 설계도를 워드 문서로 만든다. |
