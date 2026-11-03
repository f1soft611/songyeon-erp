# 20261103_003 사원 식별자 사번 통일 변경 이력

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-11-03 |
| 대상 DB | songyeon (PostgreSQL) |
| 유형 | 컬럼 타입 바꾸기 · 자동 번호 없애기 · FK 바꾸기 · 데이터 바꾸기 |
| 대상 표 | `tb_login_account`, `tb_user`, `tb_login_account_role`, `tb_electronic_approval_line_info`, `tb_electronic_approval_line_template_info`, `tb_electronic_approval_pin`, `tb_electronic_approval_view_history`, `tb_board_post_view_history`, `tb_notice_popup_dismissal`, `tb_drafting_work_category`, `tb_drafting_work_category_authority`, `tb_drafting_work_category_group`, `tb_common_code_group`, `tb_common_code_item`, `tb_tenant`, (FK만) `tb_screen_review`, `tb_screen_review_history`, `tb_screen_review_draft` |
| 적용 | 2026-11-03 적용 완료(시험 실행 통과: 사람 값 23개 모두 사번 · 사원 표에 없는 값 0 · 옛 숫자 0 · `employees` FK 14개, 다시 적용해도 같음, 롤백하면 칸 · 자동 번호 · 제약 · 인덱스 · 사번으로 맞춘 값이 처음과 같음) |
| 롤백 | `20261103_003_rollback.sql` |

## 내용

- 요청: "사원 관련한 모든 테이블.컬럼에 사번이 들어갔으면 좋겠어 … id에 3 4 이렇게 들어가는거 진짜 맘에 안들어". 사원 등록으로 생긴 `employees.id`(사번)가 어디서나 사람을 가리킨다.
- 설계: [20261103_003_사원식별자_사번통일_설계서.md](../../spec/20261103/20261103_003_사원식별자_사번통일_설계서.md)

| 테이블.칸 | 바뀌기 전 | 바뀐 뒤 |
|---|---|---|
| `tb_login_account.login_id` (PK) | bigint 자동 번호 | varchar(20) 사번, 자동 번호 없음, FK → `employees` |
| `tb_user.user_id` (PK) | bigint 자동 번호 | varchar(20) 사번, 자동 번호 없음, FK → `employees` |
| `tb_user.login_id` | bigint → `tb_login_account` SET NULL | varchar(20) 사번, 같은 FK |
| `tb_login_account_role.login_id` | bigint → `tb_login_account` CASCADE | varchar(20) 사번, 같은 FK |
| 결재선 · 결재선 양식 `participant_user_id` | varchar(100), `tb_user` 번호 | varchar(20) 사번, FK → `employees` |
| 결재 고정 `tb_electronic_approval_pin.user_id` | bigint → `tb_user` CASCADE | varchar(20) 사번, FK → `employees` CASCADE |
| 결재 · 게시판 열람 `login_id` | bigint → `tb_login_account` | varchar(20) 사번, FK → `employees` |
| 공지 팝업 닫기 `login_id` | bigint → `tb_login_account` CASCADE | varchar(20) 사번, FK → `employees` CASCADE |
| 기안 업무 `approver_id` · `reviewer_id` | bigint → `tb_login_account` SET NULL | varchar(20) 사번, FK → `employees` SET NULL |
| 기안 업무 담당자 `employee_no` | varchar(10), `tb_user` 번호 | varchar(20) 사번, FK → `employees` |
| 기안 업무 3표 `created_by` · `updated_by` | bigint → `tb_login_account` SET NULL | varchar(20) 사번, FK 없음 |
| 공통코드 2표 `created_by` · `updated_by`, `tb_tenant.created_by` | bigint (값 없음) | varchar(20), FK 없음 |
| 화면검수 `reviewer_emp_id` · `writer_emp_id` | varchar(20) 사번, FK 없음 | FK → `employees` |

- 옛 번호 → 사번: 옛 `tb_user.user_id` → `tb_user.login_id` → `tb_login_account.login_code`, 옛 `login_id` → `login_code`. 바꿀 수 없는 값이 하나라도 있으면 멈춘다. 이미 사번이면 그대로라 다시 적용해도 같다.
- `tb_login_account.login_code`는 남긴다(`login_id`와 같은 값, 로그인 입력과 비교하는 칸). 칸 이름은 바꾸지 않았다.
- 등록자 · 수정자 칸에는 FK를 걸지 않는다(사용자 결정).
- 유일 제약 · 인덱스는 칸 형식만 바뀌고 그대로다(부분 인덱스 `idx_electronic_approval_line_pending_actor`는 다시 만들어지며 조건 표기만 바뀐다).
- 롤백: 옛 번호가 남지 않아 계정 · 사용자 번호를 사번 순서대로 1, 2, … 새로 매기고, 사람 칸을 그 번호로 바꾼 뒤 자동 번호 · 옛 FK를 되살린다.

## 같이 바뀐 코드

로그인 · 토큰 · 내 정보, 인사 계정 만들기, 시스템 역할 사용자 배정, 전자결재, 공지, 기안 업무, 화면(전자결재 · 기안 양식 · 프로필 · 역할). 자세한 위치는 계획서 [20261103_003_사원식별자_사번통일_계획서.md](../../plan/20261103/20261103_003_사원식별자_사번통일_계획서.md).

## 영향 범위

- 배포: DB · war · 프론트를 함께 올려야 한다. 예전 war는 로그인부터 사람 번호를 숫자로 읽어 실패한다.
- 배포 전에 받은 로그인 토큰은 토큰의 사번(`id`)으로 동작한다(다시 로그인하지 않아도 된다).
- 사원(`employees`) 줄을 지우려면 그 사원을 가리키는 결재선 · 열람 기록 · 계정 등이 먼저 없어야 한다(지금 사원을 지우는 기능은 없다).
