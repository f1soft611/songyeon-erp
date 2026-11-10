package egovframework.let.search.controller;

import java.util.Collections;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.search.service.UnifiedSearchService;

@RestController
@RequestMapping("/api/v1/search")
public class UnifiedSearchApiController {
    private final ResultVoHelper resultVoHelper;
    private final UnifiedSearchService service;

    public UnifiedSearchApiController(ResultVoHelper resultVoHelper, UnifiedSearchService service) {
        this.resultVoHelper = resultVoHelper;
        this.service = service;
    }

    @GetMapping
    public ResultVO search(@AuthenticationPrincipal LoginVO user, @RequestParam String keyword,
            @RequestParam(defaultValue = "ALL") String type,
            @RequestParam(defaultValue = "0") int offset,
            @RequestParam(defaultValue = "5") int limit) throws Exception {
        return resultVoHelper.buildFromMap(
                Collections.singletonMap("item", service.search(user, keyword, type, offset, limit)),
                ResponseCode.SUCCESS);
    }
}
