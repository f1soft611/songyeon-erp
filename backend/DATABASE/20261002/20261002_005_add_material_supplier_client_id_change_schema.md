# 20261002_005 원재료 납품업체 업체코드 칸 추가 변경 이력

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-10-02 |
| 대상 DB | songyeon (PostgreSQL) |
| 유형 | 칸 추가 + 기존 데이터 채우기 + 색인 |
| 대상 표 | material_supplier (`client_id INTEGER` 추가, `idx_material_supplier_client_id`) |
| 적용 | 2026-10-02 적용 (트랜잭션 시험 실행 후 적용) |
| 롤백 | `20261002_005_rollback.sql` (칸·색인 삭제) |

## 이유

- 사용자 요청: 원재료BOM 납품업체를 고르면 업체명이 아니라 **업체코드(clients.id)** 를 보내 저장하고, 조회할 때 거래처 표와 조인해 업체명을 가져온다.
- 업체명으로만 이어두면 거래처BOM 에서 업체명을 고쳤을 때 납품업체가 끊긴다.

## 영향 범위

- **송연 원본 프로그램(파이썬 `app.py`·변환본)도 같은 DB 를 쓴다.** 원본은 `material_supplier` 를 `material_code, client_name` 칸 이름을 적어 읽고 쓰므로 칸이 하나 늘어도 영향 없음.
- 그래서 `client_name` 칸은 지우지 않고 저장 때 같이 기록한다. 원본이 새로 넣는 줄은 `client_id` 가 비어 있을 수 있어, 조회는 `client_id` 가 있으면 거래처 표의 현재 이름, 없으면 저장된 `client_name` 을 쓴다.
- 거래처BOM 에서 업체명을 바꾸면 `material_supplier.client_name` 도 같이 고친다(원본 화면도 새 이름을 보도록).
- 외래키는 걸지 않는다(이 DB 의 다른 표도 외래키가 없고, 걸면 거래처 삭제 동작이 송연과 달라짐).
- 기존 데이터: 적용 당시 `material_supplier` 0줄.
