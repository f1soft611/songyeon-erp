# 20261029_001 전자결재 문서번호 추가 변경 이력

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-10-29 |
| 대상 DB | songyeon (PostgreSQL) |
| 유형 | 컬럼 추가 · 기존 문서 번호 채우기 · 유일 제약 추가 · 번호표 행 추가 |
| 대상 표 | `tb_electronic_approval_main`(`document_no` 추가), `tb_id_sequence`(키 `ELECTRONIC_APPROVAL_NO` 행) |
| 적용 | 2026-10-29 적용 완료 (트랜잭션 시험 실행: 적용 → 롤백 → 처음과 같음 확인 후 적용) |
| 롤백 | `20261029_001_rollback.sql` |
| 근거 | S_ERP `20261028_010_add_electronic_approval_document_no.sql` 과 같은 SQL |

## 내용

- 요청: "적용할거 그냥 다 적용하자 디비도 맞춰줘", "전자결재 통째로 맞추기"(S_ERP 문서작성 문서번호 · 문서 공유하기)
- `tb_electronic_approval_main.document_no VARCHAR(40) NOT NULL` 추가
- 기존 문서는 테넌트 · 작성일별로 작성 시각, 내부 ID 순서로 `EA-YYYYMMDD-NNNN` 번호를 채운다
- `(tenant_id, document_no)` 유일 제약 `uq_tb_electronic_approval_main_tenant_document_no` 추가
- `tb_id_sequence` 의 `ELECTRONIC_APPROVAL_NO`(테넌트 · 날짜) 번호표를 채운 번호의 최댓값으로 맞춘다

## 영향 범위

- 새 문서는 처음 임시저장할 때 서버(`DocumentApprovalWriteServiceImpl`)가 번호를 발급해 저장하고, 목록 · 상세 API 가 `documentNo` 를 돌려준다.
- 문서현황 통합검색은 문서 ID 대신 문서번호로 찾는다.
- 예전 서버(이 변경 전 war)는 새 문서를 넣을 때 `document_no` 를 비워 보내 NOT NULL 에 막힌다. 그래서 적용 뒤에는 새 war 를 올려야 새 문서를 작성할 수 있다(기존 문서 조회 · 결재는 그대로).
- 기존 내부 문서 ID, `eabus_no`, 문서 상태, 결재선 자료는 바꾸지 않는다.

## 적용 뒤 확인(2026-10-29)

- 문서 3건 모두 `EA-YYYYMMDD-NNNN` 형식, 테넌트 안에서 겹침 없음
- 번호표 `ELECTRONIC_APPROVAL_NO` 1행, 다른 번호표 행은 그대로(해시 비교)

## 롤백

- 번호표 `ELECTRONIC_APPROVAL_NO` 행, 유일 제약, `document_no` 컬럼을 지운다.
- 롤백하면 채운 번호와 새로 발급한 번호가 모두 사라진다. 번호를 밖에 알린 뒤에는 롤백하지 않는다. 서버 코드도 함께 돌려야 한다.
