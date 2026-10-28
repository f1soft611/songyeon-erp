package egovframework.let.groupware.community.archive.domain.model;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ArchiveBoardFileSearchVO {
    private Long tenantId;
    private String keyword;
    private String folderCode;
    private String uploadedFrom;
    private String uploadedTo;
    private String fileType;
}
