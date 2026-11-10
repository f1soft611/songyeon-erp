package egovframework.let.groupware.message.domain.model;

import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
// 송연: 사람 ID 는 사번 문자열이다(20261103_003)
public class DirectMessageVO {
    private Long threadId;
    private Long messageId;
    private String senderUserId;
    private String senderUserName;
    private String recipientUserId;
    private String recipientUserName;
    private String otherUserId;
    private String otherUserName;
    private String otherUserProfileImage;
    private String subject;
    private String content;
    private LocalDateTime createdAt;
    private LocalDateTime readAt;
    private LocalDateTime updatedAt;
    private LocalDateTime hiddenAt;
    private Long unreadCount;
    private String latestContent;
    private LocalDateTime latestMessageAt;
}
