package egovframework.let.qm.haccp.prerequisite.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 품질관리 - HACCP(선행) 임시저장 결과 VO (서버가 센 점수)
 * @author SONGYEON ERP
 * @since 2026.11.09
 * @version 1.0
 */
@Schema(description = "임시저장 결과 VO (서버가 센 점수)")
@Getter
@Setter
public class SurveySaveResultVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private int id;
    private String status;
    private int score;
    private int scoreMax;
    private int answered;
    private int bad;
}
