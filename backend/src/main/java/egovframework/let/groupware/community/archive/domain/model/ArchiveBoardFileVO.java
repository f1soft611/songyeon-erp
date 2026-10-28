package egovframework.let.groupware.community.archive.domain.model;

import java.io.Serializable;
import java.util.Date;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ArchiveBoardFileVO implements Serializable {
    private static final long serialVersionUID = 1L;
    private Long boardFileId;
    private Long postId;
    private String fileName;
    private Long fileSize;
    private String mimeType;
    private String contentType;
    private String fileUsageType;
    private Date createdAt;
    private Date updatedAt;
    @JsonIgnore
    private Long tenantId;
    @JsonIgnore
    private String ownerType;
    @JsonIgnore
    private String deletedYn;
}
