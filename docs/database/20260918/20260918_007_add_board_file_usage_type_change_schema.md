# 20260918_007 공지사항 본문 이미지 용도 구분 변경 이력

- 날짜: 2026-09-18
- 변경 내용: `tb_common_file.file_usage_type` 컬럼과 허용값 제약 추가
- 적용 대상: `tb_common_file`
- 기본값: `ATTACHMENT`
- 허용값: `ATTACHMENT`, `EMBEDDED`
- 영향 범위: 공지사항 본문 이미지와 일반 첨부파일의 조회·삭제·표시 구분
- DB 변경: 컬럼 추가 및 CHECK 제약 추가
- 롤백: `20260918_007_add_board_file_usage_type_rollback.sql`
- MCP 확인 근거: `tb_common_file`은 `owner_type`/`owner_id`로 공지 첨부와 본문 이미지를 함께 관리하며, `file_usage_type`으로 `ATTACHMENT`와 `EMBEDDED`를 구분한다.
