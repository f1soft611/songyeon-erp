package egovframework.let.qm.haccp.prerequisite.domain.model;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 품질관리 - HACCP(선행) 양식 한 벌 VO (송연 get_form). used = 지금 판으로 쓴 점검표 수(있으면 다음 고침이 새 판을 뜬다)
 * @author SONGYEON ERP
 * @since 2026.11.09
 * @version 1.0
 */
@Schema(description = "양식 한 벌 VO (송연 get_form). used = 지금 판으로 쓴 점검표 수(있으면 다음 고침이 새 판을 뜬다)")
@Getter
@Setter
public class SurveyFormDetailVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private Integer id;
    private String name;
    private String category;
    private String bindType;
    private boolean active;
    private String cycle;
    private List<String> cycles = new ArrayList<>();
    private Integer versionId;
    private String versionLabel;
    private List<SurveyChoiceVO> choices = new ArrayList<>();
    private boolean hasNote;
    private boolean hasDefect;
    private boolean scoring;
    private int fullMark;
    private List<SurveyItemVO> items = new ArrayList<>();
    private int used;
}
