# DB 구조와 전환 주의사항

생성일: 2026-09-18. `.db`는 읽기 전용으로 열어 테이블·컬럼·인덱스·외래키 메타데이터만 확인했다. 업무 데이터와 비밀키 값은 조회하지 않았다. `schema.sql`은 메모리 DB에만 적용했다.

| 기준 | 사용자 테이블 | 컬럼 합계 | 선언된 외래키 항목 |
|---|---:|---:|---:|
| sample.db | 60 | 614 | 0 |
| songyeon.db | 60 | 614 | 0 |
| schema.sql | 60 | 614 | 0 |

`schema.py`는 기동 시 DDL과 보정 작업을 수행하므로 현재 파일 스키마와 기동 후 스키마는 다를 수 있다. 이번 분석에서 앱 기동이나 보정 작업은 실행하지 않았다.

## 스키마 차이

- songyeon.db ↔ sample.db: 현재 DB에만 있는 테이블 없음; 비교 대상에만 있는 테이블 없음; 컬럼 정의가 다른 테이블 없음.
- songyeon.db ↔ schema.sql: 현재 DB에만 있는 테이블 없음; 비교 대상에만 있는 테이블 없음; 컬럼 정의가 다른 테이블 없음.

## 이관 기준

- 신규 DB는 PostgreSQL로 확정했다(2026-09-18). PostgreSQL DB를 생성한 뒤 이 SQLite 자료를 옮긴다. 신규 스키마와 이관은 아직 수행하지 않았다.
- `schema.py`의 CREATE/ALTER/보정 순서를 버전별 마이그레이션으로 분리하고 초기 데이터 생성은 별도로 관리한다.
- `TEXT` 날짜·수량·JSON, `REAL` 금액, 정수 플래그를 실제 값의 형식과 업무 단위에 따라 재설계한다. 필드명만 보고 일괄 캐스팅하지 않는다.
- 업무 코드와 이름으로 연결된 관계는 먼저 누락·중복·고아 레코드를 점검한 뒤 FK/UNIQUE를 추가한다. 아래는 선언된 제약이며 업무상 모든 관계를 뜻하지 않는다.
- 기존 ID, 로트, 창고, 거래처·품목 코드, 첨부파일 경로를 보존하고 이관 후 시퀀스를 재설정한다.
- 수량 합계, 창고별·로트별 잔량, 생산 투입/취소, 출하/취소, 금액·세액을 대조한다. 행 수 일치만으로 이관 완료를 판정하지 않는다.

## 테이블 상세 — 현재 songyeon.db 기준

아래 기본값은 스키마의 DEFAULT 표현식이다. 실제 저장된 사용자 데이터가 아니다. PK=기본키 순번, NOT NULL은 PRAGMA 선언값이며 SQLite 기본키의 의미와 함께 해석한다.

### acc_bank_account

| 컬럼 | SQLite 타입 | NOT NULL | 기본값 | PK |
|---|---|---|---|---:|
| `id` | INTEGER | False | — | 1 |
| `bank_name` | TEXT | False | — | 0 |
| `account_no` | TEXT | False | — | 0 |
| `holder` | TEXT | False | — | 0 |
| `purpose` | TEXT | False | — | 0 |
| `note` | TEXT | False | — | 0 |
| `active` | INTEGER | False | 1 | 0 |
| `sort_order` | INTEGER | False | 0 | 0 |
| `created_at` | TEXT | False | — | 0 |

인덱스: 별도 선언 없음.
외래키: 선언 없음.

### acc_card

| 컬럼 | SQLite 타입 | NOT NULL | 기본값 | PK |
|---|---|---|---|---:|
| `id` | INTEGER | False | — | 1 |
| `issuer` | TEXT | False | — | 0 |
| `last4` | TEXT | False | — | 0 |
| `nickname` | TEXT | False | — | 0 |
| `holder` | TEXT | False | — | 0 |
| `bank_account_id` | INTEGER | False | — | 0 |
| `note` | TEXT | False | — | 0 |
| `active` | INTEGER | False | 1 | 0 |
| `sort_order` | INTEGER | False | 0 | 0 |
| `created_at` | TEXT | False | — | 0 |

인덱스: 별도 선언 없음.
외래키: 선언 없음.

### acc_subject

| 컬럼 | SQLite 타입 | NOT NULL | 기본값 | PK |
|---|---|---|---|---:|
| `id` | INTEGER | False | — | 1 |
| `code` | TEXT | False | — | 0 |
| `name` | TEXT | False | — | 0 |
| `category` | TEXT | False | — | 0 |
| `direction` | TEXT | False | — | 0 |
| `note` | TEXT | False | — | 0 |
| `active` | INTEGER | False | 1 | 0 |
| `sort_order` | INTEGER | False | 0 | 0 |
| `created_at` | TEXT | False | — | 0 |

인덱스: `idx_acc_subject_code` (unique=True).
외래키: 선언 없음.

### acc_transaction

| 컬럼 | SQLite 타입 | NOT NULL | 기본값 | PK |
|---|---|---|---|---:|
| `id` | INTEGER | False | — | 1 |
| `kind` | TEXT | False | — | 0 |
| `tx_date` | TEXT | False | — | 0 |
| `client_name` | TEXT | False | — | 0 |
| `subject_id` | INTEGER | False | — | 0 |
| `amount` | REAL | False | — | 0 |
| `method` | TEXT | False | — | 0 |
| `bank_account_id` | INTEGER | False | — | 0 |
| `card_id` | INTEGER | False | — | 0 |
| `note` | TEXT | False | — | 0 |
| `created_by` | TEXT | False | — | 0 |
| `created_at` | TEXT | False | — | 0 |

인덱스: `idx_acc_tx_kind` (unique=False), `idx_acc_tx_client` (unique=False), `idx_acc_tx_date` (unique=False).
외래키: 선언 없음.

### app_settings

| 컬럼 | SQLite 타입 | NOT NULL | 기본값 | PK |
|---|---|---|---|---:|
| `key` | TEXT | False | — | 1 |
| `value` | TEXT | False | — | 0 |

인덱스: `sqlite_autoindex_app_settings_1` (unique=True).
외래키: 선언 없음.

### attachment

