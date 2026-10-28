# 20261022_004 공통 댓글 구조 맞춤 · 댓글 좋아요 표 변경 이력

| 항목 | 내용 |
|---|---|
| 날짜 | 2026-10-22 |
| 대상 DB | songyeon (PostgreSQL) |
| 유형 | 스키마 변경 (컬럼 추가 · 제약 추가 · 표 생성) |
| 대상 표 | `tb_common_comment`, `tb_common_comment_like`(새로 만듦) |
| 적용 | 2026-10-22 적용 완료 (트랜잭션 시험 실행: 다시 적용해도 같음, 롤백하면 처음과 같음 확인 후 적용) |
| 롤백 | `20261022_004_rollback.sql` |

## 내용

- 요청: S_ERP 그룹웨어 이관 1단계 공통 기반(계획 · 사양서 `20261022_007_그룹웨어_이관_0-1단계_계획사양서.md`)
- 1단계에서 S_ERP 공통 댓글 매퍼(`CommonComment_SQL_postgresql.xml`)로 바꿨는데, 이 매퍼가 송연 DB 에 없는 구조를 쓴다. 그래서 S_ERP DB 의 현재 표 정의를 읽어 같게 맞췄다.
- `tb_common_comment`
  - `comment_type VARCHAR(20) NOT NULL DEFAULT 'USER'`: 사용자 댓글(USER)과 결재 이벤트 댓글(SYSTEM) 구분
  - `event_type VARCHAR(50)`: 시스템 댓글의 이벤트(승인 · 반려 · 상신 등)
  - `uq_tb_common_comment_tenant_comment UNIQUE (tenant_id, comment_id)`: 좋아요 표의 FK 대상
  - `chk_tb_common_comment_event_type`: USER 는 이벤트 없음, SYSTEM 은 정해진 이벤트 10개 중 하나
- `tb_common_comment_like` 새 표: 댓글마다 사용자 한 명당 좋아요 하나(`uq_common_comment_like_actor`). 테넌트 · 댓글이 지워지면 함께 지운다(CASCADE).
- 근거: S_ERP 스크립트 `20261008_003` · `20261008_004` · `20261012_001` 의 댓글 부분을 합친 최종 상태다. 적용한 뒤 S_ERP DB 와 두 표의 컬럼 · 제약 정의를 비교했고, 글자까지 같았다.

## 영향 범위

- 적용 시점에 송연 `tb_common_comment` 는 0행이었다. 그래서 기존 데이터 영향은 없다.
- 공통 댓글 API(`/api/common/comments`)를 쓰는 화면이 S_ERP 매퍼로 동작한다. 기존 댓글은 기본값 USER 가 된다.
