package egovframework.let.groupware.approval.domain.model;

public class ApprovalLineTemplateLineVO {

    private Integer stageOrder;
    private Integer participantOrder;
    private String participantType;
    private String participantUserId;

    public Integer getStageOrder() { return stageOrder; }
    public void setStageOrder(Integer stageOrder) { this.stageOrder = stageOrder; }
    public Integer getParticipantOrder() { return participantOrder; }
    public void setParticipantOrder(Integer participantOrder) { this.participantOrder = participantOrder; }
    public String getParticipantType() { return participantType; }
    public void setParticipantType(String participantType) { this.participantType = participantType; }
    public String getParticipantUserId() { return participantUserId; }
    public void setParticipantUserId(String participantUserId) { this.participantUserId = participantUserId; }
}
