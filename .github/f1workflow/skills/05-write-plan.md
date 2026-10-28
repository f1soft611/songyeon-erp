# 05. 상세 실행 계획 수립 스킬 (05-write-plan)

> **Superpowers `writing-plans` / `executing-plans` 기반**: 사양서를 기반으로 2~5분 단위로 완료 가능한 명확한 실행 단계(Bite-sized Steps)를 세우고 세션 체크포인트를 수립합니다.

---

## 🚦 사전 승인 조건 (절대 규칙)

- 03단계에서 작성한 계획서와 상세 사양서를 사용자가 명시적으로 구현 승인한 경우에만 이 스킬을 사용합니다.
- 승인 기록이 없거나 사용자의 응답이 질문, 검토 의견, 추가 요구사항, 모호한 긍정 표현이면 상세 실행 계획을 작성하거나 실행하지 않습니다.
- 이 경우 계획서와 사양서를 다시 제시하고 구현 승인 요청 상태를 유지합니다.

---

## 📋 계획 수립 규칙

1. **작은 단위로 분해**:
   - 각 구현 단계는 2~5분 내에 완료할 수 있는 명확하고 격리된 단위여야 합니다.
2. **구체적인 명세 포함**:
   - 수정/생성할 파일의 **정확한 경로** (예: `frontend/src/pages/DashboardPage.tsx`)
   - 구현할 로직 및 코드 변경 요약
   - 해당 단계 완료 직후 실행할 **검증 명령어** (`npm run test -- tests/...` 또는 `mvn test`)
3. **독립성 판별**:
   - 서로 의존성이 없는 독립 태스크(예: 프론트엔드 컴포넌트 수정과 백엔드 컨트롤러 구현)를 식별하여 병렬 에이전트 분산 대상으로 지정합니다.

4. **실행 가능성 보장**:
   - 계획의 각 태스크는 정확한 파일 경로, 인터페이스, 테스트 코드 또는 검증 대상, 예상 실패/성공 조건을 포함해야 합니다.
   - 각 태스크의 마지막 단계는 커밋이며, 다음 태스크가 의존하는 결과는 `Interfaces`에 명시합니다.
   - 계획 전체의 공통 제약은 `Global Constraints`로 한 번만 정의하고, 태스크마다 반복하지 않습니다.
   - 문서에 `TBD`, `TODO`, “적절히 처리”, “위 태스크와 동일” 같은 미완성 지시를 남기지 않습니다.

---

## 📝 실행 계획 구조 예시

```markdown
### Step 1: 프론트엔드 버튼 컴포넌트 마진 수정

- 파일: `frontend/src/shared/components/CustomButton.tsx`
- 작업: MUI TextField `margin="none"` prop 추가
- 검증: `npm run test -- tests/f1-grid.test.tsx`

### Step 2: 백엔드 DTO 및 MyBatis Mapper SQL 업데이트

- 파일: `backend/src/main/resources/egovframework/sqlmap/mappers/Menu_SQL.xml`
- 작업: 이중 따옴표 비교 조건문 적용 (`active == "Y"`)
- 검증: `mvn "-Dtest=MenuMapperTest" test`
```
