package egovframework.let.groupware.message.domain.model;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DirectMessageCreateRequestVO {
    // 송연: 받는 사람 사번
    private String recipientUserId;
    private String subject;
    private String content;
}
