package egovframework.let.ha.accbasic.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 인사·회계 - 계좌 VO 클래스 (송연 acc_bank_account. 저장 요청도 같은 모양)
 * @author SONGYEON ERP
 * @since 2026.10.14
 * @version 1.0
 */
@Schema(description = "인사·회계 - 계좌 VO 클래스")
@Getter
@Setter
public class AccBankAccountVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long id;
    private String bankName;
    private String accountNo;
    private String holder;
    private String purpose;
    private String note;
    private Object active;
    private Integer sortOrder;
}
