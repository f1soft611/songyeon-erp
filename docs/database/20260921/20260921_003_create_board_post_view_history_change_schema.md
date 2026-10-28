# 20260921_003 스키마 변경 이력

- 변경일: 2026-09-21
- 변경 내용: 공지사항 사용자별 최초 조회 이력 테이블 추가
- 적용 대상: `tb_board_post_view_history`
- 영향 범위: 공지사항 상세 조회 API의 사용자별 조회수 중복 방지
- 중복 기준: `(tenant_id, post_id, login_id)` 복합 유니크 제약
- 참조 관계: `tb_tenant`, `tb_board_post`, `tb_login_account`
- 멱등성: `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS` 사용
- 롤백: 조회 이력 테이블과 인덱스를 제거하는 rollback SQL 제공
- 데이터 영향: 신규 테이블 생성만 수행하며 기존 게시글·계정 데이터는 변경하지 않음
