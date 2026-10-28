# API 목록 — 소스 정적 분석

생성일: 2026-09-18. Flask 라우트 데코레이터에서 추출했다. 자동 HEAD/OPTIONS 및 Flask 정적 파일 라우트는 제외한다. 같은 URL도 HTTP 메서드가 다르면 별도로 센다.

총 **290개 메서드·경로 조합**, 고유 경로 **227개**. `/api/` 조합은 **286개**.

입력 키는 해당 함수의 `body.get`, `data.get`, `request.args.get`에서 발견한 후보이다. 필수 여부·타입·중첩 구조·multipart·헬퍼 내부 입력은 포함하지 않으므로 OpenAPI 계약으로 바로 사용하면 안 된다. 권한은 `permissions.py` 및 각 핸들러의 소유권 검사를 함께 확인한다.

## accounting.py (25)

| 메서드 | 경로 | 핸들러 / 소스 | 입력 키 후보 |
|---|---|---|---|
| GET | `/api/accounting/clients` | `accounting_clients` · [accounting.py](../../MES_프로토타입_20260916/accounting.py#L33) |  |
| GET | `/api/accounting/products` | `accounting_products` · [accounting.py](../../MES_프로토타입_20260916/accounting.py#L40) |  |
| GET | `/api/accounting/sales-by-client` | `accounting_sales_by_client` · [accounting.py](../../MES_프로토타입_20260916/accounting.py#L52) | client_q, end, product_q, start |
| GET | `/api/accounting/sales-by-client/detail` | `accounting_sales_by_client_detail` · [accounting.py](../../MES_프로토타입_20260916/accounting.py#L79) | client_name, end, start |
| GET | `/api/accounting/delivery-statement-rows` | `accounting_delivery_statement_rows` · [accounting.py](../../MES_프로토타입_20260916/accounting.py#L193) | client_name, end, start |
| POST | `/api/accounting/delivery-statement/carryover` | `carryover_delivery_statement_items` · [accounting.py](../../MES_프로토타입_20260916/accounting.py#L212) | items, target_date, target_month |
| GET | `/api/accounting/trade-report` | `accounting_trade_report` · [accounting.py](../../MES_프로토타입_20260916/accounting.py#L380) | end, kind, start, unit, view |
| POST | `/api/accounting/payments` | `create_client_payment` · [accounting.py](../../MES_프로토타입_20260916/accounting.py#L452) | amount, client_name, note, payment_date |
| DELETE | `/api/accounting/payments/<int:pid>` | `delete_client_payment` · [accounting.py](../../MES_프로토타입_20260916/accounting.py#L481) |  |
| GET | `/api/accounting/receivable-ledger` | `accounting_receivable_ledger` · [accounting.py](../../MES_프로토타입_20260916/accounting.py#L490) | client_name, end, start |
| GET | `/api/accounting/subjects` | `list_acc_subjects` · [accounting.py](../../MES_프로토타입_20260916/accounting.py#L573) |  |
| POST | `/api/accounting/subjects` | `save_acc_subject` · [accounting.py](../../MES_프로토타입_20260916/accounting.py#L581) | active, category, code, id, name, note |
| DELETE | `/api/accounting/subjects/<int:sid>` | `delete_acc_subject` · [accounting.py](../../MES_프로토타입_20260916/accounting.py#L619) |  |
| GET | `/api/accounting/bank-accounts` | `list_acc_bank_accounts` · [accounting.py](../../MES_프로토타입_20260916/accounting.py#L628) |  |
| POST | `/api/accounting/bank-accounts` | `save_acc_bank_account` · [accounting.py](../../MES_프로토타입_20260916/accounting.py#L636) | account_no, active, bank_name, holder, id, note, purpose |
| DELETE | `/api/accounting/bank-accounts/<int:aid>` | `delete_acc_bank_account` · [accounting.py](../../MES_프로토타입_20260916/accounting.py#L668) |  |
| GET | `/api/accounting/cards` | `list_acc_cards` · [accounting.py](../../MES_프로토타입_20260916/accounting.py#L682) |  |
| POST | `/api/accounting/cards` | `save_acc_card` · [accounting.py](../../MES_프로토타입_20260916/accounting.py#L692) | active, bank_account_id, holder, id, issuer, last4, nickname, note |
| DELETE | `/api/accounting/cards/<int:cid>` | `delete_acc_card` · [accounting.py](../../MES_프로토타입_20260916/accounting.py#L731) |  |
| GET | `/api/accounting/transactions` | `list_acc_transactions` · [accounting.py](../../MES_프로토타입_20260916/accounting.py#L791) | client_name, end, kind, start |
| POST | `/api/accounting/transactions` | `save_acc_transaction` · [accounting.py](../../MES_프로토타입_20260916/accounting.py#L812) | amount, bank_account_id, card_id, client_name, id, kind, method, note, subject_id, tx_date |
| DELETE | `/api/accounting/transactions/<int:tid>` | `delete_acc_transaction` · [accounting.py](../../MES_프로토타입_20260916/accounting.py#L860) |  |
| GET | `/api/accounting/cash-report` | `acc_cash_report` · [accounting.py](../../MES_프로토타입_20260916/accounting.py#L869) | client_name, end, kind, start |
| GET | `/api/accounting/payable-ledger` | `accounting_payable_ledger` · [accounting.py](../../MES_프로토타입_20260916/accounting.py#L915) | client_name, end, start |
| GET | `/api/accounting/client-ledger` | `accounting_client_ledger` · [accounting.py](../../MES_프로토타입_20260916/accounting.py#L1004) | end, kind, start |

## ai.py (5)

| 메서드 | 경로 | 핸들러 / 소스 | 입력 키 후보 |
|---|---|---|---|
| GET | `/api/ai/demand-forecast` | `ai_demand_forecast` · [ai.py](../../MES_프로토타입_20260916/ai.py#L390) | product_name |
| GET | `/api/ai/stock-warnings` | `ai_stock_warnings` · [ai.py](../../MES_프로토타입_20260916/ai.py#L443) |  |
| GET | `/api/ai/settings` | `get_ai_settings` · [ai.py](../../MES_프로토타입_20260916/ai.py#L485) |  |
| POST | `/api/ai/chat` | `ai_chat` · [ai.py](../../MES_프로토타입_20260916/ai.py#L554) | content, data, file, message, mime_type, provider |
| POST | `/api/ai/generate-image` | `ai_generate_image` · [ai.py](../../MES_프로토타입_20260916/ai.py#L653) | candidates, prompt |

## app.py (153)

| 메서드 | 경로 | 핸들러 / 소스 | 입력 키 후보 |
|---|---|---|---|
| GET | `/` | `index` · [app.py](../../MES_프로토타입_20260916/app.py#L334) |  |
| GET | `/api/summary` | `summary` · [app.py](../../MES_프로토타입_20260916/app.py#L339) |  |
| GET | `/api/pricing` | `pricing` · [app.py](../../MES_프로토타입_20260916/app.py#L351) | q |
| GET | `/api/clients` | `clients` · [app.py](../../MES_프로토타입_20260916/app.py#L365) |  |
| POST | `/api/pricing/<product_code>` | `update_pricing` · [app.py](../../MES_프로토타입_20260916/app.py#L373) |  |
| GET | `/api/pricing/<product_code>` | `pricing_detail` · [app.py](../../MES_프로토타입_20260916/app.py#L429) |  |
| GET | `/api/product-types` | `product_types` · [app.py](../../MES_프로토타입_20260916/app.py#L442) |  |
| POST | `/api/product-types` | `upsert_product_type` · [app.py](../../MES_프로토타입_20260916/app.py#L447) | labor_cost, logistics_cost, loss_rate, margin, markup_rate, name, packaging_cost |
| DELETE | `/api/product-types/<name>` | `delete_product_type` · [app.py](../../MES_프로토타입_20260916/app.py#L476) |  |
| GET | `/api/materials/names` | `material_names` · [app.py](../../MES_프로토타입_20260916/app.py#L485) |  |
| GET | `/api/products/client-names` | `list_product_client_names` · [app.py](../../MES_프로토타입_20260916/app.py#L491) |  |
| GET | `/api/clients/vendor-names` | `list_vendor_client_names` · [app.py](../../MES_프로토타입_20260916/app.py#L501) |  |
| GET | `/api/products/order-candidates` | `list_order_product_candidates` · [app.py](../../MES_프로토타입_20260916/app.py#L510) |  |
| GET | `/api/clients/sales-names` | `list_sales_client_names` · [app.py](../../MES_프로토타입_20260916/app.py#L528) |  |
| GET | `/api/materials/last-price` | `get_material_last_price` · [app.py](../../MES_프로토타입_20260916/app.py#L618) | client_name, material_code |
| GET | `/api/products/next-code` | `next_product_code` · [app.py](../../MES_프로토타입_20260916/app.py#L649) |  |
| POST | `/api/materials/check` | `check_materials` · [app.py](../../MES_프로토타입_20260916/app.py#L658) |  |
| POST | `/api/products/register` | `register_product` · [app.py](../../MES_프로토타입_20260916/app.py#L671) | bom, client_name, product_code, product_name, product_type, spec, storage |
| GET | `/api/quotes` | `list_quotes` · [app.py](../../MES_프로토타입_20260916/app.py#L731) |  |
| GET | `/api/quotes/<int:quote_id>` | `quote_detail` · [app.py](../../MES_프로토타입_20260916/app.py#L736) |  |
| POST | `/api/quotes` | `create_quote` · [app.py](../../MES_프로토타입_20260916/app.py#L746) | bom, client_name, note, product_name, product_type, spec, storage |
| POST | `/api/quotes/<int:quote_id>` | `update_quote` · [app.py](../../MES_프로토타입_20260916/app.py#L788) | bom, client_name, note, product_name, product_type, spec, storage |
| DELETE | `/api/quotes/<int:quote_id>` | `delete_quote` · [app.py](../../MES_프로토타입_20260916/app.py#L825) |  |
| POST | `/api/quotes/<int:quote_id>/mark-confirmed` | `mark_quote_confirmed` · [app.py](../../MES_프로토타입_20260916/app.py#L834) | product_code |
| POST | `/api/quotes/<int:quote_id>/confirm` | `confirm_quote` · [app.py](../../MES_프로토타입_20260916/app.py#L852) |  |
| GET | `/api/products/with-bom` | `products_with_bom` · [app.py](../../MES_프로토타입_20260916/app.py#L917) | include_discontinued |
| GET | `/api/products/<code>/bom` | `get_product_bom` · [app.py](../../MES_프로토타입_20260916/app.py#L937) |  |
| POST | `/api/products/<code>/info` | `update_product_info` · [app.py](../../MES_프로토타입_20260916/app.py#L959) | client_name, name, storage |
| POST | `/api/products/<code>/discontinue` | `set_product_discontinued` · [app.py](../../MES_프로토타입_20260916/app.py#L987) | discontinued, note |
| POST | `/api/products/<code>/bom` | `update_product_bom` · [app.py](../../MES_프로토타입_20260916/app.py#L1035) | bom |
| GET | `/api/products/<code>/bom-log` | `get_bom_log` · [app.py](../../MES_프로토타입_20260916/app.py#L1095) |  |
| POST | `/api/materials` | `create_material` · [app.py](../../MES_프로토타입_20260916/app.py#L1108) | name, spec, unit_price |
| GET | `/api/materials` | `list_materials` · [app.py](../../MES_프로토타입_20260916/app.py#L1144) | q |
| GET | `/api/sub-materials` | `list_sub_materials` · [app.py](../../MES_프로토타입_20260916/app.py#L1170) | category |
| GET | `/api/materials/<code>/lots` | `material_lots_as_of` · [app.py](../../MES_프로토타입_20260916/app.py#L1206) | date |
| GET | `/api/materials/<code>/usage` | `get_material_usage` · [app.py](../../MES_프로토타입_20260916/app.py#L1237) |  |
| GET | `/api/products/<code>/sub-materials` | `get_product_sub_materials` · [app.py](../../MES_프로토타입_20260916/app.py#L1250) |  |
| POST | `/api/products/<code>/sub-materials` | `update_product_sub_materials` · [app.py](../../MES_프로토타입_20260916/app.py#L1274) |  |
| GET | `/api/products/<code>/bom-allergens` | `product_bom_allergens` · [app.py](../../MES_프로토타입_20260916/app.py#L1328) |  |
| POST | `/api/materials/<code>/bulk-replace` | `bulk_replace_material` · [app.py](../../MES_프로토타입_20260916/app.py#L1356) | new_material_code, product_codes |
| POST | `/api/materials/<code>/info` | `update_material_info` · [app.py](../../MES_프로토타입_20260916/app.py#L1403) | name, supplier, suppliers |
| POST | `/api/materials/<code>/stock` | `update_material_stock` · [app.py](../../MES_프로토타입_20260916/app.py#L1519) | stock_qty |
| GET | `/api/products/export-excel` | `export_products_excel` · [app.py](../../MES_프로토타입_20260916/app.py#L1545) |  |
| POST | `/api/products/stock-upload` | `upload_products_stock` · [app.py](../../MES_프로토타입_20260916/app.py#L1570) |  |
| POST | `/api/products/stock-confirm` | `confirm_product_stock_schedule` · [app.py](../../MES_프로토타입_20260916/app.py#L1626) | effective_date |
| GET | `/api/products/stock-schedule` | `list_product_stock_schedule` · [app.py](../../MES_프로토타입_20260916/app.py#L1669) |  |
| POST | `/api/products/stock-schedule/<int:sid>` | `update_product_stock_schedule_item` · [app.py](../../MES_프로토타입_20260916/app.py#L1684) | edited_qty |
| DELETE | `/api/products/stock-schedule/<int:sid>` | `cancel_product_stock_schedule` · [app.py](../../MES_프로토타입_20260916/app.py#L1702) |  |
| DELETE | `/api/products/stock-schedule/cancel-all` | `cancel_all_product_stock_schedule` · [app.py](../../MES_프로토타입_20260916/app.py#L1711) |  |
| GET | `/api/products/stock-history` | `product_stock_history` · [app.py](../../MES_프로토타입_20260916/app.py#L1722) | end, kind, product_code, start |
| POST | `/api/materials/stock-upload` | `upload_materials_stock` · [app.py](../../MES_프로토타입_20260916/app.py#L1808) |  |
| POST | `/api/materials/stock-confirm` | `confirm_stock_schedule` · [app.py](../../MES_프로토타입_20260916/app.py#L1863) | effective_date, note |
| GET | `/api/materials/stock-schedule` | `list_stock_schedule` · [app.py](../../MES_프로토타입_20260916/app.py#L1917) |  |
| POST | `/api/materials/stock-schedule/<int:sid>` | `update_stock_schedule_item` · [app.py](../../MES_프로토타입_20260916/app.py#L1933) | edited_qty |
| GET | `/api/materials/stock-history` | `stock_history` · [app.py](../../MES_프로토타입_20260916/app.py#L1951) | end, start |
| DELETE | `/api/materials/stock-schedule/<int:sid>` | `cancel_stock_schedule` · [app.py](../../MES_프로토타입_20260916/app.py#L1974) |  |
| DELETE | `/api/materials/stock-schedule/cancel-all` | `cancel_all_stock_schedule` · [app.py](../../MES_프로토타입_20260916/app.py#L1983) |  |
| POST | `/api/materials/<code>/movement` | `register_material_movement` · [app.py](../../MES_프로토타입_20260916/app.py#L1994) | in_qty, note, out_qty, set_qty |
| GET | `/api/materials/<code>/movement-log` | `material_movement_log` · [app.py](../../MES_프로토타입_20260916/app.py#L2054) |  |
| POST | `/api/materials/<code>/price` | `update_material_price` · [app.py](../../MES_프로토타입_20260916/app.py#L2103) | effective_date, unit_price |
| GET | `/api/materials/<code>/price-schedule` | `get_material_price_schedule` · [app.py](../../MES_프로토타입_20260916/app.py#L2143) |  |
| DELETE | `/api/materials/price-schedule/<int:sid>` | `cancel_price_schedule` · [app.py](../../MES_프로토타입_20260916/app.py#L2153) |  |
| GET | `/api/materials/<code>/price-log` | `get_material_price_log` · [app.py](../../MES_프로토타입_20260916/app.py#L2162) |  |
| GET | `/api/production-schedule` | `list_production_schedule` · [app.py](../../MES_프로토타입_20260916/app.py#L2172) | date, end, start |
| POST | `/api/production-schedule` | `create_production_schedule` · [app.py](../../MES_프로토타입_20260916/app.py#L2198) | actual_qty, client_name, logistics_date, note, order_qty, product_code, product_name, schedule_date, source_order_id, spec |
| POST | `/api/production-schedule/<int:sid>` | `update_production_schedule` · [app.py](../../MES_프로토타입_20260916/app.py#L2285) | client_name, logistics_date, note, order_qty, product_code, product_name, spec |
| POST | `/api/production-schedule/<int:sid>/actual-qty` | `update_production_actual_qty` · [app.py](../../MES_프로토타입_20260916/app.py#L2326) | actual_qty |
| DELETE | `/api/production-schedule/<int:sid>` | `delete_production_schedule` · [app.py](../../MES_프로토타입_20260916/app.py#L2372) |  |
| GET | `/api/production-schedule/<int:sid>/materials` | `get_production_materials` · [app.py](../../MES_프로토타입_20260916/app.py#L2466) |  |
| GET | `/api/material-substitution` | `list_material_substitution` · [app.py](../../MES_프로토타입_20260916/app.py#L2476) | date |
| POST | `/api/production-schedule/<int:sid>/substitute` | `substitute_production_material` · [app.py](../../MES_프로토타입_20260916/app.py#L2503) | from_material_code, reason, to_material_code |
| DELETE | `/api/production-schedule/<int:sid>/substitute/<int:sub_id>` | `undo_substitute_production_material` · [app.py](../../MES_프로토타입_20260916/app.py#L2564) |  |
| GET | `/tv/production` | `tv_production` · [app.py](../../MES_프로토타입_20260916/app.py#L2588) |  |
| GET | `/api/purchase-stock` | `purchase_stock_report` · [app.py](../../MES_프로토타입_20260916/app.py#L2593) | date |
| GET | `/api/purchase-stock-range` | `purchase_stock_range_report` · [app.py](../../MES_프로토타입_20260916/app.py#L2621) | end, start |
| GET | `/api/production/feasibility` | `production_feasibility` · [app.py](../../MES_프로토타입_20260916/app.py#L2819) | date |
| GET | `/api/materials/stock-as-of` | `materials_stock_as_of` · [app.py](../../MES_프로토타입_20260916/app.py#L2925) | date |
| POST | `/api/materials/receiving` | `register_receiving` · [app.py](../../MES_프로토타입_20260916/app.py#L2984) | material_code, qty, receive_date |
| GET | `/api/materials/receiving` | `list_receiving` · [app.py](../../MES_프로토타입_20260916/app.py#L3015) | client_q, date, end, kind, material_q, start |
| DELETE | `/api/materials/receiving/<int:rid>` | `cancel_receiving` · [app.py](../../MES_프로토타입_20260916/app.py#L3067) |  |
| POST | `/api/materials/receiving/bulk` | `register_receiving_bulk` · [app.py](../../MES_프로토타입_20260916/app.py#L3152) | is_return, items, receive_date |
| GET | `/api/materials/receiving/<int:rid>/attachments` | `receiving_attachments` · [app.py](../../MES_프로토타입_20260916/app.py#L3254) |  |
| GET | `/api/materials/purchase-order` | `list_purchase_orders` · [app.py](../../MES_프로토타입_20260916/app.py#L3260) | client_q, date, end, material_q, received, start |
| POST | `/api/materials/purchase-order/bulk` | `register_purchase_order_bulk` · [app.py](../../MES_프로토타입_20260916/app.py#L3298) | items, order_date, source |
| DELETE | `/api/materials/purchase-order/<int:pid>` | `cancel_purchase_order` · [app.py](../../MES_프로토타입_20260916/app.py#L3339) |  |
| GET | `/api/logistics-schedule` | `list_logistics_schedule` · [app.py](../../MES_프로토타입_20260916/app.py#L3354) | date |
| POST | `/api/logistics-schedule/<int:sid>/actual-qty` | `update_logistics_actual_qty` · [app.py](../../MES_프로토타입_20260916/app.py#L3463) | actual_qty |
| POST | `/api/production-schedule/<int:sid>/logistics-actual-qty` | `update_production_logistics_actual_qty` · [app.py](../../MES_프로토타입_20260916/app.py#L3487) | actual_qty |
| POST | `/api/logistics-schedule` | `create_logistics_schedule` · [app.py](../../MES_프로토타입_20260916/app.py#L3508) | client_name, lot_id, note, order_qty, product_code, product_name, schedule_date, source_order_id, spec |
| POST | `/api/logistics-schedule/<int:sid>` | `update_logistics_schedule` · [app.py](../../MES_프로토타입_20260916/app.py#L3568) | client_name, note, order_qty, product_code, product_name, spec |
| POST | `/api/logistics-schedule/<int:sid>/lot` | `set_logistics_lot` · [app.py](../../MES_프로토타입_20260916/app.py#L3584) | lot_id |
| DELETE | `/api/logistics-schedule/<int:sid>` | `delete_logistics_schedule` · [app.py](../../MES_프로토타입_20260916/app.py#L3599) |  |
| GET | `/tv/logistics` | `tv_logistics` · [app.py](../../MES_프로토타입_20260916/app.py#L3613) |  |
| GET | `/api/products/stock` | `list_products_stock` · [app.py](../../MES_프로토타입_20260916/app.py#L3618) | client_name, q, sort |
| GET | `/api/products/stock-as-of` | `products_stock_as_of` · [app.py](../../MES_프로토타입_20260916/app.py#L3653) | client_name, date |
| GET | `/api/products/<code>/lots` | `list_product_lots` · [app.py](../../MES_프로토타입_20260916/app.py#L3759) |  |
| GET | `/api/logistics-schedule/<int:sid>/lot-allocation` | `get_lot_allocation` · [app.py](../../MES_프로토타입_20260916/app.py#L3954) |  |
| POST | `/api/logistics-schedule/<int:sid>/lot-allocation` | `save_lot_allocation` · [app.py](../../MES_프로토타입_20260916/app.py#L3966) | allocations |
| POST | `/api/logistics-schedule/<int:sid>/confirm-shipment` | `confirm_manual_shipment` · [app.py](../../MES_프로토타입_20260916/app.py#L4116) | charter_amount, charter_info, driver_name, note, packing_method, vehicle, visit_order |
| POST | `/api/production-schedule/<int:sid>/confirm-shipment` | `confirm_production_shipment` · [app.py](../../MES_프로토타입_20260916/app.py#L4148) | charter_amount, charter_info, driver_name, note, packing_method, vehicle, visit_order |
| POST | `/api/logistics-schedule/<int:sid>/unconfirm-shipment` | `unconfirm_manual_shipment` · [app.py](../../MES_프로토타입_20260916/app.py#L4176) |  |
| POST | `/api/production-schedule/<int:sid>/unconfirm-shipment` | `unconfirm_production_shipment` · [app.py](../../MES_프로토타입_20260916/app.py#L4194) |  |
| GET | `/api/departments` | `list_departments` · [app.py](../../MES_프로토타입_20260916/app.py#L4208) |  |
| GET | `/api/employees` | `list_employees` · [app.py](../../MES_프로토타입_20260916/app.py#L4273) |  |
| GET | `/api/employees/<int:eid>/resident-no` | `get_employee_resident_no` · [app.py](../../MES_프로토타입_20260916/app.py#L4293) |  |
| POST | `/api/employees` | `create_employee` · [app.py](../../MES_프로토타입_20260916/app.py#L4311) | name, password, permissions, recipe_permission, resident_no, username |
| POST | `/api/employees/<int:eid>` | `update_employee` · [app.py](../../MES_프로토타입_20260916/app.py#L4370) | name, resident_no |
| POST | `/api/employees/<int:eid>/account` | `update_employee_account` · [app.py](../../MES_프로토타입_20260916/app.py#L4410) | password, permissions, recipe_permission, username |
| DELETE | `/api/employees/<int:eid>/account` | `revoke_employee_account` · [app.py](../../MES_프로토타입_20260916/app.py#L4452) |  |
| DELETE | `/api/employees/<int:eid>` | `delete_employee` · [app.py](../../MES_프로토타입_20260916/app.py#L4476) |  |
| GET | `/api/hr/leave` | `list_leave` · [app.py](../../MES_프로토타입_20260916/app.py#L4566) | date |
| GET | `/api/hr/leave/<int:eid>` | `leave_detail` · [app.py](../../MES_프로토타입_20260916/app.py#L4603) | date |
| POST | `/api/hr/leave` | `create_leave` · [app.py](../../MES_프로토타입_20260916/app.py#L4641) | days, employee_id, leave_date, note |
| DELETE | `/api/hr/leave/record/<int:rid>` | `delete_leave` · [app.py](../../MES_프로토타입_20260916/app.py#L4692) |  |
| GET | `/api/sales-order` | `list_sales_order` · [app.py](../../MES_프로토타입_20260916/app.py#L4701) | date, date_field, end, pending_only, product_name, start |
| POST | `/api/sales-order` | `create_sales_order` · [app.py](../../MES_프로토타입_20260916/app.py#L4766) | client_name, note, order_date, order_qty, product_code, product_name, production_date, spec |
| POST | `/api/sales-order/<int:sid>` | `update_sales_order` · [app.py](../../MES_프로토타입_20260916/app.py#L4801) | client_name, note, order_qty, product_code, product_name, production_date, spec |
| DELETE | `/api/sales-order/<int:sid>` | `delete_sales_order` · [app.py](../../MES_프로토타입_20260916/app.py#L4831) |  |
| POST | `/api/sales-order/<int:sid>/mark-imported` | `mark_sales_order_imported` · [app.py](../../MES_프로토타입_20260916/app.py#L4840) | target |
| GET | `/api/warehouse-moves/lookup` | `lookup_warehouse_move` · [app.py](../../MES_프로토타입_20260916/app.py#L4925) | barcode |
| POST | `/api/warehouse-moves` | `create_warehouse_move` · [app.py](../../MES_프로토타입_20260916/app.py#L4964) | barcode, material_code, moved_date, pack_count, to_warehouse |
| GET | `/api/warehouse-moves` | `list_warehouse_moves` · [app.py](../../MES_프로토타입_20260916/app.py#L5016) | date |
| DELETE | `/api/warehouse-moves/<int:mid>` | `delete_warehouse_move` · [app.py](../../MES_프로토타입_20260916/app.py#L5025) |  |
| GET | `/api/warehouses` | `list_warehouses` · [app.py](../../MES_프로토타입_20260916/app.py#L5059) |  |
| POST | `/api/warehouses` | `create_warehouse` · [app.py](../../MES_프로토타입_20260916/app.py#L5069) | memo, name |
| POST | `/api/warehouses/<int:wid>` | `update_warehouse` · [app.py](../../MES_프로토타입_20260916/app.py#L5090) | is_receiving, memo, name |
| DELETE | `/api/warehouses/<int:wid>` | `delete_warehouse` · [app.py](../../MES_프로토타입_20260916/app.py#L5146) |  |
| GET | `/api/packing-methods` | `list_packing_methods` · [app.py](../../MES_프로토타입_20260916/app.py#L5166) |  |
| POST | `/api/packing-methods` | `create_packing_method` · [app.py](../../MES_프로토타입_20260916/app.py#L5172) | name |
| DELETE | `/api/packing-methods/<int:pid>` | `delete_packing_method` · [app.py](../../MES_프로토타입_20260916/app.py#L5197) |  |
| GET | `/api/vehicles` | `list_vehicles` · [app.py](../../MES_프로토타입_20260916/app.py#L5206) |  |
| POST | `/api/vehicles` | `create_vehicle` · [app.py](../../MES_프로토타입_20260916/app.py#L5212) | name |
| DELETE | `/api/vehicles/<int:vid>` | `delete_vehicle` · [app.py](../../MES_프로토타입_20260916/app.py#L5237) |  |
| GET | `/api/client-master` | `list_clients` · [app.py](../../MES_프로토타입_20260916/app.py#L5272) |  |
| POST | `/api/client-master` | `create_client` · [app.py](../../MES_프로토타입_20260916/app.py#L5281) | address, address_detail, business_item, business_no, business_type, ceo_name, client_type, email, fax, memo, mobile, name, phone, zipcode |
| POST | `/api/client-master/<int:cid>` | `update_client` · [app.py](../../MES_프로토타입_20260916/app.py#L5318) | address, address_detail, business_item, business_no, business_type, ceo_name, client_type, email, fax, memo, mobile, name, phone, zipcode |
| DELETE | `/api/client-master/<int:cid>` | `delete_client` · [app.py](../../MES_프로토타입_20260916/app.py#L5345) |  |
| GET | `/api/client-master/export-excel` | `export_clients_excel` · [app.py](../../MES_프로토타입_20260916/app.py#L5375) |  |
| POST | `/api/client-master/upload-excel` | `upload_clients_excel` · [app.py](../../MES_프로토타입_20260916/app.py#L5433) |  |
| GET | `/api/production-status` | `production_status` · [app.py](../../MES_프로토타입_20260916/app.py#L5524) | client_name, end, product_name, start |
| GET | `/api/shipment-status` | `shipment_status` · [app.py](../../MES_프로토타입_20260916/app.py#L5550) | client_name, end, product_name, start |
| GET | `/api/dashboard-memos` | `list_dashboard_memos` · [app.py](../../MES_프로토타입_20260916/app.py#L5638) | end, start |
| POST | `/api/dashboard-memos` | `create_dashboard_memo` · [app.py](../../MES_프로토타입_20260916/app.py#L5665) | content, is_shared, memo_date, title |
| POST | `/api/dashboard-memos/<int:mid>` | `update_dashboard_memo` · [app.py](../../MES_프로토타입_20260916/app.py#L5687) | content, title |
| DELETE | `/api/dashboard-memos/<int:mid>` | `delete_dashboard_memo` · [app.py](../../MES_프로토타입_20260916/app.py#L5712) |  |
| GET | `/api/holidays` | `list_holidays` · [app.py](../../MES_프로토타입_20260916/app.py#L5758) | year |
| GET | `/api/charter-summary` | `charter_summary` · [app.py](../../MES_프로토타입_20260916/app.py#L5768) | end, start |
| GET | `/api/materials/receiving-status` | `materials_receiving_status` · [app.py](../../MES_프로토타입_20260916/app.py#L5794) | client_q, end, material_q, start |
| GET | `/api/materials/receiving-status/detail` | `materials_receiving_status_detail` · [app.py](../../MES_프로토타입_20260916/app.py#L5819) | client_q, end, material_code, start |
| GET | `/api/server-settings` | `list_server_settings` · [app.py](../../MES_프로토타입_20260916/app.py#L5867) |  |
| POST | `/api/server-settings/<service_key>` | `update_server_settings` · [app.py](../../MES_프로토타입_20260916/app.py#L5886) | api_key, api_secret, base_url, service_name |
| POST | `/api/tax-invoice/issue-single` | `issue_tax_invoice_single` · [app.py](../../MES_프로토타입_20260916/app.py#L5934) |  |
| POST | `/api/tax-invoice/issue-batch` | `issue_tax_invoice_batch` · [app.py](../../MES_프로토타입_20260916/app.py#L5946) |  |

## attachments.py (17)

| 메서드 | 경로 | 핸들러 / 소스 | 입력 키 후보 |
|---|---|---|---|
| POST | `/api/attachments` | `upload_attachment` · [attachments.py](../../MES_프로토타입_20260916/attachments.py#L334) |  |
| GET | `/api/attachments` | `list_attachment_api` · [attachments.py](../../MES_프로토타입_20260916/attachments.py#L368) | ref_id, scope |
| GET | `/api/attachments/<int:aid>/download` | `download_attachment` · [attachments.py](../../MES_프로토타입_20260916/attachments.py#L385) |  |
| DELETE | `/api/attachments/<int:aid>` | `delete_attachment` · [attachments.py](../../MES_프로토타입_20260916/attachments.py#L427) |  |
| GET | `/api/doc-folders` | `list_doc_folders` · [attachments.py](../../MES_프로토타입_20260916/attachments.py#L455) |  |
| POST | `/api/doc-folders` | `create_doc_folder` · [attachments.py](../../MES_프로토타입_20260916/attachments.py#L561) | department, kind, name, parent_id |
| POST | `/api/doc-folders/<int:fid>` | `rename_doc_folder` · [attachments.py](../../MES_프로토타입_20260916/attachments.py#L618) | name |
| DELETE | `/api/doc-folders/<int:fid>` | `delete_doc_folder` · [attachments.py](../../MES_프로토타입_20260916/attachments.py#L641) |  |
| POST | `/api/doc-folders/<int:fid>/lock` | `set_doc_folder_lock` · [attachments.py](../../MES_프로토타입_20260916/attachments.py#L668) | current, password |
| DELETE | `/api/doc-folders/<int:fid>/lock` | `clear_doc_folder_lock` · [attachments.py](../../MES_프로토타입_20260916/attachments.py#L706) | current |
| POST | `/api/doc-folders/<int:fid>/unlock` | `unlock_doc_folder` · [attachments.py](../../MES_프로토타입_20260916/attachments.py#L729) | password |
| GET | `/api/doc-folders/<int:fid>/files` | `list_doc_folder_files` · [attachments.py](../../MES_프로토타입_20260916/attachments.py#L752) |  |
| POST | `/api/document-shares` | `create_document_share` · [attachments.py](../../MES_프로토타입_20260916/attachments.py#L809) | attachment_id, expires_at, folder_id, note, to_employee_ids |
| GET | `/api/document-shares/people` | `list_share_people` · [attachments.py](../../MES_프로토타입_20260916/attachments.py#L898) |  |
| GET | `/api/document-shares/mine` | `list_my_document_shares` · [attachments.py](../../MES_프로토타입_20260916/attachments.py#L912) |  |
| GET | `/api/document-shares/by-me` | `list_document_shares_by_me` · [attachments.py](../../MES_프로토타입_20260916/attachments.py#L951) |  |
| DELETE | `/api/document-shares/<int:sid>` | `delete_document_share` · [attachments.py](../../MES_프로토타입_20260916/attachments.py#L976) |  |

## auth.py (5)

| 메서드 | 경로 | 핸들러 / 소스 | 입력 키 후보 |
|---|---|---|---|
| GET | `/login` | `login_page` · [auth.py](../../MES_프로토타입_20260916/auth.py#L114) |  |
| POST | `/api/login` | `api_login` · [auth.py](../../MES_프로토타입_20260916/auth.py#L121) | password, username |
| POST | `/api/logout` | `api_logout` · [auth.py](../../MES_프로토타입_20260916/auth.py#L164) |  |
| GET | `/api/me` | `api_me` · [auth.py](../../MES_프로토타입_20260916/auth.py#L170) |  |
| POST | `/api/me/password` | `change_my_password` · [auth.py](../../MES_프로토타입_20260916/auth.py#L237) | current_password, new_password |

## chat.py (12)

| 메서드 | 경로 | 핸들러 / 소스 | 입력 키 후보 |
|---|---|---|---|
| GET | `/api/chat/employees` | `chat_list_employees` · [chat.py](../../MES_프로토타입_20260916/chat.py#L34) |  |
| GET | `/api/chat/rooms` | `chat_list_rooms` · [chat.py](../../MES_프로토타입_20260916/chat.py#L45) |  |
| POST | `/api/chat/rooms` | `chat_create_room` · [chat.py](../../MES_프로토타입_20260916/chat.py#L100) | member_ids, name, password |
| GET | `/api/chat/rooms/<int:room_id>/members` | `chat_get_room_members` · [chat.py](../../MES_프로토타입_20260916/chat.py#L274) |  |
| POST | `/api/chat/rooms/<int:room_id>/invite` | `chat_invite_members` · [chat.py](../../MES_프로토타입_20260916/chat.py#L292) | member_ids |
| GET | `/api/chat/rooms/<int:room_id>/messages/search` | `chat_search_messages` · [chat.py](../../MES_프로토타입_20260916/chat.py#L341) | q, room_password |
| GET | `/api/chat/rooms/<int:room_id>/messages` | `chat_get_messages` · [chat.py](../../MES_프로토타입_20260916/chat.py#L373) | after_id, room_password |
| POST | `/api/chat/rooms/<int:room_id>/messages` | `chat_send_message` · [chat.py](../../MES_프로토타입_20260916/chat.py#L409) | content, file, filename, mime_type, room_password |
| POST | `/api/chat/rooms/<int:room_id>/read` | `chat_mark_read` · [chat.py](../../MES_프로토타입_20260916/chat.py#L463) |  |
| POST | `/api/chat/rooms/<int:room_id>/unlock` | `chat_unlock_room` · [chat.py](../../MES_프로토타입_20260916/chat.py#L483) | password |
| POST | `/api/chat/rooms/<int:room_id>/password` | `chat_set_room_password` · [chat.py](../../MES_프로토타입_20260916/chat.py#L505) | password |
| GET | `/api/chat/files/<int:message_id>` | `chat_download_file` · [chat.py](../../MES_프로토타입_20260916/chat.py#L537) | room_password |

## label.py (32)

| 메서드 | 경로 | 핸들러 / 소스 | 입력 키 후보 |
|---|---|---|---|
| GET | `/api/products/<code>/label` | `get_product_label` · [label.py](../../MES_프로토타입_20260916/label.py#L136) |  |
| POST | `/api/products/<code>/label` | `update_product_label` · [label.py](../../MES_프로토타입_20260916/label.py#L153) | allergens, extra, food_type, ingredients_text, manufacture_report_no, net_weight, packaging_material, shelf_life_months, shelf_life_unit, storage, version_id |
| GET | `/api/products/<code>/label-versions` | `list_product_label_versions` · [label.py](../../MES_프로토타입_20260916/label.py#L235) |  |
| POST | `/api/products/<code>/label-versions` | `add_product_label_version` · [label.py](../../MES_프로토타입_20260916/label.py#L257) | from_version_id, note, version_label |
| GET | `/api/label-versions/<int:vid>` | `get_label_version` · [label.py](../../MES_프로토타입_20260916/label.py#L315) |  |
| POST | `/api/label-versions/<int:vid>/info` | `rename_label_version` · [label.py](../../MES_프로토타입_20260916/label.py#L336) | note, version_label |
| POST | `/api/label-versions/<int:vid>/use` | `use_label_version` · [label.py](../../MES_프로토타입_20260916/label.py#L368) |  |
| DELETE | `/api/label-versions/<int:vid>` | `delete_label_version` · [label.py](../../MES_프로토타입_20260916/label.py#L386) |  |
| GET | `/api/products/<code>/label-layout` | `get_product_label_layout` · [label.py](../../MES_프로토타입_20260916/label.py#L410) |  |
| POST | `/api/products/<code>/label-layout` | `update_product_label_layout` · [label.py](../../MES_프로토타입_20260916/label.py#L424) | version_id |
| GET | `/api/label-templates` | `list_label_templates` · [label.py](../../MES_프로토타입_20260916/label.py#L511) |  |
| POST | `/api/label-templates` | `save_label_template` · [label.py](../../MES_프로토타입_20260916/label.py#L519) | layout, name, size |
| POST | `/api/label-templates/<int:template_id>` | `update_label_template` · [label.py](../../MES_프로토타입_20260916/label.py#L545) | layout, name, size |
| GET | `/api/label-marks` | `list_label_marks` · [label.py](../../MES_프로토타입_20260916/label.py#L584) |  |
| POST | `/api/label-marks` | `add_label_mark` · [label.py](../../MES_프로토타입_20260916/label.py#L595) | data_url, name, width_mm |
| DELETE | `/api/label-marks/<int:mark_id>` | `delete_label_mark` · [label.py](../../MES_프로토타입_20260916/label.py#L628) |  |
| GET | `/api/label-fields` | `list_label_fields` · [label.py](../../MES_프로토타입_20260916/label.py#L648) |  |
| POST | `/api/label-fields` | `add_label_field` · [label.py](../../MES_프로토타입_20260916/label.py#L654) |  |
| DELETE | `/api/label-fields/<int:field_id>` | `delete_label_field` · [label.py](../../MES_프로토타입_20260916/label.py#L672) |  |
| GET | `/api/label-templates/<int:template_id>/usage` | `label_template_usage` · [label.py](../../MES_프로토타입_20260916/label.py#L696) |  |
| GET | `/api/label-templates/<int:template_id>` | `get_label_template` · [label.py](../../MES_프로토타입_20260916/label.py#L708) |  |
| DELETE | `/api/label-templates/<int:template_id>` | `delete_label_template` · [label.py](../../MES_프로토타입_20260916/label.py#L721) |  |
| GET | `/api/label-company-info` | `get_label_company_info` · [label.py](../../MES_프로토타입_20260916/label.py#L730) |  |
| POST | `/api/label-company-info` | `update_label_company_info` · [label.py](../../MES_프로토타입_20260916/label.py#L739) | business_address, business_name, customer_service_phone, notice_text, return_exchange_location |
| GET | `/api/label-source-products` | `list_label_source_products` · [label.py](../../MES_프로토타입_20260916/label.py#L757) | exclude, q |
| GET | `/api/label-register/products` | `list_label_register_products` · [label.py](../../MES_프로토타입_20260916/label.py#L783) | q |
| GET | `/api/label-requests` | `list_label_requests` · [label.py](../../MES_프로토타입_20260916/label.py#L823) | status |
| GET | `/api/label-requests/<int:rid>` | `get_label_request` · [label.py](../../MES_프로토타입_20260916/label.py#L853) |  |
| POST | `/api/label-requests/<int:rid>` | `update_label_request` · [label.py](../../MES_프로토타입_20260916/label.py#L885) | allergens, extra, food_type, ingredients_text, layout, manufacture_report_no, net_weight, note, packaging_material, product_name, shelf_life_months, shelf_life_unit, status, storage |
| POST | `/api/label-requests/<int:rid>/move-to-product` | `move_label_request_to_product` · [label.py](../../MES_프로토타입_20260916/label.py#L930) | product_code |
| GET | `/api/products/<code>/label-print-date` | `get_product_label_print_date` · [label.py](../../MES_프로토타입_20260916/label.py#L998) |  |
| GET | `/api/label-print/by-date` | `label_print_by_date` · [label.py](../../MES_프로토타입_20260916/label.py#L1018) | date |

## recipe.py (21)

| 메서드 | 경로 | 핸들러 / 소스 | 입력 키 후보 |
|---|---|---|---|
| GET | `/api/recipe-clients` | `list_recipe_clients` · [recipe.py](../../MES_프로토타입_20260916/recipe.py#L55) |  |
| POST | `/api/recipe-clients` | `save_recipe_client` · [recipe.py](../../MES_프로토타입_20260916/recipe.py#L82) | client_name, sales_emp_id |
| GET | `/api/recipe-sales-reps` | `list_recipe_sales_reps` · [recipe.py](../../MES_프로토타입_20260916/recipe.py#L125) |  |
| GET | `/api/recipe-drafts` | `list_recipe_drafts` · [recipe.py](../../MES_프로토타입_20260916/recipe.py#L139) | category, client_name, client_q, q, sale_type, stage |
| GET | `/api/recipe-drafts/<int:did>` | `get_recipe_draft` · [recipe.py](../../MES_프로토타입_20260916/recipe.py#L223) |  |
| GET | `/api/recipe-versions/<int:vid>` | `get_recipe_version` · [recipe.py](../../MES_프로토타입_20260916/recipe.py#L248) |  |
| POST | `/api/recipe-drafts` | `create_recipe_draft` · [recipe.py](../../MES_프로토타입_20260916/recipe.py#L314) | bom, category, client_name, name, note, remark, sale_type, spec |
| POST | `/api/recipe-drafts/<int:did>` | `update_recipe_draft` · [recipe.py](../../MES_프로토타입_20260916/recipe.py#L351) | category, name, note, remark, sale_type, spec |
| POST | `/api/recipe-versions/<int:vid>/stage` | `set_recipe_version_stage` · [recipe.py](../../MES_프로토타입_20260916/recipe.py#L376) | stage |
| GET | `/api/recipe-drafts/<int:did>/stage-logs` | `get_recipe_stage_logs` · [recipe.py](../../MES_프로토타입_20260916/recipe.py#L411) |  |
| GET | `/api/recipe-handoffs` | `list_recipe_handoffs` · [recipe.py](../../MES_프로토타입_20260916/recipe.py#L482) | draft_id, end, kind, start |
| POST | `/api/recipe-handoffs` | `create_recipe_handoff` · [recipe.py](../../MES_프로토타입_20260916/recipe.py#L535) | kind, version_id |
| POST | `/api/recipe-drafts/<int:did>/versions` | `add_recipe_version` · [recipe.py](../../MES_프로토타입_20260916/recipe.py#L658) | note |
| POST | `/api/recipe-versions/<int:vid>` | `update_recipe_version` · [recipe.py](../../MES_프로토타입_20260916/recipe.py#L701) | bom, note |
| DELETE | `/api/recipe-drafts/<int:did>` | `delete_recipe_draft` · [recipe.py](../../MES_프로토타입_20260916/recipe.py#L728) |  |
| GET | `/api/recipe-shares` | `list_recipe_shares` · [recipe.py](../../MES_프로토타입_20260916/recipe.py#L746) |  |
| POST | `/api/recipe-shares` | `create_recipe_share` · [recipe.py](../../MES_프로토타입_20260916/recipe.py#L766) | draft_id, employee_id, expires_at, version_id |
| DELETE | `/api/recipe-shares/<int:sid>` | `revoke_recipe_share` · [recipe.py](../../MES_프로토타입_20260916/recipe.py#L803) |  |
| GET | `/api/recipe-shares/mine` | `my_recipe_shares` · [recipe.py](../../MES_프로토타입_20260916/recipe.py#L814) |  |
| GET | `/api/recipe-drafts/<int:did>/shared-view` | `view_shared_recipe_draft` · [recipe.py](../../MES_프로토타입_20260916/recipe.py#L832) |  |
| GET | `/api/recipe-versions/<int:vid>/export-excel` | `export_recipe_version_excel` · [recipe.py](../../MES_프로토타입_20260916/recipe.py#L879) |  |

## sales.py (6)

| 메서드 | 경로 | 핸들러 / 소스 | 입력 키 후보 |
|---|---|---|---|
| GET | `/api/sales/shippable` | `sales_shippable` · [sales.py](../../MES_프로토타입_20260916/sales.py#L71) | client_name, end, start |
| POST | `/api/sales/pull` | `sales_pull` · [sales.py](../../MES_프로토타입_20260916/sales.py#L83) | items |
| POST | `/api/sales` | `sales_create` · [sales.py](../../MES_프로토타입_20260916/sales.py#L130) | client_name, note, product_name, qty, sale_date, unit_price |
| GET | `/api/sales` | `sales_list` · [sales.py](../../MES_프로토타입_20260916/sales.py#L199) | client_name, end, product_name, start |
| GET | `/api/sales/total` | `sales_total` · [sales.py](../../MES_프로토타입_20260916/sales.py#L254) | client_name, end, product_name, start |
| DELETE | `/api/sales/<int:sid>` | `sales_delete` · [sales.py](../../MES_프로토타입_20260916/sales.py#L297) |  |

## temperature.py (14)

| 메서드 | 경로 | 핸들러 / 소스 | 입력 키 후보 |
|---|---|---|---|
| GET | `/api/temp/settings` | `get_temp_settings` · [temperature.py](../../MES_프로토타입_20260916/temperature.py#L84) |  |
| GET | `/api/temp/sensors` | `list_temp_sensors` · [temperature.py](../../MES_프로토타입_20260916/temperature.py#L93) |  |
| POST | `/api/temp/sensors` | `create_temp_sensor` · [temperature.py](../../MES_프로토타입_20260916/temperature.py#L99) | group_name, max_temp, min_temp, name, sensor_id |
| POST | `/api/temp/sensors/bulk` | `create_temp_sensors_bulk` · [temperature.py](../../MES_프로토타입_20260916/temperature.py#L119) | items |
| POST | `/api/temp/sensors/<int:sid>` | `update_temp_sensor` · [temperature.py](../../MES_프로토타입_20260916/temperature.py#L146) | group_name, max_temp, min_temp, name, sensor_id |
| POST | `/api/temp/sensors/<int:sid>/group` | `set_temp_sensor_group` · [temperature.py](../../MES_프로토타입_20260916/temperature.py#L163) | group_name |
| DELETE | `/api/temp/sensors/<int:sid>` | `delete_temp_sensor` · [temperature.py](../../MES_프로토타입_20260916/temperature.py#L176) |  |
| GET | `/api/temp/groups` | `list_temp_groups` · [temperature.py](../../MES_프로토타입_20260916/temperature.py#L185) |  |
| POST | `/api/temp/groups` | `create_temp_group` · [temperature.py](../../MES_프로토타입_20260916/temperature.py#L201) | name |
| POST | `/api/temp/groups/<path:name>/refresh-interval` | `set_temp_group_refresh_interval` · [temperature.py](../../MES_프로토타입_20260916/temperature.py#L215) | seconds |
| DELETE | `/api/temp/groups/<path:name>` | `delete_temp_group` · [temperature.py](../../MES_프로토타입_20260916/temperature.py#L230) |  |
| POST | `/api/temp/groups/<path:name>/rename` | `rename_temp_group` · [temperature.py](../../MES_프로토타입_20260916/temperature.py#L241) | new_name |
| GET | `/api/temp/channels` | `list_temp_channels` · [temperature.py](../../MES_프로토타입_20260916/temperature.py#L265) | rows |
| GET | `/api/temp/readings` | `get_temp_readings` · [temperature.py](../../MES_프로토타입_20260916/temperature.py#L282) | force, rows |

