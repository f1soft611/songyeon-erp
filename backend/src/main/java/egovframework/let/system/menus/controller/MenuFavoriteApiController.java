package egovframework.let.system.menus.controller;

import java.util.Collections;

import javax.validation.Valid;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.system.menus.domain.model.MenuFavoriteCreateRequestVO;
import egovframework.let.system.menus.domain.model.MenuFavoriteFolderRequestVO;
import egovframework.let.system.menus.domain.model.MenuFavoriteLocationRequestVO;
import egovframework.let.system.menus.domain.model.MenuFavoritesResponseVO;
import egovframework.let.system.menus.service.MenuFavoriteService;

@RestController
@RequestMapping("/api/v1/menus/favorites")
public class MenuFavoriteApiController {
    private final ResultVoHelper resultVoHelper;
    private final MenuFavoriteService menuFavoriteService;

    public MenuFavoriteApiController(ResultVoHelper resultVoHelper, MenuFavoriteService menuFavoriteService) {
        this.resultVoHelper = resultVoHelper;
        this.menuFavoriteService = menuFavoriteService;
    }

    @GetMapping
    public ResultVO list(@AuthenticationPrincipal LoginVO user) throws Exception {
        return resultVoHelper.buildFromMap(
                Collections.singletonMap("item", menuFavoriteService.list(user)), ResponseCode.SUCCESS);
    }

    @PostMapping("/folders")
    public ResultVO createFolder(
            @Valid @RequestBody MenuFavoriteFolderRequestVO request,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        return response(menuFavoriteService.createFolder(user, request));
    }

    @PutMapping("/folders/{folderId}")
    public ResultVO renameFolder(
            @PathVariable Long folderId,
            @Valid @RequestBody MenuFavoriteFolderRequestVO request,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        return response(menuFavoriteService.renameFolder(user, folderId, request));
    }

    @DeleteMapping("/folders/{folderId}")
    public ResultVO deleteFolder(@PathVariable Long folderId, @AuthenticationPrincipal LoginVO user)
            throws Exception {
        return response(menuFavoriteService.deleteFolder(user, folderId));
    }

    @PostMapping
    public ResultVO createFavorite(
            @Valid @RequestBody MenuFavoriteCreateRequestVO request,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        return response(menuFavoriteService.createFavorite(user, request));
    }

    @PutMapping("/{favoriteId}/location")
    public ResultVO moveFavorite(
            @PathVariable Long favoriteId,
            @Valid @RequestBody MenuFavoriteLocationRequestVO request,
            @AuthenticationPrincipal LoginVO user) throws Exception {
        return response(menuFavoriteService.moveFavorite(user, favoriteId, request));
    }

    @DeleteMapping("/{favoriteId}")
    public ResultVO deleteFavorite(@PathVariable Long favoriteId, @AuthenticationPrincipal LoginVO user)
            throws Exception {
        return response(menuFavoriteService.deleteFavorite(user, favoriteId));
    }

    private ResultVO response(MenuFavoritesResponseVO result) {
        return resultVoHelper.buildFromMap(Collections.singletonMap("item", result), ResponseCode.SUCCESS);
    }
}
