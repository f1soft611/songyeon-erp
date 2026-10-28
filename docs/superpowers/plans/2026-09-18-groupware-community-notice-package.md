# Groupware Community Notice Package Implementation Plan

> **For agentic workers:** Execute the steps task-by-task with focused validation after each change.

**Goal:** Move the backend notice Java package, Mapper resource, and service test under `groupware.community.notice` while preserving API, SQL statement, and database contracts.

**Architecture:** Keep the existing controller, domain, repository, service, and Mapper contents intact. Move the Java and Mapper filesystem paths under the `community.notice` hierarchy, update Java package/import and Mapper result-type references, and retain the short MyBatis namespace `NoticeBoardDAO`.

**Tech Stack:** Java 8 source compatibility, Spring/eGovFrame, MyBatis XML, Maven, JUnit/AssertJ.

---

### Task 1: Move production notice packages

**Files:**

- Move `backend/src/main/java/egovframework/let/groupware/notice` to `backend/src/main/java/egovframework/let/groupware/community/notice`
- Modify all moved Java files: replace `egovframework.let.groupware.notice` with `egovframework.let.groupware.community.notice`

- [ ] Move the production directory while preserving its controller, domain, repository, and service subdirectories.
- [ ] Update each moved Java file's package declaration and internal imports to the new package prefix.
- [ ] Confirm the old production Java directory no longer exists and the new directory contains the same source files.

### Task 2: Update Mapper Java type references

**Files:**

- Move `backend/src/main/resources/egovframework/mapper/let/groupware/notice/NoticeBoard_SQL_postgresql.xml` to `backend/src/main/resources/egovframework/mapper/let/groupware/community/notice/NoticeBoard_SQL_postgresql.xml`
- Modify the moved Mapper XML

- [ ] Move the Mapper XML under the new `groupware/community/notice` resource hierarchy.
- [ ] Replace only the two result-map Java type names with `egovframework.let.groupware.community.notice.domain.model.*`.
- [ ] Preserve mapper namespace `NoticeBoardDAO`, statement IDs, and SQL.

### Task 3: Move and update notice service tests

**Files:**

- Move `backend/src/test/java/egovframework/let/groupware/notice` to `backend/src/test/java/egovframework/let/groupware/community/notice`
- Modify moved `NoticeBoardServiceImplTest.java`: replace `egovframework.let.groupware.notice` with `egovframework.let.groupware.community.notice`

- [ ] Move the test directory under the new package hierarchy.
- [ ] Update the test package declaration and imports.
- [ ] Confirm no old notice Java package or Mapper resource path references remain under `backend/src`.

### Task 4: Verify package wiring

**Files:**

- Modify `docs/result/20260918/groupware-community-notice-package/README.md`

- [ ] Run `mvn "-Dtest=NoticeBoardServiceImplTest" test` from `backend`.
- [ ] Run `mvn test` from `backend`.
- [ ] Record the commands and outcomes, including any pre-existing unrelated failures, in the result document.
- [ ] Verify the old package/resource path search is empty and the Mapper namespace remains `NoticeBoardDAO`.
