package egovframework.let.uss.auth.service.impl;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import javax.annotation.Resource;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.let.uss.auth.service.RoleInfoVO;
import egovframework.let.uss.auth.service.EgovAuthManageService;
import egovframework.let.uss.auth.service.MenuInfoVO;
import egovframework.let.uss.auth.service.PermissionTypeVO;
import egovframework.let.uss.auth.service.RoleMenuPermissionVO;

/**
 * 권한 관리 서비스 구현 클래스
 * @author S-ERP
 * @since 2024.01.01
 * @version 1.0
 */
@Service("authManageService")
public class EgovAuthManageServiceImpl extends EgovAbstractServiceImpl implements EgovAuthManageService {

    @Resource(name = "authManageDAO")
    private AuthManageDAO authManageDAO;

    /**
     * 메뉴 목록을 조회한다.
     */
    @Override
    public List<MenuInfoVO> selectMenuList(MenuInfoVO menuInfoVO) throws Exception {
        return authManageDAO.selectMenuList(menuInfoVO);
    }

    @Override
    public List<MenuInfoVO> selectMenuPagedList(MenuInfoVO menuInfoVO) throws Exception {
        return authManageDAO.selectMenuPagedList(menuInfoVO);
    }

    @Override
    public int selectMenuPagedCount(MenuInfoVO menuInfoVO) throws Exception {
        return authManageDAO.selectMenuPagedCount(menuInfoVO);
    }

    /**
     * 메뉴 상세정보를 조회한다.
     */
    @Override
    public MenuInfoVO selectMenuDetail(MenuInfoVO menuInfoVO) throws Exception {
        return authManageDAO.selectMenuDetail(menuInfoVO);
    }

    /**
     * 메뉴를 등록한다.
     */
    @Override
    public int insertMenu(MenuInfoVO menuInfoVO) throws Exception {
        String menuId = generateMenuId();
        menuInfoVO.setMenuCode(menuId);
        return authManageDAO.insertMenu(menuInfoVO);
    }

    /**
     * 메뉴를 수정한다.
     */
    @Override
    public int updateMenu(MenuInfoVO menuInfoVO) throws Exception {
        return authManageDAO.updateMenu(menuInfoVO);
    }

    /**
     * 메뉴를 삭제한다.
     */
    @Override
    public int deleteMenu(MenuInfoVO menuInfoVO) throws Exception {
        deleteRoleMenuPermissionsByMenuId(menuInfoVO.getMenuCode());
        return authManageDAO.deleteMenu(menuInfoVO);
    }

    /**
     * 권한 유형 목록을 조회한다.
     */
    @Override
    public List<PermissionTypeVO> selectPermissionTypeList(PermissionTypeVO permissionTypeVO) throws Exception {
        return authManageDAO.selectPermissionTypeList(permissionTypeVO);
    }

    /**
     * 권한 유형을 등록한다.
     */
    @Override
    public int insertPermissionType(PermissionTypeVO permissionTypeVO) throws Exception {
        String permissionId = generatePermissionId();
        permissionTypeVO.setPermissionCode(permissionId);
        return authManageDAO.insertPermissionType(permissionTypeVO);
    }

    /**
     * 권한 목록을 조회한다.
     */
    @Override
    public List<RoleInfoVO> selectRoleList() throws Exception {
        return authManageDAO.selectRoleList();
    }

    @Override
    public List<RoleInfoVO> selectRolePagedList(RoleInfoVO roleInfoVO) throws Exception {
        return authManageDAO.selectRolePagedList(roleInfoVO);
    }

    @Override
    public int selectRolePagedCount(RoleInfoVO roleInfoVO) throws Exception {
        return authManageDAO.selectRolePagedCount(roleInfoVO);
    }

    /**
     * 권한을 등록한다.
     */
    @Override
    public int insertRole(RoleInfoVO roleInfoVO) throws Exception {
        return authManageDAO.insertRole(roleInfoVO);
    }

    /**
     * 권한 정보를 수정한다.
     */
    @Override
    public int updateRole(RoleInfoVO roleInfoVO) throws Exception {
        RoleInfoVO.validateUpdatePolicy(roleInfoVO);
        return authManageDAO.updateRole(roleInfoVO);
    }

    /**
     * 권한 사용여부를 수정한다.
     */
    @Override
    public int updateRoleUseAt(RoleInfoVO roleInfoVO) throws Exception {
        RoleInfoVO.validateUpdatePolicy(roleInfoVO);
        return authManageDAO.updateRoleUseAt(roleInfoVO);
    }

    /**
     * 역할별 메뉴 권한 목록을 조회한다.
     */
    @Override
    public List<RoleMenuPermissionVO> selectRoleMenuPermissionList(RoleMenuPermissionVO roleMenuPermissionVO) throws Exception {
        return authManageDAO.selectRoleMenuPermissionList(roleMenuPermissionVO);
    }

    /**
     * 역할별 메뉴 권한을 설정한다.
     */
    @Override
    public int insertRoleMenuPermission(RoleMenuPermissionVO roleMenuPermissionVO) throws Exception {
        // roleMenuPermissionId는 DB에서 BIGSERIAL로 자동 생성됨
        return authManageDAO.insertRoleMenuPermission(roleMenuPermissionVO);
    }

    /**
     * 역할별 메뉴 권한을 삭제한다.
     */
    @Override
    public int deleteRoleMenuPermission(RoleMenuPermissionVO roleMenuPermissionVO) throws Exception {
        return authManageDAO.deleteRoleMenuPermission(roleMenuPermissionVO);
    }

    /**
     * 역할 코드 기준으로 역할별 메뉴 권한을 일괄 삭제한다.
     */
    @Override
    public int deleteRoleMenuPermissionsByRoleCode(String roleCode) throws Exception {
        return authManageDAO.deleteRoleMenuPermissionsByRoleCode(roleCode);
    }

    /**
     * 메뉴 ID 기준으로 역할별 메뉴 권한을 일괄 삭제한다.
     */
    @Override
    public int deleteRoleMenuPermissionsByMenuId(String menuId) throws Exception {
        return authManageDAO.deleteRoleMenuPermissionsByMenuId(menuId);
    }

    /**
     * 사용자별 접근 가능한 메뉴 목록을 조회한다.
     */
    @Override
    public List<MenuInfoVO> selectUserAccessibleMenus(String roleCode) throws Exception {
        return authManageDAO.selectUserAccessibleMenus(roleCode);
    }

    /**
     * 특정 메뉴에 대한 사용자 권한을 확인한다.
     */
    @Override
    public String checkUserMenuPermission(String roleCode, Long tenantId, String menuUrl) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("roleCode", roleCode);
        params.put("tenantId", tenantId);
        params.put("menuUrl", menuUrl);
        
        String permission = authManageDAO.checkUserMenuPermission(params);
        return permission != null ? permission : "none";
    }

    /**
     * 메뉴 ID 생성
     */
    private String generateMenuId() {
        return "MENU_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase();
    }

    /**
     * 권한 ID 생성
     */
    private String generatePermissionId() {
        return "PERM_" + String.format("%03d", System.currentTimeMillis() % 1000);
    }

    /**
     * 역할 메뉴 ID 생성
     */
    private String generateRoleMenuId() {
        return "RMP" + String.format("%03d", System.currentTimeMillis() % 1000);
    }
}