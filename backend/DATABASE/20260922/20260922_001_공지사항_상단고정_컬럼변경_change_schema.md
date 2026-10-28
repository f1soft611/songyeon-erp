# 20260922_001 공지사항 상단 고정 컬럼 변경

- 날짜: 2026-09-22
- 변경 내용: `tb_board_post.is_notice` 컬럼을 `tb_board_post.is_pinned`로 이름 변경
- 적용 대상 테이블: `tb_board_post`
- 영향 범위: 공지 게시글 목록 조회, 저장/수정, API VO, 프론트 조회·고정 토글
- 데이터 처리: 기존 `Y/N` 값은 컬럼명 변경으로 보존
- 롤백: `20260922_001_공지사항_상단고정_컬럼변경_rollback.sql` 실행
- DB MCP 근거: `tb_board_post`에 기존 `is_notice CHAR(1) NOT NULL DEFAULT 'N'` 존재, `is_pinned` 미존재 확인
