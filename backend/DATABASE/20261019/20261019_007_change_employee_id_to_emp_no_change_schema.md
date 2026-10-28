# 20261019_007 사원 id 를 사번(글자)으로 변경 이력

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-10-19 |
| 대상 DB | songyeon (PostgreSQL) |
| 유형 | 스키마 변경 (칸 타입 변경 · 칸 삭제 · 시퀀스 삭제) + 데이터 변경 |
| 대상 | `employees` (`id`, `emp_no`, `employees_id_seq`), 사원 번호 칸 16개, 백업 표 `bak_20261019_007_employees_id` |
| 롤백 | `20261019_007_rollback.sql` |

## 내용

- 요청: "employees 테이블에서 EMP_NO 컬럼 삭제하고 ID 컬럼에 0000 으로 넣어줘. 아마 타입을 바차로 바꿔야 될걸"
- 결정(사용자): 전체 정리. 새 사원 사번은 8자리 자동 번호
- `employees`
  - `id`: integer(자동번호) → `varchar(20)`
  - 값: `emp_no` 가 있으면 그 값, 없으면 옛 id 를 8자리로 채운 값. 지금 사원 1명은 `0000` 이다.
  - 자동번호 기본값과 시퀀스 `employees_id_seq` 를 지웠다.
  - `emp_no` 칸과 그 유일 인덱스 `idx_employees_emp_no` 를 지웠다(`id` 가 PK 라 유일).
  - 새 사원 사번은 인사 화면에서 등록할 때 서버가 매긴다.
    - 번호표: `tb_id_sequence` 키 `EMPLOYEE_ID` · `ALL` · `ALL`
    - 8자리: `00000001` …
    - 이미 있는 사번이면 다음 번호로 넘어간다.
- 사원 번호를 담는 칸 16개: integer → `varchar(20)`, 담긴 옛 번호는 새 사번으로 옮긴다(지금은 모두 0줄)
  - `chat_messages.sender_id`, `chat_room_members.employee_id`, `chat_rooms.created_by`
  - `client_payments.created_by`, `dashboard_memos.created_by`
  - `document_folder.owner_id`, `document_share.shared_by`, `document_share.to_employee_id`
  - `leave_records.employee_id`
  - `recipe_clients.created_by`, `recipe_clients.sales_emp_id`, `recipe_drafts.created_by`, `recipe_handoffs.requested_by`
  - `recipe_shares.created_by`, `recipe_shares.employee_id`, `recipe_stage_logs.employee_id`
  - 이 칸들에 걸린 인덱스(유일 인덱스 포함)는 타입 변경 때 다시 만들어진다.
- 옛 번호 ↔ 새 사번 짝은 백업 표에 남긴다. 다시 돌려도 결과가 같다(이미 글자형이면 건너뜀).

## 영향 범위

- 로그인
  - 사번(`employees.id`)으로 로그인한다.
  - 로그인 정보의 사용자 번호(`uniqId`)는 사번이다.
- 인사관리: 사원 · 연차 API 의 사원 번호가 글자다(`/api/v1/ha/hr/employees/{id}` 등).
- 문서함 · 채팅, 레시피 · 공유: 사원 번호를 글자로 주고받는다.
- 포장유형 · 창고
  - 등록자 · 수정자에 로그인 사번을 그대로 넣는다.
  - 사원 표와 `id` 로 이어 이름을 보여준다.
  - 사번 조회 쿼리는 없앴다.
- 옛 S_ERP 화면(기안 양식 `co/workflow`, 창고관리 `system/warehouses`)은 S_ERP 사용자 표를 쓰므로 바꾸지 않았다.
  - 로그인 번호를 숫자로 읽기 때문에 `0000` 은 0 으로 읽힌다.
- 다른 글자형 `created_by` 칸(`attachment.uploaded_by`, `leave_records.created_by` 등)은 이름 · 아이디를 담으므로 그대로다.

## 확인

- 바꾸기 전 확인
  - 사원 1명, `emp_no` 1개
  - 위 16개 칸의 자료는 모두 0줄
  - `employees` 를 가리키는 FK 는 없음
- 한 트랜잭션 안에서 아래를 한 뒤 ROLLBACK 했다. ROLLBACK 뒤 DB 는 시험 전과 같았다.
  - 적용: `id` 글자형, `emp_no` 없음, 기본값 · 시퀀스 없음, 16칸 글자형, `0000` 한 줄
  - 다시 적용: 같음
  - 사번 `0000` 로그인 쿼리 1줄
  - 포장유형 등록자 이름 조인 됨
  - 새 사원(`00000001`)과 그 연차를 넣은 뒤 롤백 스크립트를 돌렸다.
    - 숫자형으로 돌아감
    - 새 사원 사번은 `emp_no` 에 남음
    - 연차가 그 사원을 가리킴
  - 롤백 스크립트만 돌렸을 때: 칸 · 기본값 · 인덱스 · 자료가 원래와 같음(되살린 `emp_no` 의 내부 칸 번호만 다름)
