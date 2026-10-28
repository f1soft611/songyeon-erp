package egovframework.let.pu.substitution.domain.model;

import java.io.Serializable;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 구매관리 - 재료 치환등록 상세(생산건 머리 + 원재료 줄) VO 클래스. 바꾸기 · 되돌리기도 이 모양으로 돌려준다.
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@Schema(description = "재료 치환등록 상세")
@Getter
@Setter
public class SubstitutionDetailVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private SubstitutionScheduleVO header;
    private List<SubstitutionLineVO> rows;
}
