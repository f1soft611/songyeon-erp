package egovframework.let.system.menus.controller;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Collections;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import egovframework.com.cmm.LoginVO;
import egovframework.let.system.menus.domain.model.MenuFavoriteFolderRequestVO;
import egovframework.let.system.menus.domain.model.MenuFavoritesResponseVO;
import egovframework.let.system.menus.service.MenuFavoriteService;

class MenuFavoriteApiControllerTest {
    private MockMvc mvc;
    private MenuFavoriteService service;
    private LoginVO user;

    @BeforeEach
    void setUp() {
        service = org.mockito.Mockito.mock(MenuFavoriteService.class);
        mvc = MockMvcBuilders.standaloneSetup(
                new MenuFavoriteApiController(new egovframework.com.cmm.util.ResultVoHelper(), service)).build();
        user = new LoginVO();
        user.setTenantId(4L);
        user.setUniqId("9");
    }

    @Test
    void exposesFavoritesListAndFolderCreationRoutes() throws Exception {
        when(service.list(org.mockito.ArgumentMatchers.any()))
                .thenReturn(new MenuFavoritesResponseVO(Collections.emptyList(), Collections.emptyList()));
        when(service.createFolder(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any()))
                .thenReturn(new MenuFavoritesResponseVO(Collections.emptyList(), Collections.emptyList()));

        mvc.perform(get("/api/v1/menus/favorites").principal(() -> "user"))
                .andExpect(status().isOk());
        mvc.perform(post("/api/v1/menus/favorites/folders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"folderName\":\"업무\"}"))
                .andExpect(status().isOk());

        verify(service).createFolder(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
    }
}
