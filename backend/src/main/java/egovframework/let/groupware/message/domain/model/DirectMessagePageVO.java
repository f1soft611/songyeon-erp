package egovframework.let.groupware.message.domain.model;

import java.time.LocalDateTime;
import java.util.List;
import lombok.Getter;

@Getter
public class DirectMessagePageVO {
    private final List<DirectMessageVO> resultList;
    private final boolean hasNext;
    private final LocalDateTime nextBeforeUpdatedAt;
    private final Long nextBeforeThreadId;

    public DirectMessagePageVO(List<DirectMessageVO> resultList, boolean hasNext,
            LocalDateTime nextBeforeUpdatedAt, Long nextBeforeThreadId) {
        this.resultList = resultList;
        this.hasNext = hasNext;
        this.nextBeforeUpdatedAt = nextBeforeUpdatedAt;
        this.nextBeforeThreadId = nextBeforeThreadId;
    }
}