| 컬럼 | SQLite 타입 | NOT NULL | 기본값 | PK |
|---|---|---|---|---:|
| `id` | INTEGER | False | — | 1 |
| `scope` | TEXT | False | — | 0 |
| `ref_id` | TEXT | False | — | 0 |
| `orig_name` | TEXT | False | — | 0 |
| `stored_name` | TEXT | False | — | 0 |
| `size_bytes` | INTEGER | False | — | 0 |
| `uploaded_by` | TEXT | False | — | 0 |
| `created_at` | TEXT | False | — | 0 |

인덱스: `idx_attachment_ref` (unique=False).
외래키: 선언 없음.

### bom

| 컬럼 | SQLite 타입 | NOT NULL | 기본값 | PK |
|---|---|---|---|---:|
| `product_code` | TEXT | False | — | 0 |
| `material_code` | TEXT | False | — | 0 |
| `material_name` | TEXT | False | — | 0 |
| `ratio_percent` | REAL | False | — | 0 |
| `unit_price_per_kg` | REAL | False | — | 0 |
| `amount_per_kg` | REAL | False | — | 0 |
| `rank_in_product` | INTEGER | False | — | 0 |

인덱스: 별도 선언 없음.
외래키: 선언 없음.

### bom_change_log

| 컬럼 | SQLite 타입 | NOT NULL | 기본값 | PK |
|---|---|---|---|---:|
| `id` | INTEGER | False | — | 1 |
| `product_code` | TEXT | False | — | 0 |
| `changed_at` | TEXT | False | — | 0 |
| `old_bom_json` | TEXT | False | — | 0 |
| `new_bom_json` | TEXT | False | — | 0 |

인덱스: 별도 선언 없음.
외래키: 선언 없음.

### chat_messages

| 컬럼 | SQLite 타입 | NOT NULL | 기본값 | PK |
|---|---|---|---|---:|
| `id` | INTEGER | False | — | 1 |
| `room_id` | INTEGER | False | — | 0 |
| `sender_id` | INTEGER | False | — | 0 |
| `sender_name` | TEXT | False | — | 0 |
| `content` | TEXT | False | — | 0 |
| `file_name` | TEXT | False | — | 0 |
| `file_path` | TEXT | False | — | 0 |
| `file_mime` | TEXT | False | — | 0 |
| `created_at` | TEXT | False | — | 0 |

인덱스: `idx_chat_messages_room` (unique=False).
외래키: 선언 없음.

### chat_room_members

| 컬럼 | SQLite 타입 | NOT NULL | 기본값 | PK |
|---|---|---|---|---:|
| `id` | INTEGER | False | — | 1 |
| `room_id` | INTEGER | False | — | 0 |
| `employee_id` | INTEGER | False | — | 0 |
| `employee_name` | TEXT | False | — | 0 |
| `last_read_message_id` | INTEGER | False | 0 | 0 |
| `joined_at` | TEXT | False | — | 0 |

인덱스: `idx_chat_room_members_unique` (unique=True), `idx_chat_room_members_emp` (unique=False), `idx_chat_room_members_room` (unique=False).
외래키: 선언 없음.

### chat_rooms

| 컬럼 | SQLite 타입 | NOT NULL | 기본값 | PK |
|---|---|---|---|---:|
| `id` | INTEGER | False | — | 1 |
| `room_type` | TEXT | False | — | 0 |
| `name` | TEXT | False | — | 0 |
| `dm_key` | TEXT | False | — | 0 |
| `created_by` | INTEGER | False | — | 0 |
| `created_at` | TEXT | False | — | 0 |
| `password_hash` | TEXT | False | — | 0 |

인덱스: `idx_chat_rooms_dmkey` (unique=True).
외래키: 선언 없음.

### client_payments

| 컬럼 | SQLite 타입 | NOT NULL | 기본값 | PK |
|---|---|---|---|---:|
| `id` | INTEGER | False | — | 1 |
| `client_name` | TEXT | False | — | 0 |
| `payment_date` | TEXT | False | — | 0 |
| `amount` | REAL | False | — | 0 |
| `note` | TEXT | False | — | 0 |
| `created_by` | INTEGER | False | — | 0 |
| `created_at` | TEXT | False | — | 0 |

인덱스: `idx_client_payments_client_date` (unique=False).
외래키: 선언 없음.

### clients

| 컬럼 | SQLite 타입 | NOT NULL | 기본값 | PK |
|---|---|---|---|---:|
| `id` | INTEGER | False | — | 1 |
| `name` | TEXT | False | — | 0 |
| `client_type` | TEXT | False | — | 0 |
| `created_at` | TEXT | False | — | 0 |
| `ceo_name` | TEXT | False | — | 0 |
| `business_type` | TEXT | False | — | 0 |
| `business_item` | TEXT | False | — | 0 |
| `phone` | TEXT | False | — | 0 |
| `fax` | TEXT | False | — | 0 |
| `email` | TEXT | False | — | 0 |
| `zipcode` | TEXT | False | — | 0 |
| `address` | TEXT | False | — | 0 |
| `address_detail` | TEXT | False | — | 0 |
| `business_no` | TEXT | False | — | 0 |
| `mobile` | TEXT | False | — | 0 |
| `memo` | TEXT | False | — | 0 |

인덱스: `sqlite_autoindex_clients_1` (unique=True).
외래키: 선언 없음.

### dashboard_memos

| 컬럼 | SQLite 타입 | NOT NULL | 기본값 | PK |
|---|---|---|---|---:|
| `id` | INTEGER | False | — | 1 |
| `memo_date` | TEXT | False | — | 0 |
| `title` | TEXT | False | — | 0 |
| `content` | TEXT | False | — | 0 |
| `is_shared` | INTEGER | False | 0 | 0 |
| `created_by` | INTEGER | False | — | 0 |
| `created_at` | TEXT | False | — | 0 |
| `updated_at` | TEXT | False | — | 0 |

인덱스: 별도 선언 없음.
외래키: 선언 없음.

### delivery_carryover

