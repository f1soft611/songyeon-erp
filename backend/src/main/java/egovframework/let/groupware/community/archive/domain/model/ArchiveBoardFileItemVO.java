package egovframework.let.groupware.community.archive.domain.model;

import java.io.Serializable;
import java.util.Date;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ArchiveBoardFileItemVO implements Serializable {
    private static final long serialVersionUID = 1L;

    private Long boardFileId;
    private Long postId;
    private String fileName;
    private Long fileSize;
    private String mimeType;
    private Date uploadedAt;
    private String writerName;
    private String categoryCode;
}
