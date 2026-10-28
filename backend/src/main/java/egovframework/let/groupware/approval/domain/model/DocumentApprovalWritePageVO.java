package egovframework.let.groupware.approval.domain.model;

import java.util.List;

public class DocumentApprovalWritePageVO<T> {

    private List<T> resultList;
    private long totalRowCount;

    public List<T> getResultList() { return resultList; }
    public void setResultList(List<T> resultList) { this.resultList = resultList; }
    public long getTotalRowCount() { return totalRowCount; }
    public void setTotalRowCount(long totalRowCount) { this.totalRowCount = totalRowCount; }
}