| 컬럼 | SQLite 타입 | NOT NULL | 기본값 | PK |
|---|---|---|---|---:|
| `id` | INTEGER | False | — | 1 |
| `schedule_type` | TEXT | False | — | 0 |
| `schedule_id` | INTEGER | False | — | 0 |
| `client_name` | TEXT | False | — | 0 |
| `product_name` | TEXT | False | — | 0 |
| `qty` | REAL | False | — | 0 |
| `unit_price` | REAL | False | — | 0 |
| `amount` | REAL | False | — | 0 |
| `original_date` | TEXT | False | — | 0 |
| `target_month` | TEXT | False | — | 0 |
| `target_date` | TEXT | False | — | 0 |
| `created_at` | TEXT | False | — | 0 |
| `product_code` | TEXT | False | — | 0 |

인덱스: `idx_delivery_carryover_product_code` (unique=False).
외래키: 선언 없음.

### document_folder

| 컬럼 | SQLite 타입 | NOT NULL | 기본값 | PK |
|---|---|---|---|---:|
| `id` | INTEGER | False | — | 1 |
| `parent_id` | INTEGER | False | — | 0 |
| `name` | TEXT | False | — | 0 |
| `created_by` | TEXT | False | — | 0 |
| `created_at` | TEXT | False | — | 0 |
| `kind` | TEXT | False | — | 0 |
| `department` | TEXT | False | — | 0 |
| `owner_id` | INTEGER | False | — | 0 |
| `lock_hash` | TEXT | False | — | 0 |
| `lock_by` | TEXT | False | — | 0 |
| `lock_at` | TEXT | False | — | 0 |

인덱스: `idx_document_folder_parent` (unique=False).
외래키: 선언 없음.

### document_share

| 컬럼 | SQLite 타입 | NOT NULL | 기본값 | PK |
|---|---|---|---|---:|
| `id` | INTEGER | False | — | 1 |
| `attachment_id` | INTEGER | False | — | 0 |
| `to_employee_id` | INTEGER | False | — | 0 |
| `shared_by` | INTEGER | False | — | 0 |
| `shared_by_name` | TEXT | False | — | 0 |
| `note` | TEXT | False | — | 0 |
| `expires_at` | TEXT | False | — | 0 |
| `created_at` | TEXT | False | — | 0 |
| `folder_id` | INTEGER | False | — | 0 |

인덱스: `idx_document_share_folder_once` (unique=True), `idx_document_share_once` (unique=True), `idx_document_share_to` (unique=False).
외래키: 선언 없음.

### employees

| 컬럼 | SQLite 타입 | NOT NULL | 기본값 | PK |
|---|---|---|---|---:|
| `id` | INTEGER | False | — | 1 |
| `name` | TEXT | False | — | 0 |
| `department` | TEXT | False | — | 0 |
| `username` | TEXT | False | — | 0 |
| `password_hash` | TEXT | False | — | 0 |
| `permissions` | TEXT | False | — | 0 |
| `created_at` | TEXT | False | — | 0 |
| `is_admin` | INTEGER | False | 0 | 0 |
| `recipe_permission` | TEXT | False | — | 0 |
| `position` | TEXT | False | — | 0 |
| `phone` | TEXT | False | — | 0 |
| `birth_date` | TEXT | False | — | 0 |
| `address` | TEXT | False | — | 0 |
| `hire_date` | TEXT | False | — | 0 |
| `resign_date` | TEXT | False | — | 0 |
| `memo` | TEXT | False | — | 0 |
| `resident_no_enc` | TEXT | False | — | 0 |

인덱스: `sqlite_autoindex_employees_1` (unique=True).
외래키: 선언 없음.

### external_api_settings

| 컬럼 | SQLite 타입 | NOT NULL | 기본값 | PK |
|---|---|---|---|---:|
| `service_key` | TEXT | False | — | 1 |
| `service_name` | TEXT | False | — | 0 |
| `api_key` | TEXT | False | — | 0 |
| `api_secret` | TEXT | False | — | 0 |
| `base_url` | TEXT | False | — | 0 |
| `updated_at` | TEXT | False | — | 0 |

인덱스: `sqlite_autoindex_external_api_settings_1` (unique=True).
외래키: 선언 없음.

### label_company_info

| 컬럼 | SQLite 타입 | NOT NULL | 기본값 | PK |
|---|---|---|---|---:|
| `id` | INTEGER | False | — | 1 |
| `return_exchange_location` | TEXT | False | — | 0 |
| `customer_service_phone` | TEXT | False | — | 0 |
| `business_name` | TEXT | False | — | 0 |
| `business_address` | TEXT | False | — | 0 |
| `notice_text` | TEXT | False | — | 0 |
| `updated_at` | TEXT | False | — | 0 |

인덱스: 별도 선언 없음.
외래키: 선언 없음.

### label_fields

| 컬럼 | SQLite 타입 | NOT NULL | 기본값 | PK |
|---|---|---|---|---:|
| `id` | INTEGER | False | — | 1 |
| `name` | TEXT | False | — | 0 |
| `created_at` | TEXT | False | — | 0 |

인덱스: `sqlite_autoindex_label_fields_1` (unique=True).
외래키: 선언 없음.

### label_marks

| 컬럼 | SQLite 타입 | NOT NULL | 기본값 | PK |
|---|---|---|---|---:|
| `id` | INTEGER | False | — | 1 |
| `name` | TEXT | False | — | 0 |
| `data_url` | TEXT | False | — | 0 |
| `width_mm` | REAL | False | — | 0 |
| `created_at` | TEXT | False | — | 0 |

인덱스: `sqlite_autoindex_label_marks_1` (unique=True).
외래키: 선언 없음.

### label_requests

| 컬럼 | SQLite 타입 | NOT NULL | 기본값 | PK |
|---|---|---|---|---:|
| `id` | INTEGER | False | — | 1 |
| `handoff_id` | INTEGER | False | — | 0 |
| `product_name` | TEXT | False | — | 0 |
| `layout` | TEXT | False | — | 0 |
| `extra` | TEXT | False | — | 0 |
| `food_type` | TEXT | False | — | 0 |
| `net_weight` | TEXT | False | — | 0 |
| `ingredients_text` | TEXT | False | — | 0 |
| `allergens` | TEXT | False | — | 0 |
| `manufacture_report_no` | TEXT | False | — | 0 |
| `packaging_material` | TEXT | False | — | 0 |
| `shelf_life_months` | INTEGER | False | — | 0 |
| `shelf_life_unit` | TEXT | False | — | 0 |
| `storage` | TEXT | False | — | 0 |
| `status` | TEXT | False | 'requested' | 0 |
| `moved_product_code` | TEXT | False | — | 0 |
| `note` | TEXT | False | — | 0 |
| `updated_at` | TEXT | False | — | 0 |
| `updated_by` | TEXT | False | — | 0 |

