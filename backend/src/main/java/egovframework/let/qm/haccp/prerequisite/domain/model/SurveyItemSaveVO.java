package egovframework.let.qm.haccp.prerequisite.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 품질관리 - HACCP(선행) 줄 넣기 · 고치기 요청 VO (afterId = 그 줄 바로 밑에 넣는다)
 * @author SONGYEON ERP
 * @since 2026.11.09
 * @version 1.0
 */
@Schema(description = "줄 넣기 · 고치기 요청 VO (afterId = 그 줄 바로 밑에 넣는다)")
@Getter
@Setter
public class SurveyItemSaveVO implements Serializable {

    private static final long serialVersionUID = 1L;

    /** single(질문) / group(묶음) */
    private String rowKind;
    private String label;
    /** 관리항목 */
    private String topic;
    /** true 꼭 답해야 함 */
    private Boolean required;
    private Integer afterId;
    private Integer parentId;
}
