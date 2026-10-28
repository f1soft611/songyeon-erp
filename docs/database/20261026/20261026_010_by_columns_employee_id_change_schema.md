# 20261026_010 '누가' 칸을 사번으로 · 제품 입출고 거래처를 코드로 저장 변경 이력

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-10-26 |
| 대상 DB | songyeon (PostgreSQL) |
| 유형 | 데이터 변환(이름 → 사번 · 거래처코드) · 컬럼 이름 변경 · 백업 표 추가 |
| 대상 표 | `product_stock_movement` · `material_warehouse_move` · `production_material_substitution` · `attachment` · `document_folder`, 백업 `bak_20261026_010_by_values`(새 표) |
| 적용 | 2026-10-26 적용 완료 (트랜잭션 시험 실행: 다시 적용해도 같음, 롤백하면 처음과 같음 확인 후 적용) |
| 롤백 | `20261026_010_rollback.sql` |

## 내용

- 요청
  - "product_stock_movement 이 테이블 client_name을 client_code로 바꾸고 created_by_name이것도 사번으로 들어가게 해주고"
  - "material_warehouse_move의 moved_by도 사번으로 변경하고 production_material_substitution,attachment,document_folde 여기 다 사번으로"

| 표 | 칸(예전 → 지금) | 값 |
| --- | --- | --- |
| `product_stock_movement` 제품 입출고 | `client_name` → `client_code` | 거래처명 → 거래처코드(같은 이름이 여럿이면 코드가 작은 것) |
| `product_stock_movement` | `created_by_name` → `created_by` | 처리한 사람 이름 → 사번 |
| `material_warehouse_move` 창고이동 | `moved_by`(그대로) | 이름 → 사번 |
| `production_material_substitution` 재료 치환 | `created_by`(그대로) | 이름 → 사번 |
| `attachment` 첨부(입고 서류 · 문서함 파일) | `uploaded_by`(그대로) | 이름 → 사번 |
| `document_folder` 문서함 폴더 | `created_by` · `lock_by`(그대로) | 이름 → 사번 |

- 같은 이름의 직원이 여럿이면 사번이 작은 것. 칸 자리 · 형식(text)은 그대로. 빈 값 · 이미 사번인 값은 건너뛴다.
- 마스터 · 직원 목록에 없는 값이 있으면 멈춘다(적용 때 0건).
- 결과(개수만): 제품 입출고 21건의 거래처 · 처리자가 모두 거래처코드 · 사번으로 바뀌었고 마스터 · 직원과 이어진다. 나머지 표는 값이 없었다. 나머지 값은 같다. 백업 42건(21건 × 2칸).
- `document_share.shared_by`(사번) · `shared_by_name`(이름)과 `document_folder.owner_id`(사번)는 원래 사번이 있어 바꾸지 않았다.

## 영향 범위

- 쓰기: 출하확정 · 출하확정 취소 · 생산입고 · 제품 재고조정 확정(제품 입출고), 창고이동, 재료 치환등록, 첨부 올리기(입고 서류 등 `/api/v1/co/attachments`), 문서함(폴더 만들기 · 잠그기 · 파일 올리기)이 로그인한 사원의 사번을 넣는다. 제품 입출고 거래처는 거래처명을 받아 코드로 바꿔 넣는다.
- 읽기: 제품 입출고 내역 · 창고이동 · 재료 치환 · 첨부 목록 · 문서함 폴더는 사번으로 직원 이름을 붙여 보여 준다(직원이 없으면 저장값). 제품 입출고 내역은 사번(`createdBy`)도 함께 준다.
- 이 표들을 쓰던 서버(8080)는 다시 띄워야 한다.
- 롤백하면 이름으로 돌아간다. 값이 그대로인 줄은 백업의 예전 값, 새 줄은 직원 · 거래처마스터 이름이 들어간다. 서버 코드도 함께 돌려야 한다.
