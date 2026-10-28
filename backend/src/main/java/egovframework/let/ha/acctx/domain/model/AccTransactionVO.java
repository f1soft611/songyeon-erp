package egovframework.let.ha.acctx.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 인사·회계 - 입금 · 출금 한 줄 VO 클래스 (송연 acc_transaction + 계정과목 · 계좌 · 카드 이름. 금액은 늘 양수, 방향은 kind)
 * @author SONGYEON ERP
 * @since 2026.10.14
 * @version 1.0
 */
@Schema(description = "인사·회계 - 입금 · 출금 한 줄 VO 클래스")
@Getter
@Setter
public class AccTransactionVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long id;
    private String kind;
    private String txDate;
    private String clientName;
    private Long subjectId;
    private Double amount;
    private String method;
    private Long bankAccountId;
    private Long cardId;
    private String note;
    private String createdBy;
    private String subjectCode;
    private String subjectName;
    private String subjectCategory;
    private String bankName;
    private String accountNo;
    private String cardIssuer;
    private String cardLast4;
}
