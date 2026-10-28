package egovframework.let.groupware.approval.domain.model;

import java.util.List;

public class DocumentApprovalListPageVO {

    private List<DocumentApprovalStatusListItemVO> resultList;
    private long totalRowCount;

    public List<DocumentApprovalStatusListItemVO> getResultList() { return resultList; }
    public void setResultList(List<DocumentApprovalStatusListItemVO> resultList) {
        this.resultList = resultList;
    }
    public long getTotalRowCount() { return totalRowCount; }
    public void setTotalRowCount(long totalRowCount) { this.totalRowCount = totalRowCount; }
}