인덱스: `idx_label_requests_handoff` (unique=False).
외래키: 선언 없음.

### label_templates

| 컬럼 | SQLite 타입 | NOT NULL | 기본값 | PK |
|---|---|---|---|---:|
| `id` | INTEGER | False | — | 1 |
| `name` | TEXT | False | — | 0 |
| `size` | TEXT | False | — | 0 |
| `layout` | TEXT | False | — | 0 |
| `created_at` | TEXT | False | — | 0 |

인덱스: 별도 선언 없음.
외래키: 선언 없음.

### leave_records

| 컬럼 | SQLite 타입 | NOT NULL | 기본값 | PK |
|---|---|---|---|---:|
| `id` | INTEGER | False | — | 1 |
| `employee_id` | INTEGER | False | — | 0 |
| `leave_date` | TEXT | False | — | 0 |
| `days` | REAL | False | — | 0 |
| `note` | TEXT | False | — | 0 |
| `created_at` | TEXT | False | — | 0 |
| `created_by` | TEXT | False | — | 0 |

인덱스: `idx_leave_records_emp_date` (unique=False).
외래키: 선언 없음.

### logistics_schedule

| 컬럼 | SQLite 타입 | NOT NULL | 기본값 | PK |
|---|---|---|---|---:|
| `id` | INTEGER | False | — | 1 |
| `schedule_date` | TEXT | False | — | 0 |
| `client_name` | TEXT | False | — | 0 |
| `product_name` | TEXT | False | — | 0 |
| `order_qty` | TEXT | False | — | 0 |
| `note` | TEXT | False | — | 0 |
| `sort_order` | INTEGER | False | — | 0 |
| `created_at` | TEXT | False | — | 0 |
| `actual_qty` | TEXT | False | — | 0 |
| `lot_id` | INTEGER | False | — | 0 |
| `source_order_id` | INTEGER | False | — | 0 |
| `vehicle` | TEXT | False | — | 0 |
| `packing_method` | TEXT | False | — | 0 |
| `ship_confirmed` | INTEGER | False | 0 | 0 |
| `ship_note` | TEXT | False | — | 0 |
| `visit_order` | INTEGER | False | — | 0 |
| `driver_name` | TEXT | False | — | 0 |
| `charter_info` | TEXT | False | — | 0 |
| `charter_amount` | REAL | False | — | 0 |
| `box_qty` | REAL | False | — | 0 |
| `product_code` | TEXT | False | — | 0 |

인덱스: `idx_logistics_schedule_product_code` (unique=False).
외래키: 선언 없음.

### material_price_log

| 컬럼 | SQLite 타입 | NOT NULL | 기본값 | PK |
|---|---|---|---|---:|
| `id` | INTEGER | False | — | 1 |
| `material_code` | TEXT | False | — | 0 |
| `material_name` | TEXT | False | — | 0 |
| `changed_at` | TEXT | False | — | 0 |
| `old_price` | REAL | False | — | 0 |
| `new_price` | REAL | False | — | 0 |

인덱스: 별도 선언 없음.
외래키: 선언 없음.

### material_price_schedule

| 컬럼 | SQLite 타입 | NOT NULL | 기본값 | PK |
|---|---|---|---|---:|
| `id` | INTEGER | False | — | 1 |
| `material_code` | TEXT | False | — | 0 |
| `material_name` | TEXT | False | — | 0 |
| `new_price` | REAL | False | — | 0 |
| `effective_date` | TEXT | False | — | 0 |
| `applied` | INTEGER | False | 0 | 0 |
| `created_at` | TEXT | False | — | 0 |

인덱스: 별도 선언 없음.
외래키: 선언 없음.

### material_purchase_order

| 컬럼 | SQLite 타입 | NOT NULL | 기본값 | PK |
|---|---|---|---|---:|
| `id` | INTEGER | False | — | 1 |
| `material_code` | TEXT | False | — | 0 |
| `material_name` | TEXT | False | — | 0 |
| `qty` | REAL | False | — | 0 |
| `order_date` | TEXT | False | — | 0 |
| `created_at` | TEXT | False | — | 0 |
| `client_name` | TEXT | False | — | 0 |
| `source` | TEXT | False | — | 0 |
| `need_date` | TEXT | False | — | 0 |

인덱스: `idx_material_purchase_order_code_date` (unique=False).
외래키: 선언 없음.

### material_receiving

| 컬럼 | SQLite 타입 | NOT NULL | 기본값 | PK |
|---|---|---|---|---:|
| `id` | INTEGER | False | — | 1 |
| `material_code` | TEXT | False | — | 0 |
| `material_name` | TEXT | False | — | 0 |
| `qty` | REAL | False | — | 0 |
| `receive_date` | TEXT | False | — | 0 |
| `created_at` | TEXT | False | — | 0 |
| `client_name` | TEXT | False | — | 0 |
| `unit_price` | REAL | False | — | 0 |
| `supply_amount` | REAL | False | — | 0 |
| `vat_amount` | REAL | False | — | 0 |
| `total_amount` | REAL | False | — | 0 |
| `po_id` | INTEGER | False | — | 0 |
| `warehouse` | TEXT | False | — | 0 |
| `tax_type` | TEXT | False | — | 0 |
| `barcode` | TEXT | False | — | 0 |
| `is_return` | INTEGER | False | — | 0 |
| `return_reason` | TEXT | False | — | 0 |
| `return_of_id` | INTEGER | False | — | 0 |

인덱스: `idx_material_receiving_return_of` (unique=False), `idx_material_receiving_barcode` (unique=False).
외래키: 선언 없음.

### material_stock_movement

| 컬럼 | SQLite 타입 | NOT NULL | 기본값 | PK |
|---|---|---|---|---:|
| `id` | INTEGER | False | — | 1 |
| `material_code` | TEXT | False | — | 0 |
| `material_name` | TEXT | False | — | 0 |
| `in_qty` | REAL | False | — | 0 |
| `out_qty` | REAL | False | — | 0 |
| `note` | TEXT | False | — | 0 |
| `created_at` | TEXT | False | — | 0 |

