package egovframework.let.search.domain.model;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class SearchGroupVO {
    private final String type;
    private final List<SearchItemVO> items;
    private final long totalCount;
    private final int offset;
    private final int limit;
}
