package egovframework.let.search.service;

import egovframework.com.cmm.LoginVO;
import egovframework.let.search.domain.model.SearchResponseVO;

public interface UnifiedSearchService {
    SearchResponseVO search(LoginVO user, String keyword, String type, int offset, int limit) throws Exception;
}
