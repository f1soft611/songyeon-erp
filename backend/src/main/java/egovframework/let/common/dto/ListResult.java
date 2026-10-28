package egovframework.let.common.dto;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ListResult<T> {

    private final List<T> resultList;
    private final long resultCnt;
}