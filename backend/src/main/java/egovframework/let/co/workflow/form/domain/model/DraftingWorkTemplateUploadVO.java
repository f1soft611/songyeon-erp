package egovframework.let.co.workflow.form.domain.model;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DraftingWorkTemplateUploadVO {

    private String uploadToken;
    private String fileName;
    private Long fileSize;
    private String mimeType;
    private String previewUrl;
}