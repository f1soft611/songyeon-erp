# 20261022_003 그룹웨어 메뉴 · 권한 · 게시판 종류 등록 변경 이력

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-10-22 |
| 대상 DB | songyeon (PostgreSQL) |
| 유형 | 데이터 변경 (스키마 변경 없음) |
| 대상 표 | `tb_menu`, `tb_menu_permission`, `tb_role_menu_permission`(ADMIN), `tb_board_type` |
| 적용 | 2026-10-22 적용 완료 (트랜잭션 시험 실행 후 적용) |
| 롤백 | `20261022_003_rollback.sql` |

## 내용

- 요청: S_ERP 그룹웨어 이관 0단계(작업지시서 `20261022_007_그룹웨어_이관_작업지시서.md`)
- 사용자가 모듈관리에서 등록한 `GROUPWARE` 모듈 아래에 S_ERP 그룹웨어 메뉴를 같은 값으로 넣었다.
  - 종합현황(`GW_OVERVIEW`)
  - 문서관리(`GW_DOCUMENTS`) > 문서작성(`DOC_WRITE`) · 문서현황(`DOC_READ`)
  - 커뮤니티(`GW_INFO_CENTER`) > 공지사항(`GW_NOTICE`) · 자료실(`GW_ARCHIVE`)
  - S_ERP 에서 사용안함인 게시판(`GW_BOARD`)은 넣지 않았다.
- 기능 권한
  - 맨 아래 메뉴 5개: READ · CREATE · UPDATE · DELETE · EXCEL
  - 공지사항은 BOARD_VIEW · BOARD_WRITE · BOARD_DELETE 를 더한다(S_ERP 와 같음).
  - 자료실은 BOARD_VIEW · BOARD_UPLOAD 를 더한다(S_ERP 와 같음).
- 시스템 관리자(ADMIN) 역할에 위 권한을 모두 줬다.
- 게시판 종류 `tb_board_type`: NOTICE(공지사항, notice, 읽기 ALL · 쓰기 MEMBER), ARCHIVE(자료실, archive, 읽기 ALL · 쓰기 ADMIN). S_ERP 값 그대로이고 새 메뉴에 잇는다.

## 영향 범위

- 왼쪽 메뉴에 그룹웨어 메뉴가 보인다(시스템 관리자). 화면은 단계별로 옮긴다. 그 전까지 아직 없는 화면(문서작성 · 문서현황 · 자료실)은 준비 중 화면으로 보일 수 있다.
