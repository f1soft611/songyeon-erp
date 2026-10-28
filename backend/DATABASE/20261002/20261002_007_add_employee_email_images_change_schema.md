# 20261002_007 직원 이메일·프로필 이미지·도장 이미지 칸 추가 변경 이력

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-10-02 |
| 대상 DB | songyeon (PostgreSQL) |
| 유형 | 칸 추가 |
| 대상 표 | employees (`email TEXT`, `profile_image TEXT`, `stamp_image TEXT`) |
| 적용 | 2026-10-02 적용 (트랜잭션 시험 실행 후 적용) |
| 롤백 | `20261002_007_rollback.sql` (칸 삭제 — 넣어 둔 값도 지워짐) |

## 이유

- S_ERP 에서 가져온 "내 정보 관리" 화면이 S_ERP 사용자 표(`tb_login_account`·`tb_user`)를 읽어, 송연 `employees` 로 로그인한 사용자는 조회가 비어 서버 오류가 났다.
- 화면을 `employees` 로 바꾸면서, 송연 표에 없던 이메일·프로필 이미지·도장 이미지 칸을 더한다(사용자 요청).

## 영향 범위

- 송연 원본 프로그램도 같은 DB 를 쓰지만 `employees` 를 칸 이름을 적어 읽으므로 칸이 늘어도 영향 없음.
- 이미지는 S_ERP 와 같은 data URL 글자(서버가 512px·1MB 이하 PNG/JPEG 로 줄임).
- 로그인 정보(`actionLoginEmployee`)도 이 칸들에서 이메일·이미지를 읽는다.
