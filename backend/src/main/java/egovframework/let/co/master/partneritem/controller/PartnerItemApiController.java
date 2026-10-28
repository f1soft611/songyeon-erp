package egovframework.let.co.master.partneritem.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.co.master.partneritem.service.PartnerItemService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 공통관리 > 기초정보 > 거래처별 제품조회(화면ID BSPartnerItemView) 컨트롤러 클래스
 * 사용 중인 제품 목록(거래처명 포함)을 준다. 거래처명으로 거르는 것은 화면이 한다(송연 renderClientBomList 와 같음).
 * 상세(배합비 · 부자재 · 변경로그)는 제품마스터 API 를 같이 쓴다.
 * @author SONGYEON ERP
 * @since 2026.10.20
 * @version 1.0
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/co/master/partner-item")
@Tag(name = "PartnerItemApiController", description = "기초정보 - 거래처별 제품조회")
public class PartnerItemApiController {

    private final ResultVoHelper resultVoHelper;
    private final PartnerItemService partnerItemService;

    @Operation(summary = "거래처별 제품조회 목록(사용 중인 제품)", security = { @SecurityRequirement(name = "Authorization") },
            tags = { "PartnerItemApiController" })
    @ApiResponses(value = { @ApiResponse(responseCode = "200", description = "조회 성공") })
    @GetMapping
    public ResultVO listPartnerItems() throws Exception {
        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("resultList", partnerItemService.listPartnerItems());
        return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
    }
}