인덱스: 별도 선언 없음.
외래키: 선언 없음.

### material_stock_schedule

| 컬럼 | SQLite 타입 | NOT NULL | 기본값 | PK |
|---|---|---|---|---:|
| `id` | INTEGER | False | — | 1 |
| `material_code` | TEXT | False | — | 0 |
| `material_name` | TEXT | False | — | 0 |
| `new_stock_qty` | REAL | False | — | 0 |
| `effective_date` | TEXT | False | — | 0 |
| `applied` | INTEGER | False | 0 | 0 |
| `created_at` | TEXT | False | — | 0 |
| `edited_qty` | REAL | False | — | 0 |
| `old_stock_qty` | REAL | False | — | 0 |
| `warehouse` | TEXT | False | — | 0 |
| `note` | TEXT | False | — | 0 |

인덱스: 별도 선언 없음.
외래키: 선언 없음.

### material_supplier

| 컬럼 | SQLite 타입 | NOT NULL | 기본값 | PK |
|---|---|---|---|---:|
| `id` | INTEGER | False | — | 1 |
| `material_code` | TEXT | False | — | 0 |
| `client_name` | TEXT | False | — | 0 |
| `created_at` | TEXT | False | — | 0 |

인덱스: `idx_material_supplier_uniq` (unique=True).
외래키: 선언 없음.

### material_warehouse_move

| 컬럼 | SQLite 타입 | NOT NULL | 기본값 | PK |
|---|---|---|---|---:|
| `id` | INTEGER | False | — | 1 |
| `material_code` | TEXT | False | — | 0 |
| `material_name` | TEXT | False | — | 0 |
| `barcode` | TEXT | False | — | 0 |
| `from_warehouse` | TEXT | False | — | 0 |
| `to_warehouse` | TEXT | False | — | 0 |
| `pack_count` | INTEGER | False | — | 0 |
| `unit_weight` | REAL | False | — | 0 |
| `qty` | REAL | False | — | 0 |
| `moved_date` | TEXT | False | — | 0 |
| `moved_by` | TEXT | False | — | 0 |
| `created_at` | TEXT | False | — | 0 |

인덱스: `idx_wh_move_date` (unique=False), `idx_wh_move_code` (unique=False).
외래키: 선언 없음.

### materials

| 컬럼 | SQLite 타입 | NOT NULL | 기본값 | PK |
|---|---|---|---|---:|
| `code` | TEXT | False | — | 1 |
| `name` | TEXT | False | — | 0 |
| `spec` | TEXT | False | — | 0 |
| `unit_price` | REAL | False | — | 0 |
| `stock_qty` | REAL | False | 0 | 0 |
| `supplier` | TEXT | False | — | 0 |
| `warehouse` | TEXT | False | — | 0 |
| `safety_stock` | REAL | False | — | 0 |
| `base_order_qty` | REAL | False | — | 0 |
| `allergens` | TEXT | False | — | 0 |
| `sub_category` | TEXT | False | — | 0 |
| `unit` | TEXT | False | — | 0 |
| `unit_weight` | REAL | False | — | 0 |
| `box_qty` | INTEGER | False | — | 0 |

인덱스: `sqlite_autoindex_materials_1` (unique=True).
외래키: 선언 없음.

### packing_methods

| 컬럼 | SQLite 타입 | NOT NULL | 기본값 | PK |
|---|---|---|---|---:|
| `id` | INTEGER | False | — | 1 |
| `name` | TEXT | False | — | 0 |
| `created_at` | TEXT | False | — | 0 |

인덱스: `sqlite_autoindex_packing_methods_1` (unique=True).
외래키: 선언 없음.

### pricing

| 컬럼 | SQLite 타입 | NOT NULL | 기본값 | PK |
|---|---|---|---|---:|
| `product_code` | TEXT | False | — | 1 |
| `product_name` | TEXT | False | — | 0 |
| `spec` | TEXT | False | — | 0 |
| `product_type` | TEXT | False | — | 0 |
| `material_cost` | REAL | False | — | 0 |
| `loss_cost` | REAL | False | — | 0 |
| `loss_rate` | REAL | False | — | 0 |
| `markup_cost` | REAL | False | — | 0 |
| `markup_rate` | REAL | False | — | 0 |
| `labor_cost` | REAL | False | — | 0 |
| `packaging_cost` | REAL | False | — | 0 |
| `logistics_cost` | REAL | False | — | 0 |
| `margin` | REAL | False | — | 0 |
| `other_cost1` | REAL | False | — | 0 |
| `other_cost1_note` | TEXT | False | — | 0 |
| `other_cost2` | REAL | False | — | 0 |
| `other_cost2_note` | TEXT | False | — | 0 |
| `other_cost3` | REAL | False | — | 0 |
| `other_cost3_note` | TEXT | False | — | 0 |
| `other_cost4` | REAL | False | — | 0 |
| `other_cost4_note` | TEXT | False | — | 0 |
| `current_price` | REAL | False | — | 0 |
| `total_price` | REAL | False | — | 0 |
| `client_name` | TEXT | False | — | 0 |

인덱스: `sqlite_autoindex_pricing_1` (unique=True).
외래키: 선언 없음.

### product_label_versions

| 컬럼 | SQLite 타입 | NOT NULL | 기본값 | PK |
|---|---|---|---|---:|
| `id` | INTEGER | False | — | 1 |
| `product_code` | TEXT | False | — | 0 |
| `version_label` | TEXT | False | — | 0 |
| `note` | TEXT | False | — | 0 |
| `food_type` | TEXT | False | — | 0 |
| `net_weight` | TEXT | False | — | 0 |
| `ingredients_text` | TEXT | False | — | 0 |
| `allergens` | TEXT | False | — | 0 |
| `manufacture_report_no` | TEXT | False | — | 0 |
| `packaging_material` | TEXT | False | — | 0 |
| `shelf_life_months` | INTEGER | False | — | 0 |
| `shelf_life_unit` | TEXT | False | — | 0 |
| `storage` | TEXT | False | — | 0 |
| `layout` | TEXT | False | — | 0 |
| `is_current` | INTEGER | False | 0 | 0 |
| `created_at` | TEXT | False | — | 0 |
| `created_by` | TEXT | False | — | 0 |
| `updated_at` | TEXT | False | — | 0 |
| `updated_by` | TEXT | False | — | 0 |
| `extra` | TEXT | False | — | 0 |

