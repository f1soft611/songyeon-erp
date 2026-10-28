package egovframework.let.common.attachment.service;

import java.nio.file.Path;
import java.util.List;
import java.util.Map;

import org.springframework.web.multipart.MultipartFile;

import egovframework.let.common.attachment.domain.model.AttachmentUploadResultVO;
import egovframework.let.common.attachment.domain.model.AttachmentVO;

/**
 * 첨부 파일 서비스 인터페이스 클래스 (송연 attachments.py 의 공통 첨부).
 * 범용 API 는 입고 서류(scope=receiving)만 받는다. 문서함(document) 파일은 폴더 권한을 따진 뒤 문서함 서비스가 …Document 로 부른다.
 * @author SONGYEON ERP
 * @since 2026.10.08
 * @version 1.0
 */
public interface AttachmentService {

    /** 여러 대상의 첨부를 한 번에 {refId: [파일...]} */
    Map<String, List<AttachmentVO>> listByRefs(String scope, List<String> refIds) throws Exception;

    /** 파일 여러 개 올리기. 빈 파일·30MB 넘는 파일은 건너뛰고 까닭을 돌려준다. 하나도 못 올리면 막는다. */
    AttachmentUploadResultVO upload(String scope, String refId, List<MultipartFile> files, String userName) throws Exception;

    /** 내려받을 파일(이름·경로). 표나 디스크에 없으면 막는다. */
    AttachmentVO find(long id) throws Exception;

    Path pathOf(AttachmentVO attachment) throws Exception;

    /** 파일 한 개 지우기(디스크·표·공유) */
    void delete(long id) throws Exception;

    /** 문서함 폴더에 파일 올리기(폴더를 만질 수 있는지는 부르는 쪽이 먼저 본다) */
    AttachmentUploadResultVO uploadDocuments(long folderId, List<MultipartFile> files, String userName) throws Exception;

    /** 문서함 파일 한 줄(디스크에 있는지는 보지 않는다). 문서함 것이 아니면 막는다. */
    AttachmentVO findDocument(long id) throws Exception;

    /** 문서함 파일 한 개 지우기(디스크·표·공유) */
    void deleteDocument(long id) throws Exception;

    /** 대상이 사라질 때(입고 취소 등) 붙어있던 파일까지 같이 치운다 */
    void deleteAllFor(String scope, String refId) throws Exception;
}
