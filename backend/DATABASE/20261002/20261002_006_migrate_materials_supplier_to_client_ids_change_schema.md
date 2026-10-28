# 20261002_006 원재료 납품업체를 materials.supplier 업체코드 배열로 이전 변경 이력

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-10-02 |
| 대상 DB | songyeon (PostgreSQL) |
| 유형 | 데이터 이전 (칸 구조 변경 없음) + 백업 표 |
| 대상 표 | materials.supplier (값 형식: 업체명 → 업체코드 배열 `'[3,5]'`), 백업 `bak_20261002_006_materials_supplier` |
| 적용 | 2026-10-02 적용 (트랜잭션 시험 실행 후 적용). 적용 당시 바뀐 줄: 000001 `'다온'` → `'[3]'` |
| 롤백 | `20261002_006_rollback.sql` (백업 값으로 되돌리고 백업 표 삭제) |

## 이유

- 사용자 요청: 원재료 납품업체를 `materials.supplier` 칸에 **업체코드 배열**(예: `[3]`, 여러 곳이면 `[3,5]`)로 저장하고, 조회할 때 이 업체코드로 `clients` 와 조인해 업체명을 가져온다.
- 20261002_005 의 `material_supplier.client_id` 방식 대신 이 방식을 쓴다. 우리 화면은 `material_supplier` 를 더 이상 읽지도 쓰지도 않는다(005 의 `client_id` 칸은 남아 있지만 쓰지 않음).

## 조회 방식

```sql
SELECT m.code, e.ord, e.id::int AS client_id, c.name AS client_name
FROM materials m
CROSS JOIN LATERAL jsonb_array_elements_text(
    CASE WHEN trim(m.supplier) ~ '^[[][0-9, ]*[]]$' THEN trim(m.supplier)::jsonb ELSE '[]'::jsonb END
) WITH ORDINALITY AS e(id, ord)
LEFT JOIN clients c ON c.id = e.id::int
ORDER BY m.code, e.ord;
```

- 배열이 아닌 옛 값(업체명)은 화면에 그 이름 그대로 보이고, 다시 골라 저장하면 업체코드 배열로 바뀐다.

## 영향 범위

- **송연 원본 프로그램도 같은 DB 를 쓴다.** 원본은 `materials.supplier` 를 납품업체 목록(`material_supplier`)이 비어 있을 때만 대신 보여주므로, 그 경우 원본 화면에는 `[3]` 같은 값이 보인다(사용자 확인 후 진행).
- `material_supplier` 의 기존 줄은 지우지 않는다(원본이 계속 읽음). 우리 화면에서 납품업체를 바꿔도 이 표는 고치지 않는다.
