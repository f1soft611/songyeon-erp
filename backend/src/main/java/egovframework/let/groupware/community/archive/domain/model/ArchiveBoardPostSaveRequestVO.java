package egovframework.let.groupware.community.archive.domain.model;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ArchiveBoardPostSaveRequestVO {
    private String title;
    private String contents;
    private String categoryCode;
}
