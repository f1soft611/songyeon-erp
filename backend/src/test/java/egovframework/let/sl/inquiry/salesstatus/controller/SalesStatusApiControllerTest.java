package egovframework.let.sl.inquiry.salesstatus.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Collections;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.sl.inquiry.salesstatus.service.SalesStatusService;
import egovframework.let.system.menus.domain.model.MenuPermissionVO;
import egovframework.let.system.menus.domain.model.MenuTreeNodeVO;
import egovframework.let.system.menus.domain.model.MyMenuResponseVO;
import egovframework.let.system.menus.service.SystemMenuService;

class SalesStatusApiControllerTest {

	private final ResultVoHelper resultVoHelper = mock(ResultVoHelper.class);
	private final SalesStatusService salesStatusService = mock(SalesStatusService.class);
	private final SystemMenuService systemMenuService = mock(SystemMenuService.class);
	private final SalesStatusApiController controller = new SalesStatusApiController(resultVoHelper, salesStatusService, systemMenuService);

	private static LoginVO user() {
		LoginVO user = new LoginVO();
		user.setId("0001");
		user.setTenantId(1L);
		user.setRoleId(2L);
		user.setRoleCode("DEFAULT_USER");
		return user;
	}

	// 판매관리 > 판매조회 > 판매현황 줄 하나짜리 내 메뉴
	private void myMenu(String path, boolean delete) throws Exception {
		MenuPermissionVO permissions = new MenuPermissionVO();
		permissions.setDelete(delete);
		MenuTreeNodeVO screen = new MenuTreeNodeVO();
		screen.setPath(path);
		screen.setPermissions(permissions);
		MenuTreeNodeVO group = new MenuTreeNodeVO();
		group.setPath("/sl/inquiry");
		group.setChildren(Collections.singletonList(screen));
		MyMenuResponseVO tree = new MyMenuResponseVO();
		tree.setMenus(Collections.singletonList(group));
		when(systemMenuService.getMyMenuTree(1L, "0001", 2L, "DEFAULT_USER")).thenReturn(tree);
	}

	@DisplayName("판매현황 삭제 권한이 있으면 지운다")
	@Test
	void deletesWithPermission() throws Exception {
		myMenu("/sl/inquiry/INSalesStatusView", true);

		controller.delete(7L, user());

		verify(salesStatusService).delete(7L);
	}

	@DisplayName("삭제 권한이 없으면 403 으로 막고 지우지 않는다")
	@Test
	void forbidsWithoutPermission() throws Exception {
		myMenu("/sl/inquiry/INSalesStatusView", false);

		ResponseStatusException denied = assertThrows(ResponseStatusException.class, () -> controller.delete(7L, user()));

		assertEquals(HttpStatus.FORBIDDEN, denied.getStatus());
		verify(salesStatusService, never()).delete(anyLong());
	}

	@DisplayName("다른 화면의 삭제 권한으로는 지우지 못한다")
	@Test
	void forbidsWithOtherMenuPermission() throws Exception {
		myMenu("/sl/entry/ENSalesRegisterView", true);

		assertThrows(ResponseStatusException.class, () -> controller.delete(7L, user()));

		verify(salesStatusService, never()).delete(anyLong());
	}

	@DisplayName("로그인 정보가 없으면 401")
	@Test
	void rejectsAnonymous() throws Exception {
		ResponseStatusException denied = assertThrows(ResponseStatusException.class, () -> controller.delete(7L, null));

		assertEquals(HttpStatus.UNAUTHORIZED, denied.getStatus());
		verify(salesStatusService, never()).delete(anyLong());
	}
}
