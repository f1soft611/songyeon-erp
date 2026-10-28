package egovframework.let.ha.acctx.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 인사·회계 - 입금 · 출금 저장 요청 VO 클래스 ({kind, txDate, clientName, amount, method, subjectId, bankAccountId, cardId, note})
 * @author SONGYEON ERP
 * @since 2026.10.14
 * @version 1.0
 */
@Schema(description = "인사·회계 - 입금 · 출금 저장 요청 VO 클래스")
@Getter
@Setter
public class AccTransactionSaveVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String kind;
    private String txDate;
    private String clientName;
    private Object amount;
    private String method;
    private Object subjectId;
    private Object bankAccountId;
    private Object cardId;
    private String note;
}
