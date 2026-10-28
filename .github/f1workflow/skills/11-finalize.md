# 11. 완료, 정리 및 결과 문서화 스킬 (11-finalize)

> **Superpowers `finishing-a-development-branch` 및 SONGYEON ERP 결과 문서화 규칙 결합**: 모든 검증이 완료되면 결과 문서를 작성하고 Git 작업 환경을 정돈하여 작업을 최종 마무리합니다.

---

## 📋 완료 및 정리 절차

### 0. 최종 진입 조건

- 전체 테스트와 필요한 빌드/브라우저 검증이 현재 트리에서 신선하게 통과했는지 확인합니다.
- 전체 브랜치 코드 리뷰에서 남은 Critical/Important 이슈가 없고, 지연된 Minor 및 모든 판정이 결과 원장에 기록되어 있어야 합니다.

### 1. 작업 결과 문서 작성 (필수)

- 저장 경로: `docs/result/YYYYMMDD/<work-slug>/`
- 폴더명 규칙: 영문 소문자, 숫자, 하이픈(-)만 사용 (한글 폴더 절대 금지)
- 필수 작성 내용:
  - 작업 개요 및 변경 목적
  - 연관 작업지시서, 계획서, 사양서 문서 링크
  - 주요 변경 파일 목록 및 핵심 변경 내역
  - 실제 실행한 검증 명령 및 테스트 성공 로그 요약
  - 스크린샷 이미지 링크 (UI 변경 시)
  - DB 변경 이력 파일 링크 (백엔드 DB 변경 시)

### 2. DB 스키마 관리 상태 최종 재확인 (백엔드 작업 시)

- `backend/DATABASE/YYYYMMDD/` 및 `docs/database/` 디렉터리에 다음 파일 세트가 누적 관리되었는지 확인합니다:
  - `YYYYMMDD_NNN_작업명.sql`
  - `YYYYMMDD_NNN_작업명_change_schema.md`
  - `YYYYMMDD_NNN_rollback.sql`
  - `docs/database/db-schema.md` (최신 상태 업데이트)

### 3. 브랜치 및 Worktree 정리 (`finishing-a-development-branch`)

- 테스트와 리뷰가 끝난 뒤 사용자에게 아래 선택지를 제시하고, 선택 전에는 병합·Push·삭제를 실행하지 않습니다.
  1. 기준 브랜치로 로컬 병합
  2. Push 후 Pull Request 생성
  3. 현재 브랜치 상태 유지
- Git Worktree를 사용했고 사용자가 병합 또는 명시적 폐기를 선택한 경우에만, Superpowers가 만든 Worktree인지 확인한 뒤 정리합니다:
  ```bash
  git worktree remove feature/[task-slug]
  # 또는
  git worktree prune
  ```

### 4. 최종 보고

- 완료 체크리스트와 결과 문서 링크를 사용자에게 최종 출력하고 작업을 종료합니다.
