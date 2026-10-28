# 20260923_006 프로필 직급 FK 추가 스키마 변경 이력

- 변경일: 2026-09-23
- 변경 대상: `tb_user`
- 변경 내용: nullable `level_id BIGINT` 컬럼 추가 및 `tb_common_code_item.common_code_item_id` FK 연결
- 참조 기준: `LEVEL` 공통코드 그룹의 항목 ID
- 기존 데이터: 기존 사용자 행은 `NULL` 유지
- 영향 범위: 로그인 사용자 프로필 조회, 대시보드 프로필 팝오버
- 삭제 정책: `ON DELETE RESTRICT`
- 롤백: 대응 rollback SQL 제공
- DB MCP 확인: `tb_user`에는 직급 컬럼이 없고 `tb_common_code_group.group_code = 'LEVEL'`이 존재함을 읽기 전용 확인
