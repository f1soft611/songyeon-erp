package egovframework.let.groupware.community.archive.domain.model;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ArchiveBoardPostVO implements Serializable {
    private static final long serialVersionUID = 1L;
    private Long postId;
    private String boardTypeCode;
    private String title;
    private String contents;
    private String contentsText;
    private String categoryCode;
    private String writerId;
    private String writerName;
    private Date createdAt;
    private Date updatedAt;
    private Long attachmentCount;
    private List<ArchiveBoardFileVO> attachments = new ArrayList<>();
}
