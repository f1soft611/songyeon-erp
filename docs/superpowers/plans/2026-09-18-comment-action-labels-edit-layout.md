# 댓글 액션 명칭 및 수정 입력창 레이아웃 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 댓글/답글 더보기 메뉴와 수정 입력창의 명칭을 간결하게 정리하고 수정 액션을 한 줄로 유지한다.

**Architecture:** 공통 댓글 컴포넌트 `TiptapCommentThread`의 표시 문자열과 액션 행만 수정한다. 댓글 CRUD 콜백, 첨부파일 처리, API 계약은 유지하고 기존 컴포넌트 테스트의 접근성 조회 기준만 새 명칭에 맞춰 갱신한다.

**Tech Stack:** React, TypeScript, MUI, Vitest, Testing Library

---

### Task 1: 댓글 액션 명칭과 수정 입력창 기대값 고정

**Files:**

- Modify: `frontend/tests/feed-components.test.tsx`
- Modify: `frontend/tests/notice-page-local-updates.test.tsx`
- Modify: `frontend/tests/notice-page.test.tsx`

- [x] **Step 1: 더보기 메뉴 테스트를 `수정`/`삭제` 명칭으로 변경한다.**
  - `댓글 수정 작성자` 조회를 `수정`으로 변경한다.
  - `댓글 삭제 작성자` 조회를 `삭제`로 변경한다.
  - `댓글 수정 완료` 버튼 조회를 `수정`으로 변경한다.
- [x] **Step 2: 변경된 테스트만 실행해 현재 구현이 새 계약을 거부하는지 확인한다.**
  - Run: `npm run test -- tests/feed-components.test.tsx tests/notice-page-local-updates.test.tsx tests/notice-page.test.tsx`
  - Expected: 새 메뉴/버튼 문구를 찾지 못해 FAIL한다.

### Task 2: 댓글 컴포넌트의 표시 문구와 수정 액션 행 수정

**Files:**

- Modify: `frontend/src/shared/components/feed/TiptapCommentThread.tsx`

- [x] **Step 1: 더보기 메뉴 항목을 `수정`, `삭제`로 변경한다.**
  - 메뉴 항목의 visible text를 작성자 이름 없는 `수정`, `삭제`로 둔다.
  - 메뉴 열기, 닫기, 수정/삭제 콜백은 그대로 유지한다.
- [x] **Step 2: 수정 에디터의 submitLabel을 `수정`으로 변경한다.**
  - 수정 버튼의 접근성 이름은 기존 `댓글 수정 완료` 계약이 아니라 표시 명칭과 동일한 `수정`으로 변경한다.
  - `label="댓글 수정 입력"`은 에디터 식별을 위해 유지한다.
- [x] **Step 3: 액션 행이 한 줄을 유지하도록 flex 설정을 명시한다.**
  - 기존 `Stack direction="row"`에 `flexWrap: 'nowrap'`과 `whiteSpace: 'nowrap'`을 추가한다.
  - 첨부파일 아이콘, submit 버튼, 취소 버튼 순서를 유지한다.

### Task 3: 집중 검증

**Files:**

- No additional files.

- [x] **Step 1: 관련 댓글 테스트를 다시 실행한다.**
  - Run: `npm run test -- tests/feed-components.test.tsx tests/notice-page-local-updates.test.tsx tests/notice-page.test.tsx`
  - Result: 38 passed, 1 pre-existing failure. `flattens deep replies and submits replies to the root comment` expects 3 callback arguments while the existing component contract sends 4.
- [x] **Step 2: 프론트엔드 타입 검사와 번들 빌드를 실행한다.**
  - Run: `npm run build`
  - Expected: TypeScript와 Vite build PASS.
- [x] **Step 3: 변경 파일 diff를 확인해 범위를 검토한다.**
  - Run: `git diff -- frontend/src/shared/components/feed/TiptapCommentThread.tsx frontend/tests/feed-components.test.tsx frontend/tests/notice-page-local-updates.test.tsx frontend/tests/notice-page.test.tsx docs/superpowers/specs/2026-09-18-comment-action-labels-edit-layout-design.md`
  - Expected: 댓글 문구/레이아웃과 관련 테스트·설계 문서만 변경된다.