인덱스: `idx_label_versions_code` (unique=False).
외래키: 선언 없음.

### product_stock_movement

| 컬럼 | SQLite 타입 | NOT NULL | 기본값 | PK |
|---|---|---|---|---:|
| `id` | INTEGER | False | — | 1 |
| `product_code` | TEXT | False | — | 0 |
| `product_name` | TEXT | False | — | 0 |
| `moved_on` | TEXT | False | — | 0 |
| `kind` | TEXT | False | — | 0 |
| `qty` | REAL | False | — | 0 |
| `balance_after` | REAL | False | — | 0 |
| `source_table` | TEXT | False | — | 0 |
| `source_id` | INTEGER | False | — | 0 |
| `client_name` | TEXT | False | — | 0 |
| `note` | TEXT | False | — | 0 |
| `created_by_name` | TEXT | False | — | 0 |
| `created_at` | TEXT | False | — | 0 |

인덱스: `idx_psm_source` (unique=False), `idx_psm_product` (unique=False).
외래키: 선언 없음.

### product_stock_schedule

| 컬럼 | SQLite 타입 | NOT NULL | 기본값 | PK |
|---|---|---|---|---:|
| `id` | INTEGER | False | — | 1 |
| `product_code` | TEXT | False | — | 0 |
| `product_name` | TEXT | False | — | 0 |
| `new_stock_qty` | REAL | False | — | 0 |
| `edited_qty` | REAL | False | — | 0 |
| `old_stock_qty` | REAL | False | — | 0 |
| `effective_date` | TEXT | False | — | 0 |
| `applied` | INTEGER | False | 0 | 0 |
| `created_at` | TEXT | False | — | 0 |

인덱스: 별도 선언 없음.
외래키: 선언 없음.

### product_types

| 컬럼 | SQLite 타입 | NOT NULL | 기본값 | PK |
|---|---|---|---|---:|
| `name` | TEXT | False | — | 1 |
| `loss_rate` | REAL | False | — | 0 |
| `markup_rate` | REAL | False | — | 0 |
| `labor_cost` | REAL | False | — | 0 |
| `packaging_cost` | REAL | False | — | 0 |
| `logistics_cost` | REAL | False | — | 0 |
| `margin` | REAL | False | — | 0 |

인덱스: `sqlite_autoindex_product_types_1` (unique=True).
외래키: 선언 없음.

### production_material_substitution

| 컬럼 | SQLite 타입 | NOT NULL | 기본값 | PK |
|---|---|---|---|---:|
| `id` | INTEGER | False | — | 1 |
| `schedule_id` | INTEGER | False | — | 0 |
| `from_material_code` | TEXT | False | — | 0 |
| `from_material_name` | TEXT | False | — | 0 |
| `to_material_code` | TEXT | False | — | 0 |
| `to_material_name` | TEXT | False | — | 0 |
| `reason` | TEXT | False | — | 0 |
| `created_at` | TEXT | False | — | 0 |
| `created_by` | TEXT | False | — | 0 |

인덱스: `idx_prod_material_sub_schedule` (unique=False).
외래키: 선언 없음.

### production_material_usage

| 컬럼 | SQLite 타입 | NOT NULL | 기본값 | PK |
|---|---|---|---|---:|
| `id` | INTEGER | False | — | 1 |
| `schedule_id` | INTEGER | False | — | 0 |
| `material_code` | TEXT | False | — | 0 |
| `material_name` | TEXT | False | — | 0 |
| `qty_used` | REAL | False | — | 0 |
| `created_at` | TEXT | False | — | 0 |

인덱스: `idx_production_material_usage_code` (unique=False).
외래키: 선언 없음.

### production_schedule

| 컬럼 | SQLite 타입 | NOT NULL | 기본값 | PK |
|---|---|---|---|---:|
| `id` | INTEGER | False | — | 1 |
| `schedule_date` | TEXT | False | — | 0 |
| `client_name` | TEXT | False | — | 0 |
| `product_name` | TEXT | False | — | 0 |
| `order_qty` | TEXT | False | — | 0 |
| `actual_qty` | TEXT | False | — | 0 |
| `note` | TEXT | False | — | 0 |
| `sort_order` | INTEGER | False | — | 0 |
| `created_at` | TEXT | False | — | 0 |
| `logistics_date` | TEXT | False | — | 0 |
| `lot_no` | TEXT | False | — | 0 |
| `logistics_actual_qty` | TEXT | False | — | 0 |
| `ship_vehicle` | TEXT | False | — | 0 |
| `ship_packing_method` | TEXT | False | — | 0 |
| `ship_confirmed` | INTEGER | False | 0 | 0 |
| `ship_note` | TEXT | False | — | 0 |
| `visit_order` | INTEGER | False | — | 0 |
| `driver_name` | TEXT | False | — | 0 |
| `charter_info` | TEXT | False | — | 0 |
| `charter_amount` | REAL | False | — | 0 |
| `source_order_id` | INTEGER | False | — | 0 |
| `is_stock_production` | INTEGER | False | 0 | 0 |
| `box_qty` | REAL | False | — | 0 |
| `product_code` | TEXT | False | — | 0 |

인덱스: `idx_production_schedule_product_code` (unique=False), `idx_production_schedule_lot_no` (unique=False), `idx_production_schedule_product_name` (unique=False), `idx_production_schedule_schedule_date` (unique=False), `idx_production_schedule_actual_qty` (unique=False).
외래키: 선언 없음.

### products

