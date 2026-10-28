package egovframework.let.groupware.approval.domain.model;

import java.util.List;

public class DocumentApprovalFilePageVO {
    private List<DocumentApprovalFileItemVO> resultList;
    private boolean hasNext;
    private Long nextBeforeFileId;

    public List<DocumentApprovalFileItemVO> getResultList() { return resultList; }
    public void setResultList(List<DocumentApprovalFileItemVO> resultList) { this.resultList = resultList; }
    public boolean isHasNext() { return hasNext; }
    public void setHasNext(boolean hasNext) { this.hasNext = hasNext; }
    public Long getNextBeforeFileId() { return nextBeforeFileId; }
    public void setNextBeforeFileId(Long nextBeforeFileId) { this.nextBeforeFileId = nextBeforeFileId; }
}
