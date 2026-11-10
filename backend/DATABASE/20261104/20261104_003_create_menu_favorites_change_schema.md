# 20261104_003 메뉴 즐겨찾기 표 만들기 변경 이력

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-11-04 |
| 대상 DB | songyeon (PostgreSQL) |
| 유형 | 새 테이블 |
| 대상 표 | `tb_user_menu_favorite_folder`(새로), `tb_user_menu_favorite`(새로) |
| 적용 | 2026-11-04 적용 완료(시험 실행 통과: 다시 적용해도 같음, 사번으로 폴더 · 즐겨찾기 넣기, 같은 메뉴 두 번 · 남의 폴더 · 없는 사번 · 빈 폴더 이름 · 없는 메뉴 막힘, 롤백하면 표 없음) |
| 롤백 | `20261104_003_rollback.sql` |

## 내용

- 요청: S_ERP 메뉴 즐겨찾기를 송연에 넣는다.
- S_ERP `20261102_001`(두 표) · `20261102_002`(`favorite_nm`)을 합친 구조.
- 송연에 맞춘 점: 사람 칸 `user_id` 2개를 S_ERP 의 `bigint → tb_user` 대신 `varchar(20) → employees.id`(사번, ON DELETE CASCADE). 알림 · 쪽지 표(20261104_001 · 002)와 같은 기준.

| 표 | 칸 | 설명 |
|---|---|---|
| `tb_user_menu_favorite_folder` | favorite_folder_id · tenant_id · user_id · folder_nm(1~40자) · created_at · updated_at | 사람별 즐겨찾기 폴더 |
| `tb_user_menu_favorite` | favorite_id · tenant_id · user_id · menu_id → tb_menu(CASCADE) · favorite_folder_id(같은 주인 폴더, 없으면 맨 위) · favorite_nm · created_at · updated_at | 즐겨찾기. 같은 사람 · 같은 메뉴는 한 번 |

## 영향 범위

- 새 표라 기존 화면 · 데이터에 영향 없음. 서버(war) · 프론트와 함께 배포해야 즐겨찾기를 쓸 수 있다.
- 메뉴를 지우면 그 메뉴 즐겨찾기도 지워진다. 사원 줄을 지우면 그 사람 즐겨찾기 · 폴더도 지워진다.
- 롤백: 두 표를 지운다.
