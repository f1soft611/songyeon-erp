package egovframework.let.groupware.community.notice.domain.model;

import egovframework.com.cmm.ComDefaultVO;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class NoticeBoardPostSearchVO extends ComDefaultVO {

    private static final long serialVersionUID = 1L;

    private Long tenantId;
    private String keyword;
    private String noticeGubunCode;
    private String isPinned;
}