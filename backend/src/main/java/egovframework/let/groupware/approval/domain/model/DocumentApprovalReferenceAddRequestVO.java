package egovframework.let.groupware.approval.domain.model;

import java.util.List;

public class DocumentApprovalReferenceAddRequestVO {

    private List<String> participantUserIds;

    public List<String> getParticipantUserIds() { return participantUserIds; }
    public void setParticipantUserIds(List<String> participantUserIds) {
        this.participantUserIds = participantUserIds;
    }
}
