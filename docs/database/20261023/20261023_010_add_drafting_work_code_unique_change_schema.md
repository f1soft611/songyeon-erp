# 20261023_010 기안양식 코드 고유 인덱스 추가 변경 이력

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-10-23 |
| 대상 DB | songyeon (PostgreSQL) |
| 유형 | 스키마 변경(부분 고유 인덱스 추가) |
| 대상 표 | `tb_drafting_work_category` |
| 적용 | 2026-10-23 적용 완료 (트랜잭션 시험 실행: 다시 적용해도 같음, 롤백하면 처음과 같음 확인 후 적용) |
| 롤백 | `20261023_010_rollback.sql` |
| 원본 | S_ERP `20261002_002_drafting_work_code_unique`(같은 인덱스. S_ERP 는 읽기만 했다) |

## 내용

- 증상: 전자결재 관리 > 기안양식관리에서 새 양식을 [저장]하면 "데이터 처리 중 오류가 발생했습니다" 가 나왔다.
- 원인
  - 등록 쿼리(`DraftingWork_SQL_postgresql.xml` `insertWork`)는 `ON CONFLICT (tenant_id, cata_type_code) WHERE delete_status IS DISTINCT FROM 'Y' DO NOTHING` 을 쓴다.
  - PostgreSQL 은 이 모양에 맞는 고유 인덱스가 있어야 이 쿼리를 받는다.
  - S_ERP 는 20261002_002 로 그 인덱스를 만들었지만, 그룹웨어를 옮길 때 송연 DB 에는 빠졌다.
  - 그래서 송연에서는 기안양식 등록이 늘 실패했다.
- 고친 것: 같은 부분 고유 인덱스 `uq_drafting_work_category_tenant_cata_type` 를 만들었다.
  - 칸: `(tenant_id, cata_type_code)`, 조건: `delete_status IS DISTINCT FROM 'Y'`
  - 삭제 처리되지 않은 양식 코드는 테넌트 안에서 하나만 쓸 수 있다(`use_at = 'N'` 도 코드를 차지한다).
  - 만들기 전에 중복을 검사한다. 중복이 있으면 자료를 고치지 않고 멈춘다(적용 때 기안양식은 0건이었다).

## 영향 범위

- 기안양식 등록이 된다. 같은 코드를 동시에 두 번 등록하면 두 번째는 "이미 사용 중인 구분코드입니다" 로 막힌다.
- 표 · 자료는 바꾸지 않는다.
- 롤백하면 기안양식 등록이 다시 실패한다.
