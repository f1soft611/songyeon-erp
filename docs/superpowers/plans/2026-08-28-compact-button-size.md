# ERP 공통 버튼 크기 축소 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 프로젝트 테마의 공통 MUI 버튼을 기준보다 작게 조정해 ERP 화면의 공간 점유를 줄인다.

**Architecture:** 기존 `createAppTheme`의 `MuiButton` 전역 스타일을 유지하고 세로 패딩 값만 축소한다. 컴포넌트 구조와 버튼 동작은 변경하지 않는다.

**Tech Stack:** React, TypeScript, MUI, Vitest, Vite

---

### Task 1: 공통 버튼 토큰 축소

**Files:**

- Modify: `frontend/src/theme/theme.ts`의 `MuiButton.styleOverrides.root`
- Test: `frontend/tests/theme-settings.test.tsx` (기존 테마 설정 회귀 테스트 실행)

- [ ] **Step 1: 기존 테스트 실행**

Run: `npm run test -- tests/theme-settings.test.tsx`
Expected: 기존 테스트가 통과한다.

- [ ] **Step 2: 공통 버튼 세로 패딩 축소**

`MuiButton.styleOverrides.root`에서 `paddingTop`과 `paddingBottom`을 각각 `12px`에서 `8px`로 변경한다. `borderRadius`, `textTransform`, `boxShadow`, `fontWeight`는 그대로 둔다.

- [ ] **Step 3: 변경된 테스트 실행**

Run: `npm run test -- tests/theme-settings.test.tsx`
Expected: 테마/화면크기 설정 회귀 테스트가 통과한다.

- [ ] **Step 4: 타입 검사 및 번들 검증**

Run: `npm run build`
Expected: TypeScript 검사와 Vite 빌드가 성공한다.

- [ ] **Step 5: 브라우저 확인**

대시보드 화면에서 일반 `Button`의 높이가 축소되고 테마/화면크기 `IconButton`의 크기는 유지되는지 확인한다.
