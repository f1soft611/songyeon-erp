# 공지사항 오류 수정 상세 실행 계획

## 목표

댓글 작성 오류, 첨부파일 포함 저장 오류, 저장 후 목록 맨뒤 이동, 저장 후 제목 잔류를 기존 공지사항 API 계약 안에서 최소 수정으로 해결한다.

## 공통 제약

- 작업 위치는 현재 브랜치 `socra710`이다.
- Worktree를 생성하지 않는다.
- 프론트엔드 공지사항 영역과 관련 테스트만 수정한다.
- 신규 API, DB 스키마, 권한 정책은 추가하지 않는다.
- 저장 성공은 서버 응답과 업로드 결과가 모두 확인된 뒤에만 확정한다.
- 각 태스크 완료 후 지정 검증을 실행하고, 실패 시 같은 태스크 범위에서 수정·재검증한다.

## Task 1: 오류 재현과 회귀 테스트 고정

- 파일: `frontend/tests/notice-page.test.tsx`
- 파일: `frontend/tests/notice-page-local-updates.test.tsx`
- 파일: `frontend/tests/notice-composer-payload.test.ts`
- 작업: 기존 공지 테스트 구조와 mock API 계약을 확인하고, 댓글 실패, 첨부 업로드 실패, 저장 후 목록 위치, 저장 후 draft 초기화의 실패/기대 동작을 가장 가까운 테스트에 고정한다.
- 검증: `cd frontend; npm run test -- tests/notice-page.test.tsx tests/notice-page-local-updates.test.tsx tests/notice-composer-payload.test.ts`
- 완료 조건: 수정 전 실패가 재현되거나, 이미 통과하는 항목은 회귀 기준으로 명시된다.

## Task 2: 공지 저장·첨부·목록 위치·draft 초기화 수정

- 파일: `frontend/src/pages/groupware/community/notice/CommunityNoticePage.tsx`
- 파일: `frontend/src/pages/groupware/community/notice/components/NoticeComposerDialog.tsx`
- 파일: `frontend/src/pages/groupware/community/notice/services/noticeBoardService.ts` (응답 계약 보정이 필요한 경우에만)
- 작업: 생성 응답의 `postId` 확보를 검증하고 첨부 업로드 실패 시 부분 업로드를 정리한다. 저장 성공 후 목록을 서버 정렬 기준으로 반영하며 단순 append를 제거하거나 보정한다. 성공 시 제목·본문·첨부 draft를 명시적으로 초기화하고 실패 시 재시도 가능한 상태를 유지한다.
- 검증: `cd frontend; npm run test -- tests/notice-page.test.tsx tests/notice-page-local-updates.test.tsx tests/notice-composer-payload.test.ts`
- 완료 조건: 첨부 포함 저장 성공·실패, 목록 위치, 다음 작성 모달의 빈 제목을 테스트로 확인한다.

## Task 3: 댓글·답글 작성 실패 상태 수정

- 파일: `frontend/src/pages/groupware/community/notice/CommunityNoticePage.tsx`
- 파일: `frontend/src/pages/groupware/community/notice/components/NoticeFeedList.tsx`
- 파일: `frontend/src/shared/components/feed/TiptapCommentThread.tsx`
- 파일: `frontend/src/shared/services/commonContentApi.ts` (payload/오류 계약 보정이 필요한 경우에만)
- 작업: 댓글/답글 API가 실패하면 성공 토스트나 로컬 트리 추가가 발생하지 않도록 한다. 파일 업로드 실패 시 생성된 댓글 첨부를 정리하고 오류 메시지와 재시도 가능한 입력 상태를 유지한다. 성공 시에만 서버 반환 ID와 첨부를 로컬 트리에 반영한다.
- 검증: `cd frontend; npm run test -- tests/notice-page.test.tsx tests/notice-page-local-updates.test.tsx`
- 완료 조건: 댓글과 답글의 성공·실패 및 첨부 실패 상태가 모두 회귀 테스트로 확인된다.

## Task 4: 최종 검증 및 결과 문서

- 파일: `docs/result/20260917/notice-crud-errors/progress.md`
- 파일: `docs/result/20260917/notice-crud-errors/README.md`
- 파일: `docs/result/20260917/notice-crud-errors/screenshots/`
- 작업: 태스크별 변경·검증 결과를 원장에 기록한다. 실제 브라우저에서 375px, 768px, 1280px로 공지 저장, 첨부 포함 저장, 댓글/답글 성공·실패, 저장 후 정렬, 제목 초기화를 확인하고 스크린샷을 저장한다.
- 검증: `cd frontend; npm run build`; `cd frontend; npm run test`; Playwright 브라우저 시나리오
- 완료 조건: 빌드·관련 테스트·브라우저 검증 결과와 미해결 이슈가 결과 문서에 기록된다.

## 인터페이스 및 체크포인트

- Task 1의 테스트 mock 계약은 Task 2와 Task 3의 구현 검증 기준으로 사용한다.
- Task 2와 Task 3은 서로 다른 주 동작을 가지지만 `CommunityNoticePage.tsx`를 공유하므로 동시에 수정하지 않는다.
- 각 태스크는 구현자 자기검토, 사양 준수 검토, 코드 품질 검토 후 다음 태스크로 이동한다.
- 태스크별 커밋은 사용자가 별도 요청하지 않는 한 생성하지 않는다.
