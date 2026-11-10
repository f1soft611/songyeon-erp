package egovframework.let.groupware.approval.status.service.impl;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.LoginVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalListPageVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalListQueryVO;
import egovframework.let.groupware.approval.domain.model.DocumentApprovalStatusListItemVO;
import egovframework.let.groupware.approval.domain.repository.DocumentApprovalDAO;
import egovframework.let.groupware.approval.common.service.DocumentApprovalAccessService;
import egovframework.let.groupware.approval.status.service.DocumentApprovalStatusService;

@Service("documentApprovalStatusService")
public class DocumentApprovalStatusServiceImpl extends EgovAbstractServiceImpl
        implements DocumentApprovalStatusService {

    private static final Set<String> DOCUMENT_TYPES = Collections.unmodifiableSet(new HashSet<>(Arrays.asList(
            "DRAFTING", "BUSINESS_CONTACT", "EXPENSE_RESOLUTION", "ATTENDANCE_APPLICATION")));
    private static final Set<String> PARTICIPANT_TYPES = Collections.unmodifiableSet(
            new HashSet<>(Arrays.asList("DRAFTER", "APPROVAL", "AGREEMENT", "REFERENCE")));
    private static final Set<String> DOCUMENT_STATUSES = Collections.unmodifiableSet(new HashSet<>(Arrays.asList(
            "DRAFT", "PENDING", "IN_PROGRESS", "REVISION_REQUESTED", "COMPLETED", "REJECTED")));
    private static final Set<String> DOCUMENT_SCOPES = Collections.unmodifiableSet(new HashSet<>(Arrays.asList(
            "ALL", "MY_PENDING", "MY_REFERENCE_PENDING", "IN_PROGRESS", "DRAFT", "COMPLETED",
            "REVISION_REQUESTED", "REJECTED")));
    private static final Set<String> DOCUMENT_SORT_FIELDS = Collections.unmodifiableSet(new HashSet<>(Arrays.asList(
            "electronicApprovalId", "documentNo", "eabusNo", "title", "documentType", "documentStatus", "submittedAt",
            "drafterName", "drafterDepartmentName", "myParticipantType", "myActionStatus",
            "currentApprovalStep", "participantName", "approvalProgress", "updatedAt")));
    private static final Set<String> APPROVAL_LINE_ACTION_STATUSES = Collections.unmodifiableSet(
            new HashSet<>(Arrays.asList("WAITING", "PENDING", "APPROVED", "REJECTED", "RETURNED", "CONFIRMED")));

    private final DocumentApprovalDAO documentApprovalDAO;
    private final DocumentApprovalAccessService documentApprovalAccessService;

    public DocumentApprovalStatusServiceImpl(DocumentApprovalDAO documentApprovalDAO,
            DocumentApprovalAccessService documentApprovalAccessService) {
        this.documentApprovalDAO = documentApprovalDAO;
        this.documentApprovalAccessService = documentApprovalAccessService;
    }

    @Override
    @Transactional(readOnly = true)
    public DocumentApprovalListPageVO searchDocuments(LoginVO user, String scope,
            DocumentApprovalListQueryVO query) throws Exception {
        documentApprovalAccessService.validateAuthenticatedUser(user);
        if (scope == null) {
            scope = "ALL";
        }
        if (!DOCUMENT_SCOPES.contains(scope) || query == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "문서 조회 조건이 올바르지 않습니다.");
        }

        String documentType = normalizeText(query.getDocumentType());
        String documentStatus = normalizeText(query.getDocumentStatus());
        String myParticipantType = normalizeText(query.getMyParticipantType());
        String myActionStatus = normalizeText(query.getMyActionStatus());
        Long electronicApprovalId = query.getElectronicApprovalId();
        if ((documentType != null && !DOCUMENT_TYPES.contains(documentType))
                || (documentStatus != null && !DOCUMENT_STATUSES.contains(documentStatus))
                || (myParticipantType != null && !PARTICIPANT_TYPES.contains(myParticipantType))
                || (myActionStatus != null && !APPROVAL_LINE_ACTION_STATUSES.contains(myActionStatus))
                || (electronicApprovalId != null && electronicApprovalId <= 0)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "문서 조회 조건이 올바르지 않습니다.");
        }

        boolean paged = query.getOffset() != null || query.getLimit() != null;
        Integer offset = paged ? (query.getOffset() == null ? 0 : query.getOffset()) : null;
        Integer limit = paged ? (query.getLimit() == null ? 200 : query.getLimit()) : null;
        if (paged && (offset < 0 || limit < 1 || limit > 200)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "문서 조회 범위가 올바르지 않습니다.");
        }

        String sortField = normalizeText(query.getSortField());
        if (sortField == null) {
            sortField = "updatedAt";
        } else if (!DOCUMENT_SORT_FIELDS.contains(sortField)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "문서 정렬 조건이 올바르지 않습니다.");
        }
        String sortDirection = normalizeText(query.getSortDirection());
        if (sortDirection == null) {
            sortDirection = "DESC";
        } else {
            sortDirection = sortDirection.toUpperCase(Locale.ROOT);
            if (!"ASC".equals(sortDirection) && !"DESC".equals(sortDirection)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "문서 정렬 조건이 올바르지 않습니다.");
            }
        }

        LocalDate submittedAtFrom = parseOptionalDate(query.getSubmittedAtFrom());
        LocalDate submittedAtTo = parseOptionalDate(query.getSubmittedAtTo());
        LocalDate updatedAtFrom = parseOptionalDate(query.getUpdatedAtFrom());
        LocalDate updatedAtTo = parseOptionalDate(query.getUpdatedAtTo());
        validateDateRange(submittedAtFrom, submittedAtTo);
        validateDateRange(updatedAtFrom, updatedAtTo);

        Map<String, Object> params = documentApprovalAccessService.actorParams(user);
        params.put("scope", scope);
        params.put("documentType", documentType);
        params.put("documentStatus", documentStatus);
        params.put("electronicApprovalIdFilter", electronicApprovalId);
        params.put("documentNoFilter", normalizeText(query.getDocumentNo()));
        params.put("keyword", normalizeText(query.getKeyword()));
        params.put("eabusNoFilter", normalizeText(query.getEabusNo()));
        params.put("titleFilter", normalizeText(query.getTitle()));
        params.put("drafterNameFilter", normalizeText(query.getDrafterName()));
        params.put("drafterDepartmentName", normalizeText(query.getDrafterDepartmentName()));
        params.put("participantName", normalizeText(query.getParticipantName()));
        params.put("myParticipantType", myParticipantType);
        params.put("myActionStatus", myActionStatus);
        params.put("currentApproverName", normalizeText(query.getCurrentApproverName()));
        params.put("submittedAtFrom", submittedAtFrom == null ? null : submittedAtFrom.toString());
        params.put("submittedAtTo", submittedAtTo == null ? null : submittedAtTo.toString());
        params.put("updatedAtFrom", updatedAtFrom == null ? null : updatedAtFrom.toString());
        params.put("updatedAtTo", updatedAtTo == null ? null : updatedAtTo.toString());
        if (paged) {
            params.put("offset", offset);
            params.put("limit", limit);
        }
        params.put("sortField", sortField);
        params.put("sortDirection", sortDirection);

        List<DocumentApprovalStatusListItemVO> resultList = documentApprovalDAO.selectRelatedDocumentPage(params);
        Long totalRowCount = documentApprovalDAO.countRelatedDocuments(params);
        if (resultList == null || totalRowCount == null) {
            throw new IllegalStateException("전자결재 문서 검색 결과를 확인할 수 없습니다.");
        }

        DocumentApprovalListPageVO page = new DocumentApprovalListPageVO();
        page.setResultList(resultList);
        page.setTotalRowCount(totalRowCount);
        return page;
    }

    private String normalizeText(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private LocalDate parseOptionalDate(String value) {
        String normalizedValue = normalizeText(value);
        if (normalizedValue == null) {
            return null;
        }
        try {
            return LocalDate.parse(normalizedValue);
        } catch (DateTimeParseException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "문서 날짜 조건이 올바르지 않습니다.");
        }
    }

    private void validateDateRange(LocalDate from, LocalDate to) {
        if (from != null && to != null && from.isAfter(to)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "문서 날짜 범위가 올바르지 않습니다.");
        }
    }
}
