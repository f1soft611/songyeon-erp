---
description: 'Use when working on PostgreSQL, DB, SQL, tables, columns, MyBatis Mapper XML, JPA entities, migrations, data integrity, or backend API data contracts.'
applyTo: 'backend/**/*.java,backend/**/*Mapper*.xml,backend/**/*.sql,docs/database/**/*.md,docs/database/**/*.sql,backend/DATABASE/**/*.md,backend/DATABASE/**/*.sql'
---

# Database MCP Reference Rules

데이터베이스 관련 요구사항을 처리하기 전에 워크스페이스의 `songyeon-erp-postgresql-readonly`를 사용해 현재 계약을 확인합니다. 조회는 `list_tables`, `describe_table`, 이 두 도구만으로 계약을 확인할 수 없는 경우에만 `query_readonly` 순서로 수행합니다. `query_readonly`는 읽기 전용 `SELECT` 또는 CTE 문장 하나만 실행하고, `maxRows`는 100 이하로 설정합니다. `COUNT`나 `EXISTS`를 우선 사용하거나 민감하지 않은 컬럼만 명시적으로 선택하며, 전체 테이블이나 민감한 행 데이터는 조회하지 않습니다.

MCP는 읽기 전용 근거 확인에만 사용하며, 데이터 변경, DDL, 트랜잭션 제어, 자격 증명, 연결 설정에는 절대 사용하지 않습니다. 메타데이터, 집계, 제한된 조회를 우선하고 개인정보, 계정, 인증, 테넌트 또는 기타 민감한 행 데이터를 소스, 테스트, 문서, 결과물, 채팅에 복사하지 않습니다.

MCP 확인 근거는 `AGENTS.md`의 날짜별 마이그레이션, 변경 이력, 롤백 규칙을 대체하지 않습니다. MCP를 사용할 수 없으면 완료 전에 실패 원인과 스키마 이력, Mapper XML, 도메인 코드에서 확인한 대체 근거를 결과 문서에 기록합니다.
