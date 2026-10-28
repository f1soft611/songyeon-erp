package egovframework.let.groupware.community.archive.domain.model;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ArchiveBoardFileUpdateRequestVO {
    private Long postId;
    private String fileName;
    private String folderCode;
}
