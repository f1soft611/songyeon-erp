package egovframework.let.groupware.community.archive.service;

import javax.servlet.http.HttpServletResponse;

import org.springframework.web.multipart.MultipartFile;

import egovframework.com.cmm.LoginVO;
import egovframework.let.common.dto.ListResult;
import egovframework.let.groupware.community.archive.domain.model.ArchiveBoardFileItemVO;
import egovframework.let.groupware.community.archive.domain.model.ArchiveBoardFileSearchVO;
import egovframework.let.groupware.community.archive.domain.model.ArchiveBoardFileUpdateRequestVO;
import egovframework.let.groupware.community.archive.domain.model.ArchiveBoardFileVO;
import egovframework.let.groupware.community.archive.domain.model.ArchiveBoardPostSaveRequestVO;
import egovframework.let.groupware.community.archive.domain.model.ArchiveBoardPostSearchVO;
import egovframework.let.groupware.community.archive.domain.model.ArchiveBoardPostVO;

public interface ArchiveBoardService {
    ListResult<ArchiveBoardFileItemVO> listFiles(ArchiveBoardFileSearchVO search, LoginVO user) throws Exception;
    ArchiveBoardFileItemVO uploadFile(MultipartFile file, String folderCode, LoginVO user) throws Exception;
    ArchiveBoardFileItemVO updateFile(Long boardFileId, ArchiveBoardFileUpdateRequestVO payload, LoginVO user) throws Exception;
    ListResult<ArchiveBoardPostVO> listPosts(ArchiveBoardPostSearchVO search, LoginVO user) throws Exception;
    ArchiveBoardPostVO getPost(Long postId, LoginVO user) throws Exception;
    ArchiveBoardPostVO createPost(ArchiveBoardPostSaveRequestVO payload, LoginVO user) throws Exception;
    ArchiveBoardPostVO updatePost(Long postId, ArchiveBoardPostSaveRequestVO payload, LoginVO user) throws Exception;
    void deletePost(Long postId, LoginVO user) throws Exception;
    ArchiveBoardFileVO uploadAttachment(Long postId, MultipartFile file, LoginVO user) throws Exception;
    void deleteAttachment(Long postId, Long boardFileId, LoginVO user) throws Exception;
    void downloadAttachment(Long postId, Long boardFileId, HttpServletResponse response, LoginVO user) throws Exception;
}
