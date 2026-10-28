package egovframework.com.common.domain.model;

import egovframework.com.cmm.ComDefaultVO;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CommonCommentSearchVO extends ComDefaultVO {

    private static final long serialVersionUID = 1L;

    private Long tenantId;
    private String ownerType;
    private Long ownerId;
    private Long beforeCommentId;
}