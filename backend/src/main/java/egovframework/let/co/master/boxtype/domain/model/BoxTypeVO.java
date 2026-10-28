package egovframework.let.co.master.boxtype.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 기준정보 - 포장유형 VO 클래스 (tb_box_type)
 * 비율(고정마진율 · 로스율)은 % 그대로(0~100) 저장한다. 적용기간(apply_start_dt · apply_end_dt)은 관리하지 않는다(처음 넣을 때 기본값).
 * @author SONGYEON ERP
 * @since 2026.10.02
 * @version 2.0 (2026.10.19 tb_box_type 으로 변경)
 */
@Schema(description = "포장유형 모델")
@Getter
@Setter
public class BoxTypeVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "일련번호(PK). 없으면 새로 등록")
    private Long boxTypeId;

    @Schema(description = "포장유형코드 (사업장 · 사업부 안에서 사용 중인 것끼리 겹치지 않는다)")
    private String boxTypeCd;

    @Schema(description = "포장유형명")
    private String boxTypeNm;

    @Schema(description = "고정마진율(%) 0~100")
    private Double fixedMarginRate;

    @Schema(description = "로스율(%) 0~100")
    private Double lossRate;

    @Schema(description = "인건비(원)")
    private Double laborCost;

    @Schema(description = "포장비(원)")
    private Double packingCost;

    @Schema(description = "물류비(원)")
    private Double logisticsCost;

    @Schema(description = "마진(원)")
    private Double marginAmt;

    @Schema(description = "부대비용 합계(원) = 인건비 + 포장비 + 물류비 (DB 자동계산, 읽기 전용)")
    private Double totalCost;

    @Schema(description = "정렬순서")
    private Integer sortSeq;

    @Schema(description = "등록자 사번 (읽기 전용)")
    private String regUserId;

    @Schema(description = "등록자 이름 (사원 표에서, 없으면 저장된 값)")
    private String regUserNm;

    @Schema(description = "등록일시 'YYYY-MM-DD HH24:MI:SS' (읽기 전용)")
    private String regDt;

    @Schema(description = "수정자 사번 (읽기 전용)")
    private String updUserId;

    @Schema(description = "수정자 이름 (사원 표에서, 없으면 저장된 값)")
    private String updUserNm;

    @Schema(description = "수정일시 'YYYY-MM-DD HH24:MI:SS' (읽기 전용, 트리거가 채움)")
    private String updDt;

    @Schema(description = "사용여부 (Y/N, 삭제하면 N)")
    private String useYn;
}
