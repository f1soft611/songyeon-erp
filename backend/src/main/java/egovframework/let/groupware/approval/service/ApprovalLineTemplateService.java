package egovframework.let.groupware.approval.service;

import java.util.List;

import egovframework.com.cmm.LoginVO;
import egovframework.let.groupware.approval.domain.model.ApprovalLineTemplateRenameRequestVO;
import egovframework.let.groupware.approval.domain.model.ApprovalLineTemplateSaveRequestVO;
import egovframework.let.groupware.approval.domain.model.ApprovalLineTemplateVO;

public interface ApprovalLineTemplateService {

    List<ApprovalLineTemplateVO> listTemplates(LoginVO user, String eabusNo) throws Exception;
    ApprovalLineTemplateVO getTemplate(LoginVO user, Long templateId) throws Exception;
    ApprovalLineTemplateVO createTemplate(LoginVO user, ApprovalLineTemplateSaveRequestVO request) throws Exception;
    ApprovalLineTemplateVO renameTemplate(LoginVO user, Long templateId,
            ApprovalLineTemplateRenameRequestVO request) throws Exception;
    void deleteTemplate(LoginVO user, Long templateId) throws Exception;
}
