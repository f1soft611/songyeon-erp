package egovframework.let.search.domain.model;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class SearchItemVO {
    private final Long id;
    private final String type;
    private final String title;
    private final String description;
    private final String path;
}
