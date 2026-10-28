# Database MCP Reference Rules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Require database-related S-ERP work to consult the workspace read-only PostgreSQL MCP server before implementation while preserving existing database migration controls.

**Architecture:** Put the scope decision and completion evidence requirement in `AGENTS.md`, which is the workspace-wide instruction source. Add a narrow file instruction for backend Java, MyBatis mapper XML, SQL, and database documentation that defines the safe MCP lookup sequence and fallback procedure. Record the completed rules change in the date-based result folder.

**Tech Stack:** VS Code Copilot custom instructions, Markdown, `s-erp-postgresql-readonly` stdio MCP server.

---

### Task 1: Add Workspace-Level MCP Decision Rule

**Files:**

- Modify: `AGENTS.md`

- [ ] **Step 1: Add the database MCP reference section after the existing verification-first principle**

```markdown
### 5. DB MCP 참조

- DB, SQL, 테이블, 컬럼, 데이터 정합성, 백엔드 API 데이터 계약과 관련된 작업은 구현 전에 `s-erp-postgresql-readonly` MCP로 현재 데이터베이스 계약을 확인한다.
- 기본 조회 순서는 `list_tables`, `describe_table`, 필요 시 반환 범위를 제한한 `query_readonly`다.
- MCP는 읽기 전용 근거 확인용이다. 스키마 또는 데이터 변경은 기존 날짜별 SQL, 변경 이력, 롤백 스크립트 규칙을 그대로 따른다.
- MCP 연결 실패 시 실패 원인과 대체 근거(스키마 이력, Mapper XML, 도메인 코드)를 결과 문서에 기록한다.
- 자격증명, 접속 문자열, 개인·계정·인증·테넌트 데이터 행을 작업 문서, 코드, 테스트 출력, 대화에 기록하지 않는다.
```

- [ ] **Step 2: Add this item to the existing 작업 시작 전 체크리스트**

```markdown
10. DB MCP 확인: DB 관련 작업이면 구현 전에 현재 테이블/컬럼/조회 계약을 읽기 전용 MCP로 확인
```

- [ ] **Step 3: Add this item to the existing 작업 종료 기준 and final checklist**

```markdown
- [ ] DB 관련 작업이면 MCP 확인 근거 또는 연결 실패 원인과 대체 근거를 결과 문서에 기록했는가
```

- [ ] **Step 4: Validate the Markdown document**

Run: `get_errors` for `AGENTS.md`

Expected: No errors.

### Task 2: Add File-Scoped Database MCP Instruction

**Files:**

- Create: `.github/instructions/database-mcp.instructions.md`

- [ ] **Step 1: Create the instruction with limited file patterns and discoverable keywords**

```markdown
---
description: 'Use when working on PostgreSQL, DB, SQL, tables, columns, MyBatis Mapper XML, JPA entities, migrations, data integrity, or backend API data contracts.'
applyTo: 'backend/**/*.java,backend/**/*Mapper*.xml,backend/**/*.sql,docs/database/**/*.md,docs/database/**/*.sql,backend/DATABASE/**/*.md,backend/DATABASE/**/*.sql'
---

# DB MCP Reference Rules

- Before implementing a database-related requirement, use the workspace `s-erp-postgresql-readonly` MCP server to verify the current database contract.
- Query in this order: `list_tables`, `describe_table`, then limited `query_readonly` only when metadata does not answer the requirement.
- Use MCP only for reads. Never attempt mutations, DDL, transaction control, credentials, or connection settings through MCP input.
- Prefer schema metadata and aggregate or limited queries. Do not copy personal, account, authentication, tenant, or other sensitive row data into source, tests, task documents, results, or chat responses.
- MCP evidence confirms the current database state but does not replace date-based SQL migrations, change records, or rollback scripts required by `AGENTS.md`.
- If MCP is unavailable, record the failure reason and fallback evidence from date-based schema history, Mapper XML, and domain code in the result document before implementation completes.
```

- [ ] **Step 2: Validate instruction frontmatter and scope**

Check that the frontmatter has a nonempty `description`, includes the seven specified backend/database patterns in `applyTo`, and does not use `applyTo: "**"`.

Expected: The instruction is discoverable for database work and does not apply to frontend-only source files.

- [ ] **Step 3: Validate the instruction document**

Run: `get_errors` for `.github/instructions/database-mcp.instructions.md`

Expected: No errors.

### Task 3: Record Rule Change Outcome

**Files:**

- Create: `docs/result/20260909/database-mcp-reference-rules/20260909_003_DB_MCP_참조규칙_추가_결과.md`

- [ ] **Step 1: Write the result document**

```markdown
# DB MCP 참조 규칙 추가 결과

## 변경 파일

- `AGENTS.md`
- `.github/instructions/database-mcp.instructions.md`

## 적용 규칙

- DB 관련 작업은 구현 전에 `s-erp-postgresql-readonly`의 `list_tables`, `describe_table`, 필요 시 제한된 `query_readonly`로 현재 계약을 확인한다.
- MCP는 읽기 전용 증거 수집에만 사용한다. DB 변경은 기존 날짜별 SQL, 변경 이력, 롤백 스크립트 절차를 유지한다.
- MCP 연결 실패 시 결과 문서에 실패 원인과 스키마 이력, Mapper XML, 도메인 코드 기반의 대체 근거를 기록한다.
- 자격증명과 민감한 데이터 행은 어떤 작업 산출물에도 기록하지 않는다.

## 검증 결과

- `AGENTS.md` 및 전용 지침 문서 진단: 통과
- 전용 지침 frontmatter의 description/applyTo 범위 확인: 통과
```

- [ ] **Step 2: Validate the result document**

Run: `get_errors` for `docs/result/20260909/database-mcp-reference-rules/20260909_003_DB_MCP_참조규칙_추가_결과.md`

Expected: No errors.

### Task 4: Final Scope Verification

**Files:**

- Verify: `AGENTS.md`
- Verify: `.github/instructions/database-mcp.instructions.md`
- Verify: `docs/result/20260909/database-mcp-reference-rules/20260909_003_DB_MCP_참조규칙_추가_결과.md`

- [ ] **Step 1: Confirm cross-document consistency**

Check all three files for the exact server name `s-erp-postgresql-readonly` and the exact tools `list_tables`, `describe_table`, and `query_readonly`.

Expected: No conflicting server names, tool names, or write permission claims.

- [ ] **Step 2: Check changed files for whitespace errors**

Run: `git diff --check`

Expected: Exit code 0 and no whitespace errors.
