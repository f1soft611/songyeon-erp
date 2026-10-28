# F1-GRID 행 높이 조절 및 긴 텍스트 표시 설계

## 목적

F1-GRID 셀의 긴 텍스트를 기본 상태에서는 말줄임표로 표시하고, 사용자가 특정 행의 높이를 Excel처럼 조절하면 해당 행 안에서 텍스트가 줄바꿈되도록 한다.

## 범위

- F1-GRID 행별 높이 상태 관리
- 행 하단 드래그 핸들을 통한 높이 조절
- 기본 높이, 최소 높이, 최대 높이 설정
- 셀 표시 텍스트의 말줄임표 및 줄바꿈 전환
- 키보드 편집, 선택, 행 병합, 클립보드 동작의 기존 계약 유지
- 공통 컴포넌트 테스트 추가 및 기존 테스트 회귀 검증

다음은 이번 변경에서 제외한다.

- 행 높이 서버 저장 또는 사용자별 레이아웃 저장
- 컬럼 너비 조절
- 외부 Grid 라이브러리 도입
- 업무 페이지별 별도 구현

## 공개 API

`F1GridColumn`에 다음 속성을 추가한다.

```ts
wrapText?: boolean;
```

`F1GridProps`에 다음 속성을 추가한다.

```ts
rowHeight?: number;
minRowHeight?: number;
maxRowHeight?: number;
resizableRows?: boolean;
```

기본값은 `rowHeight: 40`, `minRowHeight: 40`, `maxRowHeight: 300`, `resizableRows: true`로 한다. `wrapText`의 기본값은 `true`로 하며, 높이가 기본값을 초과한 행에서만 줄바꿈을 허용한다.

## 컴포넌트 설계

- `F1Grid.tsx`
  - `rowHeights`를 `Map<string, number>` 형태의 상태로 관리한다.
  - 행 ID를 기준으로 높이를 저장해 정렬, 편집, 선택 상태와 분리한다.
  - `rowHeight`, `minRowHeight`, `maxRowHeight`, `resizableRows`를 `GridBody`에 전달한다.
- `GridBody.tsx`
  - 행 높이 상태를 행 ID로 조회한다.
  - CSS Grid의 `gridAutoRows` 대신 행별 높이를 명시한 트랙을 사용한다.
  - 각 행에 높이 변경 콜백과 resize 활성화 여부를 전달한다.
- `GridRow.tsx`
  - 행의 높이를 CSS 변수 또는 스타일로 적용한다.
  - `resizableRows`일 때 행 하단에 키보드 접근 가능한 resize 핸들을 렌더링한다.
  - 포인터 드래그 시작 시 현재 행 ID와 시작 위치를 기준으로 높이를 계산한다.
- `GridCell.tsx`
  - 기본 표시 상태는 `overflow: hidden`, `textOverflow: ellipsis`, `whiteSpace: nowrap`을 적용한다.
  - `wrapText`가 활성화되고 행 높이가 기본 높이보다 큰 경우 `whiteSpace: normal`, `overflowWrap: anywhere`를 적용한다.
  - 편집기와 체크박스 레이아웃은 기존 동작을 유지한다.

## 상호작용 규칙

- 높이는 `minRowHeight` 이상, `maxRowHeight` 이하로 제한한다.
- 드래그 중에는 현재 행만 변경한다.
- 기본 높이로 되돌리면 다시 한 줄 말줄임 상태가 된다.
- 행 삭제/복원 또는 외부 rows 갱신 시 존재하지 않는 행의 높이 상태는 화면 동작에 영향을 주지 않는다.
- 행 병합 셀은 병합된 전체 영역의 높이를 기존 CSS Grid 행 트랙에 따라 표시한다.
- resize 핸들은 셀 편집을 시작하지 않으며, 선택/포커스 이벤트를 가로채지 않는다.
- 마우스뿐 아니라 `aria-valuenow`, `aria-valuemin`, `aria-valuemax`를 가진 핸들에서 ArrowUp/ArrowDown으로 높이를 4px씩 조절할 수 있다.

## 오류 처리 및 접근성

- 잘못된 범위의 높이 값은 경계값으로 보정한다.
- resize 핸들에는 현재 행을 식별할 수 있는 `aria-label`을 제공한다.
- 포커스된 핸들에 시각적 포커스 스타일을 적용한다.
- 셀 내용 전체는 기본 말줄임 상태에서도 `title` 속성으로 확인할 수 있도록 한다.

## 테스트 기준

- 긴 텍스트가 기본 높이에서 말줄임 표시 정책을 갖는다.
- `wrapText` 컬럼은 높이가 증가한 행에서 줄바꿈 표시 정책을 갖는다.
- 포인터 드래그로 행 높이가 최소/최대 범위 안에서 변경된다.
- 키보드 ArrowUp/ArrowDown으로 행 높이가 조절된다.
- 행별 높이 변경이 다른 행에 영향을 주지 않는다.
- 기존 F1-GRID 테스트와 TypeScript/Vite 빌드가 통과한다.

## 검증 명령

```bash
cd /mnt/d/f1soft/dev/react/S-ERP/frontend
npm exec -- vitest run tests/f1-grid.test.tsx
npm run build
```
