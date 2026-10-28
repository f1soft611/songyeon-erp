package egovframework.let.groupware.approval.domain.repository;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.groupware.approval.domain.model.ApprovalLineTemplateLineVO;
import egovframework.let.groupware.approval.domain.model.ApprovalLineTemplateVO;

@Repository("approvalLineTemplateDAO")
public class ApprovalLineTemplateDAO extends EgovAbstractMapper {

    public List<ApprovalLineTemplateVO> selectOwnedTemplates(Map<String, Object> params) throws Exception {
        return selectList("ApprovalLineTemplateDAO.selectOwnedTemplates", params);
    }

    public ApprovalLineTemplateVO selectOwnedTemplate(Map<String, Object> params) throws Exception {
        return selectOne("ApprovalLineTemplateDAO.selectOwnedTemplate", params);
    }

    public List<ApprovalLineTemplateLineVO> selectOwnedTemplateLines(Map<String, Object> params) throws Exception {
        return selectList("ApprovalLineTemplateDAO.selectOwnedTemplateLines", params);
    }

    public Boolean selectOwnedTemplateNameExists(Map<String, Object> params) throws Exception {
        return (Boolean) selectOne("ApprovalLineTemplateDAO.selectOwnedTemplateNameExists", params);
    }

    public Long insertTemplate(Map<String, Object> params) throws Exception {
        return (Long) selectOne("ApprovalLineTemplateDAO.insertTemplate", params);
    }

    public int insertTemplateLines(Map<String, Object> params) throws Exception {
        return insert("ApprovalLineTemplateDAO.insertTemplateLines", params);
    }

    public int updateOwnedTemplateName(Map<String, Object> params) throws Exception {
        return update("ApprovalLineTemplateDAO.updateOwnedTemplateName", params);
    }

    public int deleteOwnedTemplate(Map<String, Object> params) throws Exception {
        return delete("ApprovalLineTemplateDAO.deleteOwnedTemplate", params);
    }
}
