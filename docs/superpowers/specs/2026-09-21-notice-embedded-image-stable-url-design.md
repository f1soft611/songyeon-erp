# 공지사항 본문 이미지 영구 조회 설계

## 목표

공지사항 본문 이미지가 만료되는 MinIO presigned URL에 의존하지 않도록 한다.

## 결정

- 임시 업로드 응답의 URL은 편집 중 미리보기 용도로만 사용한다.
- 공지 조회 응답에서는 `data-object-key`와 저장된 `EMBEDDED` 파일 메타데이터를 연결해 고정 이미지 API URL로 치환한다.
- 고정 API는 인증된 사용자의 테넌트와 공지 소유 파일을 확인한 뒤 MinIO 객체를 서버에서 스트리밍한다.
- 기존 DB 본문에 남아 있는 만료 URL도 조회 시 동일하게 치환한다.

## API

`GET /api/v1/groupware/boards/notice/posts/{postId}/embedded-images?objectKey={encodedObjectKey}`

요청 사용자가 인증되지 않았거나, 해당 공지에 `EMBEDDED` 파일과 동일한 `objectKey`가 없으면 이미지 내용을 반환하지 않는다.

## 영향 범위

- 백엔드 NoticeBoardService/Controller의 이미지 스트리밍 및 응답 치환
- 공지 본문 이미지 작업지시서와 사양서
- 서비스 회귀 테스트

DB 스키마 변경은 없다.
