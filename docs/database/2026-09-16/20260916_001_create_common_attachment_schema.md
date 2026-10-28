# 20260916_001 공통 첨부/댓글 스키마 추가

## 변경 내용

- 공통 첨부 파일 테이블 `tb_common_file` 추가
- 공통 댓글 테이블 `tb_common_comment` 추가
- `tenant_id + owner_type + owner_id` 기반 다중 도메인 소유 구조 적용
- 공통 첨부/댓글은 notice/board/approval 등 도메인별 연동을 위해 재사용 가능하도록 설계

## 적용 대상

- 공통 첨부 파일 API
- 공통 댓글 API
- Notice/Board/Approval 공통 연동 구조

## 영향 범위

- 신규 테이블 생성
- 공통 파일/댓글 API의 저장 및 조회 기능 활성화
- 도메인별 서비스는 ownerType/ownerId 포인터만 전달하면 된다

## 롤백 여부

- 가능
- `DROP TABLE tb_common_comment;`
- `DROP TABLE tb_common_file;`

## 참고

- 기존 notice 전용 테이블은 유지하되, 공통 계층으로 이동하는 추상화 구조를 기준으로 한다.
- 공통 파일/댓글은 `owner_type` 값을 통해 도메인을 구분한다.
