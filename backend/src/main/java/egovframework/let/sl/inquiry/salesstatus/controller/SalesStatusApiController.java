package egovframework.let.sl.inquiry.salesstatus.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.sl.inquiry.salesstatus.service.SalesStatusService;
import egovframework.let.system.menus.domain.model.MenuPermissionVO;
import egovframework.let.system.menus.domain.model.MenuTreeNodeVO;
import egovframework.let.system.menus.domain.model.MyMenuResponseVO;
import egovframework.let.system.menus.service.SystemMenuService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 판매관리 > 판매현황 컨트롤러 클래스 (송연 GET /api/sales · DELETE /api/sales/{id} 를 S_ERP 규칙으로 옮김)
 * @author SONGYEON ERP
 * @since 2026.10.07
 * @version 1.0
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/sl/inquiry/sales-status")
@Tag(name = "SalesStatusApiController", description = "판매관리 - 판매현황")
public class SalesStatusApiController {

    private static final String TAG = "SalesStatusApiController";
    private static final String MENU_CODE = "INSalesStatusView"; // 판매현황 화면ID

    private final ResultVoHelper resultVoHelper;
    private final SalesStatusService salesStatusService;
    private final SystemMenuService systemMenuService;

    @Operation(summary = "적어둔 판매(기간·거래처·품목명)와 합계", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping
    public ResultVO listStatus(@RequestParam(name = "start", required = false) String start,
            @RequestParam(name = "end", required = false) String end,
            @RequestParam(name = "clientName", required = false) String clientName,
            @RequestParam(name = "productName", required = false) String productName) throws Exception {
        try {
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("item", salesStatusService.listStatus(start, end, clientName, productName));
            return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
        } catch (IllegalArgumentException ex) {
            return resultVoHelper.buildFromMap(new HashMap<String, Object>(), ResponseCode.INPUT_CHECK_ERROR, ex.getMessage());
        }
    }

    @Operation(summary = "판매 한 줄 지우기", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @DeleteMapping("/{id}")
    public ResultVO delete(@PathVariable("id") long id,
            @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        requireDeletePermission(user);
        salesStatusService.delete(id);
        return resultVoHelper.buildFromMap(new HashMap<String, Object>(), ResponseCode.SUCCESS);
    }

    // 2026-11-02 화면이 단추를 숨겨도 주소를 직접 부르면 지워지므로 서버에서도 판매현황 삭제 권한을 본다(S_ERP ClassificationApiController 와 같은 방식)
    private void requireDeletePermission(LoginVO user) throws Exception {
        if (user == null || user.getTenantId() == null || user.getTenantId() <= 0) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 테넌트 정보를 확인할 수 없습니다.");
        }
        MyMenuResponseVO tree = systemMenuService.getMyMenuTree(
                user.getTenantId(), user.getId(), user.getRoleId(), user.getRoleCode());
        if (tree == null || !canDelete(tree.getMenus())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, ResponseCode.AUTH_ERROR.getMessage());
        }
    }

    private boolean canDelete(List<MenuTreeNodeVO> nodes) {
        if (nodes == null) {
            return false;
        }
        for (MenuTreeNodeVO node : nodes) {
            String path = node.getPath();
            MenuPermissionVO permissions = node.getPermissions();
            if (path != null && path.endsWith("/" + MENU_CODE) && permissions != null && permissions.isDelete()) {
                return true;
            }
            if (canDelete(node.getChildren())) {
                return true;
            }
        }
        return false;
    }
}
