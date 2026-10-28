# Groupware Community Notice Package Design

## Goal

백엔드 공지사항 모듈을 프론트엔드 구조와 맞춰 `groupware.community.notice` 계층으로 이동한다.

## Scope

- Java production source package and directory paths
- Java imports and package declarations
- Notice Mapper XML result type package names
- Notice service test package and directory path

## Preserved Contracts

- HTTP API URL and controller mappings
- MyBatis mapper namespace `NoticeBoardDAO`
- SQL statement IDs, database tables, columns, and query behavior
- Frontend response field names and JSON structure

## Target Structure

- `egovframework.let.groupware.community.notice.controller`
- `egovframework.let.groupware.community.notice.domain.model`
- `egovframework.let.groupware.community.notice.domain.repository`
- `egovframework.let.groupware.community.notice.service`
- `egovframework.let.groupware.community.notice.service.impl`

The mapper resource directory remains `egovframework/mapper/let/groupware/notice` because resource-path changes are outside the requested package/import/namespace/test-path scope. Its VO result types are updated to the new Java packages.

## Validation

Run the focused notice service test, then the complete backend Maven test suite. Search the backend source and test trees to confirm no old Java package references remain and that the mapper namespace remains `NoticeBoardDAO`.
