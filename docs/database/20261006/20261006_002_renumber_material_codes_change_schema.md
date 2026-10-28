# 20261006_002 원재료코드 빈 번호 메우기 변경 이력

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-10-06 |
| 대상 DB | songyeon (PostgreSQL) |
| 유형 | 데이터 수정(스키마 변경 없음) + 대응표 백업 |
| 대상 표 | materials.code, 원재료코드를 담는 모든 칸(bom, material_price_log, material_price_schedule, material_purchase_order, material_receiving, material_stock_movement, material_stock_schedule, material_supplier, material_warehouse_move, production_material_substitution(from·to), production_material_usage, recipe_version_bom, products(film·pouch·box)) |
| 백업 | `bak_20261006_002_code_map`(옛 코드 → 새 코드) |
| 적용 | 2026-10-06 적용 (한 트랜잭션 안에서 적용·롤백 시험 후 적용) |
| 롤백 | `20261006_002_rollback.sql` |

## 이유

- 20261006_001 로 중복 원재료 000014·000015 를 지워 번호가 비었다. 사용자 요청으로 뒤 번호를 당겨 빈칸을 없앤다.
- 적용 당시 대응: 000016~000028 → 000014~000026 (13개). 000001~000013 은 그대로. 다음에 새로 등록하는 원재료는 000027.

## 적용 전 확인(읽기 전용)

- 옮기는 13개 코드를 쓰는 곳: 제품 배합비(bom) 5줄, 단가 변경 이력 6줄. 그 밖의 원재료코드 칸에는 없음.
- 모든 글자·JSON 칸에서 옮기는 코드가 글자 속에 들어간 곳(바코드 등) 없음.
- 원재료코드는 모두 숫자.

## 영향 범위

- 화면에 보이는 원재료코드가 바뀐다(예: (국내산)양파분말 000016 → 000014).
- 제품 쪽은 코드가 아니라 연결만 따라가므로 배합비·원재료비는 그대로.
- **송연 원본 프로그램도 같은 DB 를 쓰므로 원본에서도 바뀐 코드로 보인다.** 원본 화면에 열어 둔 창이 있었다면 새로고침해야 한다.
- 제품BOM 변경로그(product_bom_log) 의 지난 기록 안 원재료코드는 그때의 기록이라 고치지 않는다.
- 종이로 출력해 둔 원재료코드 라벨·문서가 있다면 옛 코드다.