| 컬럼 | SQLite 타입 | NOT NULL | 기본값 | PK |
|---|---|---|---|---:|
| `code` | TEXT | False | — | 1 |
| `name` | TEXT | False | — | 0 |
| `spec` | TEXT | False | — | 0 |
| `storage` | TEXT | False | — | 0 |
| `client_name` | TEXT | False | — | 0 |
| `product_type` | TEXT | False | — | 0 |
| `stock_qty` | REAL | False | 0 | 0 |
| `discontinued` | INTEGER | False | 0 | 0 |
| `discontinued_at` | TEXT | False | — | 0 |
| `discontinued_by` | TEXT | False | — | 0 |
| `discontinued_note` | TEXT | False | — | 0 |
| `food_type` | TEXT | False | — | 0 |
| `net_weight` | TEXT | False | — | 0 |
| `ingredients_text` | TEXT | False | — | 0 |
| `allergens` | TEXT | False | — | 0 |
| `manufacture_report_no` | TEXT | False | — | 0 |
| `packaging_material` | TEXT | False | — | 0 |
| `shelf_life_months` | INTEGER | False | — | 0 |
| `shelf_life_unit` | TEXT | False | — | 0 |
| `label_style` | TEXT | False | — | 0 |
| `label_extra` | TEXT | False | — | 0 |
| `pouch_net_weight_kg` | REAL | False | — | 0 |
| `pouch_length_m` | REAL | False | — | 0 |
| `pouch_per_unit` | REAL | False | — | 0 |
| `film_material_code` | TEXT | False | — | 0 |
| `pouch_material_code` | TEXT | False | — | 0 |
| `box_material_code` | TEXT | False | — | 0 |

인덱스: `sqlite_autoindex_products_1` (unique=True).
외래키: 선언 없음.

### quotes

| 컬럼 | SQLite 타입 | NOT NULL | 기본값 | PK |
|---|---|---|---|---:|
| `quote_id` | INTEGER | False | — | 1 |
| `product_name` | TEXT | False | — | 0 |
| `spec` | TEXT | False | — | 0 |
| `product_type` | TEXT | False | — | 0 |
| `storage` | TEXT | False | — | 0 |
| `client_name` | TEXT | False | — | 0 |
| `bom_json` | TEXT | False | — | 0 |
| `material_cost` | REAL | False | — | 0 |
| `loss_rate` | REAL | False | — | 0 |
| `loss_cost` | REAL | False | — | 0 |
| `markup_rate` | REAL | False | — | 0 |
| `markup_cost` | REAL | False | — | 0 |
| `labor_cost` | REAL | False | — | 0 |
| `packaging_cost` | REAL | False | — | 0 |
| `logistics_cost` | REAL | False | — | 0 |
| `margin` | REAL | False | — | 0 |
| `other_cost1` | REAL | False | — | 0 |
| `other_cost1_note` | TEXT | False | — | 0 |
| `other_cost2` | REAL | False | — | 0 |
| `other_cost2_note` | TEXT | False | — | 0 |
| `other_cost3` | REAL | False | — | 0 |
| `other_cost3_note` | TEXT | False | — | 0 |
| `other_cost4` | REAL | False | — | 0 |
| `other_cost4_note` | TEXT | False | — | 0 |
| `current_price` | REAL | False | — | 0 |
| `total_price` | REAL | False | — | 0 |
| `note` | TEXT | False | — | 0 |
| `status` | TEXT | False | 'draft' | 0 |
| `confirmed_product_code` | TEXT | False | — | 0 |
| `created_at` | TEXT | False | — | 0 |
| `source_kind` | TEXT | False | — | 0 |
| `source_recipe` | TEXT | False | — | 0 |
| `product_code` | TEXT | False | — | 0 |

인덱스: `idx_quotes_product_code` (unique=False).
외래키: 선언 없음.

### recipe_clients

| 컬럼 | SQLite 타입 | NOT NULL | 기본값 | PK |
|---|---|---|---|---:|
| `id` | INTEGER | False | — | 1 |
| `client_name` | TEXT | False | — | 0 |
| `sales_emp_id` | INTEGER | False | — | 0 |
| `created_by` | INTEGER | False | — | 0 |
| `created_at` | TEXT | False | — | 0 |
| `updated_at` | TEXT | False | — | 0 |

인덱스: `sqlite_autoindex_recipe_clients_1` (unique=True).
외래키: 선언 없음.

### recipe_drafts

| 컬럼 | SQLite 타입 | NOT NULL | 기본값 | PK |
|---|---|---|---|---:|
| `id` | INTEGER | False | — | 1 |
| `client_name` | TEXT | False | — | 0 |
| `name` | TEXT | False | — | 0 |
| `spec` | TEXT | False | — | 0 |
| `note` | TEXT | False | — | 0 |
| `stage` | TEXT | False | — | 0 |
| `created_by` | INTEGER | False | — | 0 |
| `created_at` | TEXT | False | — | 0 |
| `updated_at` | TEXT | False | — | 0 |
| `category` | TEXT | False | — | 0 |
| `sale_type` | TEXT | False | — | 0 |
| `remark` | TEXT | False | — | 0 |

인덱스: 별도 선언 없음.
외래키: 선언 없음.

### recipe_handoffs

| 컬럼 | SQLite 타입 | NOT NULL | 기본값 | PK |
|---|---|---|---|---:|
| `id` | INTEGER | False | — | 1 |
| `draft_id` | INTEGER | False | — | 0 |
| `version_id` | INTEGER | False | — | 0 |
| `version_label` | TEXT | False | — | 0 |
| `kind` | TEXT | False | — | 0 |
| `quote_id` | INTEGER | False | — | 0 |
| `requested_by` | INTEGER | False | — | 0 |
| `requested_by_name` | TEXT | False | — | 0 |
| `requested_by_username` | TEXT | False | — | 0 |
| `read_at` | TEXT | False | — | 0 |
| `read_by_name` | TEXT | False | — | 0 |
| `created_at` | TEXT | False | — | 0 |

인덱스: `idx_recipe_handoffs_quote` (unique=False), `idx_recipe_handoffs_draft` (unique=False).
외래키: 선언 없음.

### recipe_shares

| 컬럼 | SQLite 타입 | NOT NULL | 기본값 | PK |
|---|---|---|---|---:|
| `id` | INTEGER | False | — | 1 |
| `draft_id` | INTEGER | False | — | 0 |
| `employee_id` | INTEGER | False | — | 0 |
| `expires_at` | TEXT | False | — | 0 |
| `revoked` | INTEGER | False | 0 | 0 |
| `created_by` | INTEGER | False | — | 0 |
| `created_at` | TEXT | False | — | 0 |
| `version_id` | INTEGER | False | — | 0 |

인덱스: 별도 선언 없음.
외래키: 선언 없음.

### recipe_stage_logs

