package egovframework.let.groupware.message.domain.model;

import java.time.LocalDate;
import java.util.List;
import lombok.Getter;

@Getter
public class DirectMessageDayPageVO {
    private final List<DirectMessageVO> resultList;
    private final LocalDate messageDate;
    private final boolean hasPrevious;

    public DirectMessageDayPageVO(List<DirectMessageVO> resultList, LocalDate messageDate, boolean hasPrevious) {
        this.resultList = resultList;
        this.messageDate = messageDate;
        this.hasPrevious = hasPrevious;
    }
}
