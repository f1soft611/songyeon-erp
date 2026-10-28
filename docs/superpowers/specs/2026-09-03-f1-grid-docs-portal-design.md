# F1-Grid 개발자 문서 포털 설계

## 결정

F1-Grid 문서는 로그인 없는 공개 URL과 S-ERP 내부 메뉴에서 모두 접근한다. 화면은 고정 사이드바 탐색과 넓은 본문을 결합한다. 문서별 Playground는 옵션 패널 기반으로 시작하고, 코드 편집기는 후속 확장으로 남긴다.

## 정보 구조

Overview, Getting Started, Core Grid, Editing, Selection & Clipboard, Filtering & Sorting, Column Layout, Row Height, Row Merge, Tree Grid, API Reference, Testing Guide를 정적 문서 데이터로 관리한다.

## 런타임 구조

문서 선택 -> 문서 정의 조회 -> 본문 렌더링 -> 선택적 Playground 렌더링의 흐름을 사용한다. Playground는 기능별 설정을 F1-Grid props로 변환하며, 샘플 데이터만 렌더링한다. 공개 문서는 서버 API를 호출하지 않는다.

## UI/UX

데스크톱에서는 사이드바를 고정하고 본문 너비를 제한해 긴 설명과 코드를 읽기 쉽게 한다. 모바일에서는 사이드바를 토글 패널로 바꾼다. 코드 블록에는 복사 버튼을 제공하고 실행 예제는 설명 바로 아래에 배치한다.

## 확장성

문서 정의와 Playground 설정을 분리해 향후 CodeMirror/Monaco 편집기를 붙일 수 있게 한다. 첫 단계에서는 브라우저 임의 코드 실행을 도입하지 않는다.

## 검증

문서 라우트, 문서 전환, 옵션 변경, 코드 복사에 대한 Vitest 테스트를 작성한다. Playwright로 375px/768px/1280px를 캡처하고 실제 브라우저에서 문서 전환과 Playground 동작을 확인한다.
