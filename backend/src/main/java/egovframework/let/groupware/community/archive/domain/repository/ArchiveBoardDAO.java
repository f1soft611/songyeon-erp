package egovframework.let.groupware.community.archive.domain.repository;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.groupware.community.archive.domain.model.ArchiveBoardFileItemVO;
import egovframework.let.groupware.community.archive.domain.model.ArchiveBoardFileVO;
import egovframework.let.groupware.community.archive.domain.model.ArchiveBoardPostVO;

@Repository("archiveBoardDAO")
public class ArchiveBoardDAO extends EgovAbstractMapper {
    public List<ArchiveBoardFileItemVO> selectArchiveFileList(Map<String, Object> params) throws Exception {
        return selectList("ArchiveBoardDAO.selectArchiveFileList", params);
    }

    public Long selectArchiveFileCount(Map<String, Object> params) throws Exception {
        return selectOne("ArchiveBoardDAO.selectArchiveFileCount", params);
    }

    public ArchiveBoardFileItemVO selectArchiveFileItemById(Map<String, Object> params) throws Exception {
        return selectOne("ArchiveBoardDAO.selectArchiveFileItemById", params);
    }

    public int updateArchiveFileNameAndCategory(Map<String, Object> params) throws Exception {
        return update("ArchiveBoardDAO.updateArchiveFileNameAndCategory", params);
    }

    public int updateArchivePostCategoryAndTitle(Map<String, Object> params) throws Exception {
        return update("ArchiveBoardDAO.updateArchivePostCategoryAndTitle", params);
    }

    public List<ArchiveBoardPostVO> selectArchivePostList(Map<String, Object> params) throws Exception {
        return selectList("ArchiveBoardDAO.selectArchivePostList", params);
    }

    public Long selectArchivePostCount(Map<String, Object> params) throws Exception {
        return selectOne("ArchiveBoardDAO.selectArchivePostCount", params);
    }

    public ArchiveBoardPostVO selectArchivePostById(Map<String, Object> params) throws Exception {
        return selectOne("ArchiveBoardDAO.selectArchivePostById", params);
    }

    public ArchiveBoardPostVO selectArchivePostForUpdate(Map<String, Object> params) throws Exception {
        return selectOne("ArchiveBoardDAO.selectArchivePostForUpdate", params);
    }

    public Long insertArchivePost(Map<String, Object> params) throws Exception {
        return selectOne("ArchiveBoardDAO.insertArchivePost", params);
    }

    public int updateArchivePost(Map<String, Object> params) throws Exception {
        return update("ArchiveBoardDAO.updateArchivePost", params);
    }

    public int softDeleteArchivePost(Map<String, Object> params) throws Exception {
        return update("ArchiveBoardDAO.softDeleteArchivePost", params);
    }

    public List<ArchiveBoardFileVO> selectArchiveAttachmentList(Map<String, Object> params) throws Exception {
        return selectList("ArchiveBoardDAO.selectArchiveAttachmentList", params);
    }

    public ArchiveBoardFileVO selectArchiveAttachmentById(Map<String, Object> params) throws Exception {
        return selectOne("ArchiveBoardDAO.selectArchiveAttachmentById", params);
    }

    public Map<String, Object> selectArchiveBoardConfig() throws Exception {
        return selectOne("ArchiveBoardDAO.selectArchiveBoardConfig");
    }
}
