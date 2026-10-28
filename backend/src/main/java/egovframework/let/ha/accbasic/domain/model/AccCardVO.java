package egovframework.let.ha.accbasic.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 인사·회계 - 카드 VO 클래스 (송연 acc_card + 결제계좌 이름. 카드번호는 뒤 4자리만)
 * @author SONGYEON ERP
 * @since 2026.10.14
 * @version 1.0
 */
@Schema(description = "인사·회계 - 카드 VO 클래스")
@Getter
@Setter
public class AccCardVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long id;
    private String issuer;
    private String last4;
    private String nickname;
    private String holder;
    private Object bankAccountId;
    private String note;
    private Object active;
    private Integer sortOrder;
    private String payBank;
    private String payAccountNo;
}
