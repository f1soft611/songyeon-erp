package egovframework.let.search.domain.model;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class SearchResponseVO {
    private final List<SearchGroupVO> groups;
}
