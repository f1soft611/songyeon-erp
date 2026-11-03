# 20261103_002 화면검수 사번 저장 변경 이력

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-11-03 |
| 대상 DB | songyeon (PostgreSQL) |
| 유형 | 컬럼 바꾸기(이름 · 타입) · FK 삭제 · 유일 제약 바꾸기 · 데이터 바꾸기 |
| 대상 표 | `tb_screen_review`, `tb_screen_review_history`, `tb_screen_review_draft` |
| 적용 | 2026-11-03 적용 완료 (트랜잭션 시험 실행: 현황 1 · 이력 5줄 사번으로 바뀜 · 이력 5줄 모두 사원 표와 이어짐, 다시 적용해도 같음, 롤백하면 칸 순서 말고 처음과 같음 확인 후 적용) |
| 롤백 | `20261103_002_rollback.sql` |

## 내용

- 요청: "사원관련은 employees의 id를 쓰고싶은데 … 한번에 직관적이고". 화면검수만 `tb_user.user_id`(내부 번호)로 저장해 사원 표와 바로 이어지지 않았다.
- 설계: [20261103_002_화면검수_사번저장_설계서.md](../../spec/20261103/20261103_002_화면검수_사번저장_설계서.md)

| 테이블 | 바뀌기 전 | 바뀐 뒤 |
|---|---|---|
| `tb_screen_review` | `reviewer_user_id` bigint (`tb_user` FK), `created_by` · `updated_by` bigint | `reviewer_emp_id` varchar(20), `created_by` · `updated_by` varchar(20) |
| `tb_screen_review_history` | `reviewer_user_id` bigint NOT NULL (`tb_user` FK) | `reviewer_emp_id` varchar(20) NOT NULL |
| `tb_screen_review_draft` | `writer_user_id` bigint NOT NULL (`tb_user` FK), `uq_tb_screen_review_draft (tenant_id, menu_id, writer_user_id)` | `writer_emp_id` varchar(20) NOT NULL, `uq_tb_screen_review_draft (tenant_id, menu_id, writer_emp_id)` |

- 이미 있는 값은 `tb_user` → `tb_login_account.login_code`(= `employees.id`)로 바꿨다(`LoginEmployeeResolver`와 같은 찾기). 바꿀 수 없는 값이 하나라도 있으면 스크립트가 멈춘다.
- 사번 칸에는 FK를 걸지 않는다(송연 다른 테이블의 등록자 · 수정자와 같다). 이름은 조회할 때 `employees.name`, 사원 표에 없으면 사번 그대로.
- `tb_screen_review`의 `created_by` · `updated_by`는 칸을 새로 만들어 옮겨서 칸 순서가 맨 뒤로 바뀐다.

## 같이 바뀐 코드

| 영역 | 위치 |
|---|---|
| 백엔드 | `ScreenReviewApiController` (`LoginEmployeeResolver`로 사번), `ScreenReviewService` · `ScreenReviewServiceImpl` (`String empId`, 사번 없으면 "로그인 사원을 확인할 수 없어요. 다시 로그인해주세요"), 매퍼 `ScreenReview_SQL_postgresql.xml` (`empId`, `employees` 조인) |
| 프론트 | 바뀌지 않음 |

## 영향 범위

- 화면검수 테이블 3개만 바뀐다. `tb_user` FK가 빠져 사용자 삭제를 더 막지 않는다.
- 배포: DB와 war를 함께 올려야 한다. 예전 war는 `reviewer_user_id` 등을 찾아 화면검수 저장 · 조회가 실패한다.
