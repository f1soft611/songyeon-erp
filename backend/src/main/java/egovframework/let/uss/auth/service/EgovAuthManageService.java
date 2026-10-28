package egovframework.let.uss.auth.service;

import java.util.List;

/**
 * 권한 관리 서비스 인터페이스
 * @author S-ERP
 * @since 2024.01.01
 * @version 1.0
 */
public interface EgovAuthManageService {

    /**
     * 메뉴 목록을 조회한다.
     * @param menuInfoVO 검색조건
     * @return List<MenuInfoVO> 메뉴목록
     * @throws Exception
     */
    List<MenuInfoVO> selectMenuList(MenuInfoVO menuInfoVO) throws Exception;

    /**
     * 메뉴 페이징 목록을 조회한다.
     * @param menuInfoVO 검색조건
     * @return List<MenuInfoVO> 메뉴목록
     * @throws Exception
     */
    List<MenuInfoVO> selectMenuPagedList(MenuInfoVO menuInfoVO) throws Exception;

    /**
     * 메뉴 페이징 총 건수를 조회한다.
     * @param menuInfoVO 검색조건
     * @return int 총 건수
     * @throws Exception
     */
    int selectMenuPagedCount(MenuInfoVO menuInfoVO) throws Exception;

    /**
     * 메뉴 상세정보를 조회한다.
     * @param menuInfoVO 메뉴정보
     * @return MenuInfoVO 메뉴상세정보
     * @throws Exception
     */
    MenuInfoVO selectMenuDetail(MenuInfoVO menuInfoVO) throws Exception;

    /**
     * 메뉴를 등록한다.
     * @param menuInfoVO 메뉴정보
     * @return int 등록결과
     * @throws Exception
     */
    int insertMenu(MenuInfoVO menuInfoVO) throws Exception;

    /**
     * 메뉴를 수정한다.
     * @param menuInfoVO 메뉴정보
     * @return int 수정결과
     * @throws Exception
     */
    int updateMenu(MenuInfoVO menuInfoVO) throws Exception;

    /**
     * 메뉴를 삭제한다.
     * @param menuInfoVO 메뉴정보
     * @return int 삭제결과
     * @throws Exception
     */
    int deleteMenu(MenuInfoVO menuInfoVO) throws Exception;

    /**
     * 권한 유형 목록을 조회한다.
     * @param permissionTypeVO 검색조건
     * @return List<PermissionTypeVO> 권한유형목록
     * @throws Exception
     */
    List<PermissionTypeVO> selectPermissionTypeList(PermissionTypeVO permissionTypeVO) throws Exception;

    /**
     * 권한 유형을 등록한다.
     * @param permissionTypeVO 권한유형정보
     * @return int 등록결과
     * @throws Exception
     */
    int insertPermissionType(PermissionTypeVO permissionTypeVO) throws Exception;

    /**
     * 권한 목록을 조회한다.
     * @return List<RoleInfoVO> 권한목록
     * @throws Exception
     */
    List<RoleInfoVO> selectRoleList() throws Exception;

    /**
     * 권한 페이징 목록을 조회한다.
     * @param roleInfoVO 검색조건
     * @return List<RoleInfoVO> 권한목록
     * @throws Exception
     */
    List<RoleInfoVO> selectRolePagedList(RoleInfoVO roleInfoVO) throws Exception;

    /**
     * 권한 페이징 총 건수를 조회한다.
     * @param roleInfoVO 검색조건
     * @return int 총 건수
     * @throws Exception
     */
    int selectRolePagedCount(RoleInfoVO roleInfoVO) throws Exception;

    /**
     * 권한을 등록한다.
     * @param roleInfoVO 권한정보
     * @return int 등록결과
     * @throws Exception
     */
    int insertRole(RoleInfoVO roleInfoVO) throws Exception;

    /**
     * 권한 정보를 수정한다.
     * @param roleInfoVO 권한정보
     * @return int 수정결과
     * @throws Exception
     */
    int updateRole(RoleInfoVO roleInfoVO) throws Exception;

    /**
     * 권한 사용여부를 수정한다.
     * @param roleInfoVO 권한정보
     * @return int 수정결과
     * @throws Exception
     */
    int updateRoleUseAt(RoleInfoVO roleInfoVO) throws Exception;

    /**
     * 역할별 메뉴 권한 목록을 조회한다.
     * @param roleMenuPermissionVO 검색조건
     * @return List<RoleMenuPermissionVO> 역할메뉴권한목록
     * @throws Exception
     */
    List<RoleMenuPermissionVO> selectRoleMenuPermissionList(RoleMenuPermissionVO roleMenuPermissionVO) throws Exception;

    /**
     * 역할별 메뉴 권한을 설정한다.
     * @param roleMenuPermissionVO 역할메뉴권한정보
     * @return int 설정결과
     * @throws Exception
     */
    int insertRoleMenuPermission(RoleMenuPermissionVO roleMenuPermissionVO) throws Exception;

    /**
     * 역할별 메뉴 권한을 삭제한다.
     * @param roleMenuPermissionVO 역할메뉴권한정보
     * @return int 삭제결과
     * @throws Exception
     */
    int deleteRoleMenuPermission(RoleMenuPermissionVO roleMenuPermissionVO) throws Exception;

    /**
    * 역할 코드 기준으로 역할별 메뉴 권한을 일괄 삭제한다.
    * @param roleCode 역할코드
     * @return int 삭제결과
     * @throws Exception
     */
    int deleteRoleMenuPermissionsByRoleCode(String roleCode) throws Exception;

    /**
     * 메뉴 ID 기준으로 역할별 메뉴 권한을 일괄 삭제한다.
     * @param menuId 메뉴ID
     * @return int 삭제결과
     * @throws Exception
     */
    int deleteRoleMenuPermissionsByMenuId(String menuId) throws Exception;

    /**
     * 사용자별 접근 가능한 메뉴 목록을 조회한다.
    * @param roleCode 역할코드
     * @return List<MenuInfoVO> 접근가능메뉴목록
     * @throws Exception
     */
    List<MenuInfoVO> selectUserAccessibleMenus(String roleCode) throws Exception;

    /**
     * 특정 메뉴에 대한 사용자 권한을 확인한다.
     * @param roleCode 역할코드
     * @param menuUrl 메뉴URL
     * @return String 권한레벨 (read/write/none)
     * @throws Exception
     */
    String checkUserMenuPermission(String roleCode, Long tenantId, String menuUrl) throws Exception;
}