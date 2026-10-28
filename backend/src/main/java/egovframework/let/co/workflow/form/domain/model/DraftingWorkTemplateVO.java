package egovframework.let.co.workflow.form.domain.model;

import com.fasterxml.jackson.databind.JsonNode;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Schema(description = "기안양식 본문 템플릿")
public class DraftingWorkTemplateVO {

    private Long draftingWorkCategoryId;
    private String cataTypeCode;
    private String codeName;
    private Boolean hasDocument;
    private JsonNode templateJson;
    private String templateHtml;
}