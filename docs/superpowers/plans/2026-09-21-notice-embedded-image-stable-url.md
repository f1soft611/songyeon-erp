# 공지사항 본문 이미지 안정 URL 구현 계획

> **For agentic workers:** Implement the tasks in this plan with focused tests and validation checkpoints.

**Goal:** 공지사항 본문 이미지가 presigned URL 만료 후에도 인증된 사용자에게 계속 표시되도록 한다.

**Architecture:** 공지 조회 시 저장된 `data-object-key`를 공지의 `EMBEDDED` 파일 메타데이터와 연결해 고정 API URL로 바꾼다. 고정 API는 테넌트와 공지 소유권을 확인한 뒤 공통 파일 서비스를 통해 MinIO 객체를 스트리밍한다.

**Tech Stack:** Spring Boot/eGovFrame, MyBatis, PostgreSQL metadata, MinIO, JUnit 5/Mockito, React/Vite.

---

### Task 1: 조회 응답 안정 URL

**Files:**

- Modify: `backend/src/main/java/egovframework/let/groupware/community/notice/service/impl/NoticeBoardServiceImpl.java`
- Test: `backend/src/test/java/egovframework/let/groupware/community/notice/service/impl/NoticeBoardServiceImplTest.java`

- [x] 만료 URL을 포함한 본문과 `EMBEDDED` 파일 메타데이터 회귀 테스트 작성
- [x] 실패 확인
- [x] 이미지 태그의 `src`를 고정 API URL로 치환
- [x] 집중 테스트 통과 확인

### Task 2: 인증 이미지 스트리밍 API

**Files:**

- Modify: `backend/src/main/java/egovframework/let/groupware/community/notice/service/NoticeBoardService.java`
- Modify: `backend/src/main/java/egovframework/let/groupware/community/notice/service/impl/NoticeBoardServiceImpl.java`
- Modify: `backend/src/main/java/egovframework/let/groupware/community/notice/controller/NoticeBoardApiController.java`

- [x] 공지 본문 이미지 조회 메서드와 GET API 추가
- [x] `NOTICE` 소유자와 `EMBEDDED` 용도 및 object key 검증
- [x] 공통 파일 다운로드 서비스로 스트리밍 위임

### Task 3: 문서 계약 갱신 및 검증

**Files:**

- Modify: `docs/directions/20260918/20260918_007_공지사항_본문이미지_즉시업로드_작업지시서.md`
- Modify: `docs/spec/20260918/20260918_007_공지사항_본문이미지_즉시업로드_사양서.md`
- Create: `docs/superpowers/specs/2026-09-21-notice-embedded-image-stable-url-design.md`
- Create: `docs/result/20260921/notice-embedded-image-stable-url/result.md`

- [x] 공개 URL 정책을 고정 인증 API 정책으로 변경
- [ ] 백엔드 집중 테스트와 컴파일 실행
- [ ] 프론트 공지 피드 이미지 회귀 테스트 실행
- [ ] 결과 문서 기록