| 컬럼 | SQLite 타입 | NOT NULL | 기본값 | PK |
|---|---|---|---|---:|
| `id` | INTEGER | False | — | 1 |
| `draft_id` | INTEGER | False | — | 0 |
| `version_id` | INTEGER | False | — | 0 |
| `version_label` | TEXT | False | — | 0 |
| `stage` | TEXT | False | — | 0 |
| `employee_id` | INTEGER | False | — | 0 |
| `employee_name` | TEXT | False | — | 0 |
| `created_at` | TEXT | False | — | 0 |

인덱스: 별도 선언 없음.
외래키: 선언 없음.

### recipe_version_bom

| 컬럼 | SQLite 타입 | NOT NULL | 기본값 | PK |
|---|---|---|---|---:|
| `id` | INTEGER | False | — | 1 |
| `version_id` | INTEGER | False | — | 0 |
| `material_code` | TEXT | False | — | 0 |
| `material_name` | TEXT | False | — | 0 |
| `weight` | REAL | False | — | 0 |
| `ratio_percent` | REAL | False | — | 0 |
| `unit_price_per_kg` | REAL | False | — | 0 |
| `amount_per_kg` | REAL | False | — | 0 |
| `rank_in_version` | INTEGER | False | — | 0 |

인덱스: 별도 선언 없음.
외래키: 선언 없음.

### recipe_versions

| 컬럼 | SQLite 타입 | NOT NULL | 기본값 | PK |
|---|---|---|---|---:|
| `id` | INTEGER | False | — | 1 |
| `draft_id` | INTEGER | False | — | 0 |
| `version_label` | TEXT | False | — | 0 |
| `note` | TEXT | False | — | 0 |
| `stage` | TEXT | False | — | 0 |
| `created_at` | TEXT | False | — | 0 |

인덱스: 별도 선언 없음.
외래키: 선언 없음.

### sales_order

| 컬럼 | SQLite 타입 | NOT NULL | 기본값 | PK |
|---|---|---|---|---:|
| `id` | INTEGER | False | — | 1 |
| `order_date` | TEXT | False | — | 0 |
| `client_name` | TEXT | False | — | 0 |
| `product_name` | TEXT | False | — | 0 |
| `order_qty` | TEXT | False | — | 0 |
| `note` | TEXT | False | — | 0 |
| `production_date` | TEXT | False | — | 0 |
| `logistics_date` | TEXT | False | — | 0 |
| `imported` | INTEGER | False | 0 | 0 |
| `sort_order` | INTEGER | False | — | 0 |
| `created_at` | TEXT | False | — | 0 |
| `imported_production` | INTEGER | False | 0 | 0 |
| `imported_shipment` | INTEGER | False | 0 | 0 |
| `is_stock_production` | INTEGER | False | 0 | 0 |
| `product_code` | TEXT | False | — | 0 |

인덱스: `idx_sales_order_product_code` (unique=False).
외래키: 선언 없음.

### sales_record

| 컬럼 | SQLite 타입 | NOT NULL | 기본값 | PK |
|---|---|---|---|---:|
| `id` | INTEGER | False | — | 1 |
| `sale_date` | TEXT | False | — | 0 |
| `client_name` | TEXT | False | — | 0 |
| `product_name` | TEXT | False | — | 0 |
| `qty` | REAL | False | — | 0 |
| `unit_price` | REAL | False | — | 0 |
| `amount` | REAL | False | — | 0 |
| `note` | TEXT | False | — | 0 |
| `source_type` | TEXT | False | — | 0 |
| `source_id` | INTEGER | False | — | 0 |
| `created_at` | TEXT | False | — | 0 |
| `created_by` | TEXT | False | — | 0 |

인덱스: `idx_sales_record_source` (unique=True), `idx_sales_record_date` (unique=False).
외래키: 선언 없음.

### shipment_lot_allocation

| 컬럼 | SQLite 타입 | NOT NULL | 기본값 | PK |
|---|---|---|---|---:|
| `id` | INTEGER | False | — | 1 |
| `shipment_table` | TEXT | False | — | 0 |
| `shipment_id` | INTEGER | False | — | 0 |
| `lot_id` | INTEGER | False | — | 0 |
| `qty` | REAL | False | — | 0 |
| `created_at` | TEXT | False | — | 0 |

인덱스: `idx_sla_lot` (unique=False), `idx_sla_shipment` (unique=False).
외래키: 선언 없음.

### temp_groups

| 컬럼 | SQLite 타입 | NOT NULL | 기본값 | PK |
|---|---|---|---|---:|
| `id` | INTEGER | False | — | 1 |
| `name` | TEXT | False | — | 0 |
| `refresh_interval_sec` | INTEGER | False | 0 | 0 |

인덱스: `sqlite_autoindex_temp_groups_1` (unique=True).
외래키: 선언 없음.

### temp_sensors

| 컬럼 | SQLite 타입 | NOT NULL | 기본값 | PK |
|---|---|---|---|---:|
| `id` | INTEGER | False | — | 1 |
| `name` | TEXT | False | — | 0 |
| `sensor_id` | TEXT | False | — | 0 |
| `min_temp` | REAL | False | — | 0 |
| `max_temp` | REAL | False | — | 0 |
| `created_at` | TEXT | False | — | 0 |
| `group_name` | TEXT | False | — | 0 |

인덱스: 별도 선언 없음.
외래키: 선언 없음.

### vehicles

| 컬럼 | SQLite 타입 | NOT NULL | 기본값 | PK |
|---|---|---|---|---:|
| `id` | INTEGER | False | — | 1 |
| `name` | TEXT | False | — | 0 |
| `created_at` | TEXT | False | — | 0 |

인덱스: `sqlite_autoindex_vehicles_1` (unique=True).
외래키: 선언 없음.

### warehouses

| 컬럼 | SQLite 타입 | NOT NULL | 기본값 | PK |
|---|---|---|---|---:|
| `id` | INTEGER | False | — | 1 |
| `name` | TEXT | False | — | 0 |
| `memo` | TEXT | False | — | 0 |
| `sort_order` | INTEGER | False | — | 0 |
| `created_at` | TEXT | False | — | 0 |
| `is_receiving` | INTEGER | False | 0 | 0 |

인덱스: `sqlite_autoindex_warehouses_1` (unique=True).
외래키: 선언 없음.

