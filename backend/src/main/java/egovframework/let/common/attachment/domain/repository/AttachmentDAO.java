package egovframework.let.common.attachment.domain.repository;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.common.attachment.domain.model.AttachmentVO;

/**
 * 첨부 파일 데이터 접근 클래스 (송연 attachment · document_share)
 * @author SONGYEON ERP
 * @since 2026.10.08
 * @version 1.0
 */
@Repository("attachmentDAO")
public class AttachmentDAO extends EgovAbstractMapper {

    public List<AttachmentVO> selectByRefs(String scope, List<String> refIds) throws Exception {
        if (refIds == null || refIds.isEmpty()) {
            return Collections.emptyList();
        }
        Map<String, Object> params = new HashMap<>();
        params.put("scope", scope);
        params.put("refIds", refIds);
        return selectList("AttachmentDAO.selectByRefs", params);
    }

    public AttachmentVO selectOne(long id) throws Exception {
        return selectOne("AttachmentDAO.selectOne", id);
    }

    public int insertAttachment(AttachmentVO attachment) throws Exception {
        return insert("AttachmentDAO.insertAttachment", attachment);
    }

    public int deleteAttachment(long id) throws Exception {
        return delete("AttachmentDAO.deleteAttachment", id);
    }

    public int deleteShares(long id) throws Exception {
        return delete("AttachmentDAO.deleteShares", id);
    }

    public int deleteByRef(String scope, String refId) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("scope", scope);
        params.put("refId", refId);
        return delete("AttachmentDAO.deleteByRef", params);
    }
}
