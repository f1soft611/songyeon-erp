package egovframework.let.pu.documents.service;

import java.util.List;

import org.springframework.web.multipart.MultipartFile;

import egovframework.let.common.attachment.domain.model.AttachmentUploadResultVO;
import egovframework.let.common.attachment.domain.model.AttachmentVO;
import egovframework.let.pu.documents.domain.model.DocFileVO;
import egovframework.let.pu.documents.domain.model.DocFolderSaveVO;
import egovframework.let.pu.documents.domain.model.DocFolderVO;
import egovframework.let.pu.documents.domain.model.DocLockRequestVO;
import egovframework.let.pu.documents.domain.model.DocPersonVO;
import egovframework.let.pu.documents.domain.model.DocShareRequestVO;
import egovframework.let.pu.documents.domain.model.DocShareResultVO;
import egovframework.let.pu.documents.domain.model.DocShareVO;
import egovframework.let.pu.documents.domain.model.DocUserVO;

/**
 * 구매관리 - 문서함 서비스 인터페이스 (송연 attachments.py 의 부서별 공문저장소 · 폴더 잠금 · 문서 공유)
 * 모든 메서드는 로그인한 사원 번호(employees.id)를 받는다. 누가 무엇을 볼 수 있는지는 화면이 아니라 여기서 막는다.
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
public interface DocumentBoxService {

    /** 로그인한 사원(이름·부서·관리자 여부) */
    DocUserVO me(String employeeId) throws Exception;

    /** 볼 수 있는 폴더 전부(한 줄씩, 부모 번호를 달아서). 잠긴 폴더 안은 열기 전까지 빼고, 잠긴 폴더의 개수도 숨긴다 */
    List<DocFolderVO> listFolders(String employeeId) throws Exception;

    /** 새 폴더. 최상위면 공용/개인과 부서를 정하고, 하위폴더는 위를 따른다. 새 번호를 돌려준다 */
    long createFolder(String employeeId, DocFolderSaveVO request) throws Exception;

    void renameFolder(String employeeId, long folderId, String name) throws Exception;

    /** 비어있을 때만 지운다 */
    void deleteFolder(String employeeId, long folderId) throws Exception;

    /** 비밀번호 걸기·바꾸기(바꿀 때는 지금 비밀번호, 관리자는 없이) */
    void setLock(String employeeId, long folderId, DocLockRequestVO request) throws Exception;

    /** 비밀번호 없애기(관리자이거나 지금 비밀번호를 아는 사람) */
    void clearLock(String employeeId, long folderId, String current) throws Exception;

    /** 비밀번호로 열어둔다(로그아웃할 때까지) */
    void unlock(String employeeId, long folderId, String password) throws Exception;

    /** 폴더 안 파일(파일마다 공유된 사람 수) */
    List<DocFileVO> listFiles(String employeeId, long folderId) throws Exception;

    AttachmentUploadResultVO upload(String employeeId, long folderId, List<MultipartFile> files) throws Exception;

    /** 내려받을 파일. 나에게 공유됐거나, 그 폴더를 볼 수 있어야 한다 */
    AttachmentVO findForDownload(String employeeId, long attachmentId) throws Exception;

    void deleteFile(String employeeId, long attachmentId) throws Exception;

    /** 문서 하나 또는 폴더 하나를 보내고 메신저로 알린다 */
    DocShareResultVO share(String employeeId, DocShareRequestVO request) throws Exception;

    /** 공유받을 사람(나 빼고) */
    List<DocPersonVO> people(String employeeId) throws Exception;

    /** 사원에게 적어둔 부서 이름들(공용 폴더를 만들 때 고른다) */
    List<String> departments() throws Exception;

    /** 나에게 온 공유(기한 지난 것 빼고, 최근 위) */
    List<DocShareVO> sharesToMe(String employeeId) throws Exception;

    /** 내가 보낸 공유 */
    List<DocShareVO> sharesByMe(String employeeId) throws Exception;

    void cancelShare(String employeeId, long shareId) throws Exception;
}
