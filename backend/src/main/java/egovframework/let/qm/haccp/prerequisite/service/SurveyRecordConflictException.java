package egovframework.let.qm.haccp.prerequisite.service;

/**
 * 그 기간에 이미 쓴 장 때문에 저장할 수 없을 때(송연 save_record 의 existing_id · in_review).
 * 화면이 그 장으로 데려다 줄 수 있게 번호와 날짜를 함께 준다 — '한 기간에 한 장입니다' 만 띄우면 그 한 장을 찾아 헤매게 된다
 * @author SONGYEON ERP
 * @since 2026.11.09
 * @version 1.0
 */
public class SurveyRecordConflictException extends IllegalArgumentException {

    private static final long serialVersionUID = 1L;

    private final Integer existingId;
    private final String existingDate;
    private final boolean inReview;

    public SurveyRecordConflictException(String message, Integer existingId, String existingDate, boolean inReview) {
        super(message);
        this.existingId = existingId;
        this.existingDate = existingDate;
        this.inReview = inReview;
    }

    public Integer getExistingId() {
        return existingId;
    }

    public String getExistingDate() {
        return existingDate;
    }

    public boolean isInReview() {
        return inReview;
    }
}
