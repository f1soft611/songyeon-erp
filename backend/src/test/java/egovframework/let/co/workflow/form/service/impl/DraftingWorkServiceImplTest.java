package egovframework.let.co.workflow.form.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.InputStream;
import java.util.Collections;

import org.apache.ibatis.builder.xml.XMLMapperBuilder;
import org.apache.ibatis.mapping.SqlCommandType;
import org.apache.ibatis.session.Configuration;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import egovframework.let.co.workflow.form.domain.model.DraftingWorkUserOptionVO;
import egovframework.let.co.workflow.form.domain.model.DraftingWorkSearchConditionVO;
import egovframework.let.co.workflow.form.domain.model.DraftingWorkSaveRequestVO;
import egovframework.let.co.workflow.form.domain.model.DraftingWorkVO;
import egovframework.let.co.workflow.form.domain.repository.DraftingWorkDAO;
import egovframework.let.co.workflow.form.service.DraftingWorkTemplateImageService;
import egovframework.let.co.master.commoncode.domain.model.CommonCodeGroupVO;
import egovframework.let.co.master.commoncode.domain.model.CommonCodeItemVO;
import egovframework.let.co.master.commoncode.service.CommonCodeGroupService;
import egovframework.let.co.master.commoncode.service.CommonCodeItemService;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;

@ExtendWith(MockitoExtension.class)
class DraftingWorkServiceImplTest {

    @Mock
    private DraftingWorkDAO draftingWorkDAO;

    @Mock
    private EgovIdGnrService codeIdGnrService;

    @Mock
    private CommonCodeGroupService commonCodeGroupService;

    @Mock
    private CommonCodeItemService commonCodeItemService;

    private DraftingWorkServiceImpl draftingWorkService;

    @BeforeEach
    void setUp() {
        draftingWorkService = new DraftingWorkServiceImpl(
            draftingWorkDAO, codeIdGnrService, commonCodeGroupService, commonCodeItemService,
            new DraftingWorkTemplateServiceImpl(
                    draftingWorkDAO, org.mockito.Mockito.mock(DraftingWorkTemplateImageService.class)));
    }

    @Test
    void draftingWorkMapperRegistersSourceListAndWriteStatements() throws Exception {
        String resource = "egovframework/mapper/let/co/workflow/form/DraftingWork_SQL_postgresql.xml";
        Configuration configuration = new Configuration();
        try (InputStream mapperStream = getClass().getClassLoader().getResourceAsStream(resource)) {
            assertNotNull(mapperStream);
            new XMLMapperBuilder(mapperStream, configuration, resource, configuration.getSqlFragments()).parse();
        }

        String userOptionsSql = configuration
                .getMappedStatement("DraftingWorkDAO.selectUserOptions")
                .getBoundSql(9L)
                .getSql()
                .toLowerCase()
                .replaceAll("\\s+", " ");
        assertTrue(userOptionsSql.contains("la.profile_image"));
        assertTrue(userOptionsSql.contains("tb_common_code_item"));
        assertTrue(userOptionsSql.contains("tb_common_code_group"));
        assertTrue(userOptionsSql.contains("group_code = 'level'"));
        assertTrue(userOptionsSql.contains("u.tenant_id = ?"));

        assertTrue(configuration.hasStatement("DraftingWorkDAO.selectWorkList"));
        assertTrue(configuration.hasStatement("DraftingWorkDAO.selectWorkIdByCode"));
        assertTrue(configuration.hasStatement("DraftingWorkDAO.insertWork"));
        assertEquals(SqlCommandType.SELECT,
            configuration.getMappedStatement("DraftingWorkDAO.insertWork").getSqlCommandType());
        String insertWorkSql = configuration.getMappedStatement("DraftingWorkDAO.insertWork")
            .getBoundSql(new java.util.HashMap<String, Object>())
            .getSql().toLowerCase().replaceAll("\\s+", " ");
        assertTrue(insertWorkSql.contains("on conflict (tenant_id, cata_type_code)"));
        assertTrue(insertWorkSql.contains("where delete_status is distinct from 'y' do nothing"));
        assertTrue(insertWorkSql.contains("returning drafting_work_category_id"));
        assertTrue(configuration.hasStatement("DraftingWorkDAO.insertWorkAuthorityMapping"));
        assertTrue(configuration.hasStatement("DraftingWorkDAO.selectAssigneeIds"));
        assertTrue(configuration.hasStatement("DraftingWorkDAO.updateWork"));
        assertTrue(configuration.hasStatement("DraftingWorkDAO.deactivateWorkAuthorityMappings"));
    }

    @Test
    void listUserOptionsPassesTenantScopeAndPreservesDistinctUserAndLoginIds() throws Exception {
        DraftingWorkUserOptionVO user = new DraftingWorkUserOptionVO();
        user.setUserId(110L);
        user.setLoginId(210L);
        user.setUserNm("홍길동");
        user.setDepartmentNm("운영팀");
        when(draftingWorkDAO.selectUserOptions(9L))
                .thenReturn(Collections.singletonList(user));

        java.util.List<DraftingWorkUserOptionVO> result = draftingWorkService.listUserOptions(9L);

        assertEquals(1, result.size());
        assertEquals(110L, result.get(0).getUserId());
        assertEquals(210L, result.get(0).getLoginId());

        verify(draftingWorkDAO).selectUserOptions(9L);
    }

    @Test
    void listWorksNormalizesKeywordAndPassesAllFiltersWithinTenant() throws Exception {
        when(draftingWorkDAO.selectWorkList(any(DraftingWorkSearchConditionVO.class)))
                .thenReturn(Collections.emptyList());

        assertEquals(Collections.emptyList(), draftingWorkService.listWorks(9L, "  정기  ", 31L, 42L, "Y"));

        verify(draftingWorkDAO).selectWorkList(argThat(condition ->
                Long.valueOf(9L).equals(condition.getTenantId())
                        && "정기".equals(condition.getKeyword())
                        && Long.valueOf(31L).equals(condition.getCategoryItemId())
                        && Long.valueOf(42L).equals(condition.getRegTermId())
                        && "Y".equals(condition.getUseAt())));
    }

    @Test
    void createWorkTreatsExplicitNullAssigneesAsAnEmptyList() throws Exception {
        when(codeIdGnrService.getNextStringId()).thenReturn("014");
        when(commonCodeGroupService.listGroups(9L)).thenReturn(java.util.Arrays.asList(
            activeGroup(31L, "WF_FORM_CATEGORY"), activeGroup(32L, "WF_FORM_CYCLE")));
        when(commonCodeItemService.listItems(9L, 31L))
            .thenReturn(Collections.singletonList(activeItem(42L, "INSPECTION", "점검")));
        when(commonCodeItemService.listItems(9L, 32L))
            .thenReturn(Collections.singletonList(activeItem(55L, "MONTH", "월")));
        when(draftingWorkDAO.selectUserOptions(9L)).thenReturn(Collections.emptyList());
        when(draftingWorkDAO.selectWorkIdByCode(9L, "014")).thenReturn(null);
        when(draftingWorkDAO.insertWork(any())).thenReturn(77L);

        DraftingWorkSaveRequestVO payload = new DraftingWorkSaveRequestVO();
        payload.setCodeName("점검양식");
        payload.setCategoryItemId(42L);
        payload.setRegTermId(55L);
        payload.setAssigneeIds(null);

        DraftingWorkVO result = draftingWorkService.createWork(9L, 101L, payload);

        assertEquals(Collections.emptyList(), result.getAssigneeIds());
        verify(draftingWorkDAO, never()).insertWorkAuthorityMapping(any());
    }

    @Test
    void createWorkRejectsCodeWhenInsertLosesConcurrentUniqueConflict() throws Exception {
        when(commonCodeGroupService.listGroups(9L)).thenReturn(java.util.Arrays.asList(
            activeGroup(31L, "WF_FORM_CATEGORY"), activeGroup(32L, "WF_FORM_CYCLE")));
        when(commonCodeItemService.listItems(9L, 31L))
            .thenReturn(Collections.singletonList(activeItem(42L, "INSPECTION", "점검")));
        when(commonCodeItemService.listItems(9L, 32L))
            .thenReturn(Collections.singletonList(activeItem(55L, "MONTH", "월")));
        when(draftingWorkDAO.selectUserOptions(9L)).thenReturn(Collections.emptyList());
        when(draftingWorkDAO.selectWorkIdByCode(9L, "007")).thenReturn(null);
        when(draftingWorkDAO.insertWork(any())).thenReturn(null);

        DraftingWorkSaveRequestVO payload = new DraftingWorkSaveRequestVO();
        payload.setCataTypeCode("007");
        payload.setCodeName("점검양식");
        payload.setCategoryItemId(42L);
        payload.setRegTermId(55L);

        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
            () -> draftingWorkService.createWork(9L, 101L, payload));

        assertEquals("이미 사용 중인 구분코드입니다.", error.getMessage());
        verify(draftingWorkDAO, never()).insertWorkAuthorityMapping(any());
    }

                @Test
                void updateWorkRevalidatesOptionsAndReplacesTenantScopedAuthorityMappings() throws Exception {
                DraftingWorkVO existing = new DraftingWorkVO();
                existing.setDraftingWorkCategoryId(77L);
                existing.setCataTypeCode("011");
                DraftingWorkVO updated = new DraftingWorkVO();
                updated.setDraftingWorkCategoryId(77L);
                updated.setCataTypeCode("011");
                when(draftingWorkDAO.selectWorkById(9L, 77L)).thenReturn(existing, updated);
                when(commonCodeGroupService.listGroups(9L)).thenReturn(java.util.Arrays.asList(
                    activeGroup(31L, "WF_FORM_CATEGORY"), activeGroup(32L, "WF_FORM_CYCLE")));
                when(commonCodeItemService.listItems(9L, 31L))
                    .thenReturn(Collections.singletonList(activeItem(42L, "INSPECTION", "점검")));
                when(commonCodeItemService.listItems(9L, 32L))
                    .thenReturn(Collections.singletonList(activeItem(55L, "MONTH", "월")));
                when(draftingWorkDAO.selectUserOptions(9L)).thenReturn(java.util.Arrays.asList(
                    userOption(101L, 201L), userOption(110L, 210L),
                    userOption(111L, 211L), userOption(112L, 212L)));
                when(draftingWorkDAO.updateWork(any())).thenReturn(1);

                DraftingWorkSaveRequestVO payload = new DraftingWorkSaveRequestVO();
                payload.setCodeName(" 수정양식 ");
                payload.setCategoryItemId(42L);
                payload.setRegTermId(55L);
                payload.setReviewerId(210L);
                payload.setApproverId(211L);
                payload.setAssigneeIds(Collections.singletonList("112"));
                payload.setUseAt("N");

                DraftingWorkVO result = draftingWorkService.updateWork(9L, 101L, 77L, payload);

                assertEquals(77L, result.getDraftingWorkCategoryId());
                verify(draftingWorkDAO).updateWork(argThat(params ->
                    Long.valueOf(9L).equals(params.get("tenantId"))
                        && Long.valueOf(77L).equals(params.get("workId"))
                        && "수정양식".equals(params.get("codeName"))
                        && Long.valueOf(42L).equals(params.get("categoryItemId"))
                        && Long.valueOf(55L).equals(params.get("regTermId"))
                        && "월".equals(params.get("cycle"))
                        && "N".equals(params.get("useAt"))
                        && Long.valueOf(201L).equals(params.get("updatedBy"))));
                verify(draftingWorkDAO).deactivateWorkAuthorityMappings(argThat(params ->
                    Long.valueOf(9L).equals(params.get("tenantId"))
                        && Long.valueOf(77L).equals(params.get("workId"))));
                verify(draftingWorkDAO).insertWorkAuthorityMapping(argThat(params ->
                    Long.valueOf(9L).equals(params.get("tenantId"))
                        && Long.valueOf(77L).equals(params.get("workId"))
                        && "011".equals(params.get("cataTypeCode"))
                        && "112".equals(params.get("employeeNo"))));
                }

                @Test
                void createWorkRejectsInactiveCategoryItemBeforeWritingSourceRows() throws Exception {
                when(codeIdGnrService.getNextStringId()).thenReturn("007");

                CommonCodeGroupVO categoryGroup = new CommonCodeGroupVO();
                categoryGroup.setCommonCodeGroupId(31L);
                categoryGroup.setGroupCode("WF_FORM_CATEGORY");
                categoryGroup.setUseAt("Y");
                when(commonCodeGroupService.listGroups(9L))
                    .thenReturn(Collections.singletonList(categoryGroup));

                CommonCodeItemVO inactiveCategory = new CommonCodeItemVO();
                inactiveCategory.setCommonCodeItemId(42L);
                inactiveCategory.setItemCode("INSPECTION");
                inactiveCategory.setItemNm("점검");
                inactiveCategory.setUseAt("N");
                when(commonCodeItemService.listItems(9L, 31L))
                    .thenReturn(Collections.singletonList(inactiveCategory));

                DraftingWorkSaveRequestVO payload = new DraftingWorkSaveRequestVO();
                payload.setCodeName("정기점검");
                payload.setCategoryItemId(42L);
                payload.setRegTermId(55L);

                IllegalArgumentException error = assertThrows(
                    IllegalArgumentException.class,
                    () -> draftingWorkService.createWork(9L, 101L, payload));

                assertEquals("분류 공통코드가 현재 테넌트에서 사용 중이 아닙니다.", error.getMessage());
                verify(draftingWorkDAO, never()).insertWork(any());
                }

                    @Test
                    void createWorkRejectsInactiveCycleItemBeforeWritingSourceRows() throws Exception {
                    when(codeIdGnrService.getNextStringId()).thenReturn("008");

                    CommonCodeGroupVO categoryGroup = new CommonCodeGroupVO();
                    categoryGroup.setCommonCodeGroupId(31L);
                    categoryGroup.setGroupCode("WF_FORM_CATEGORY");
                    categoryGroup.setUseAt("Y");
                    CommonCodeGroupVO cycleGroup = new CommonCodeGroupVO();
                    cycleGroup.setCommonCodeGroupId(32L);
                    cycleGroup.setGroupCode("WF_FORM_CYCLE");
                    cycleGroup.setUseAt("Y");
                    when(commonCodeGroupService.listGroups(9L))
                        .thenReturn(java.util.Arrays.asList(categoryGroup, cycleGroup));

                    CommonCodeItemVO activeCategory = new CommonCodeItemVO();
                    activeCategory.setCommonCodeItemId(42L);
                    activeCategory.setItemCode("INSPECTION");
                    activeCategory.setItemNm("점검");
                    activeCategory.setUseAt("Y");
                    when(commonCodeItemService.listItems(9L, 31L))
                        .thenReturn(Collections.singletonList(activeCategory));

                    CommonCodeItemVO inactiveCycle = new CommonCodeItemVO();
                    inactiveCycle.setCommonCodeItemId(55L);
                    inactiveCycle.setItemCode("MONTH");
                    inactiveCycle.setItemNm("월");
                    inactiveCycle.setUseAt("N");
                    when(commonCodeItemService.listItems(9L, 32L))
                        .thenReturn(Collections.singletonList(inactiveCycle));

                    DraftingWorkSaveRequestVO payload = new DraftingWorkSaveRequestVO();
                    payload.setCodeName("정기점검");
                    payload.setCategoryItemId(42L);
                    payload.setRegTermId(55L);

                    IllegalArgumentException error = assertThrows(
                        IllegalArgumentException.class,
                        () -> draftingWorkService.createWork(9L, 101L, payload));

                    assertEquals("등록주기 공통코드가 현재 테넌트에서 사용 중이 아닙니다.", error.getMessage());
                    verify(draftingWorkDAO, never()).insertWork(any());
                    }

                    @Test
                    void createWorkPersistsAssigneeAuthorityMappingWithSourceWorkId() throws Exception {
                    when(codeIdGnrService.getNextStringId()).thenReturn("011");
                    when(commonCodeGroupService.listGroups(9L))
                        .thenReturn(java.util.Arrays.asList(
                            activeGroup(31L, "WF_FORM_CATEGORY"),
                            activeGroup(32L, "WF_FORM_CYCLE")));
                    when(commonCodeItemService.listItems(9L, 31L))
                        .thenReturn(Collections.singletonList(activeItem(42L, "INSPECTION", "점검")));
                    when(commonCodeItemService.listItems(9L, 32L))
                        .thenReturn(Collections.singletonList(activeItem(55L, "MONTH", "월")));
                    when(draftingWorkDAO.selectUserOptions(9L))
                        .thenReturn(java.util.Arrays.asList(
                            userOption(101L, 201L), userOption(110L, 210L),
                            userOption(111L, 211L), userOption(112L, 212L)));
                    when(draftingWorkDAO.selectWorkIdByCode(9L, "011")).thenReturn(null);
                    when(draftingWorkDAO.insertWork(any())).thenReturn(77L);

                    DraftingWorkSaveRequestVO payload = new DraftingWorkSaveRequestVO();
                    payload.setCodeName("정기점검");
                    payload.setCategoryItemId(42L);
                    payload.setRegTermId(55L);
                    payload.setReviewerId(210L);
                    payload.setApproverId(211L);
                    payload.setAssigneeIds(Collections.singletonList("112"));

                    DraftingWorkVO created = draftingWorkService.createWork(9L, 101L, payload);

                    assertEquals(Collections.singletonList("112"), created.getAssigneeIds());
                    verify(draftingWorkDAO).insertWorkAuthorityMapping(argThat(params ->
                        Long.valueOf(9L).equals(params.get("tenantId"))
                            && Long.valueOf(77L).equals(params.get("workId"))
                            && "011".equals(params.get("cataTypeCode"))
                            && "112".equals(params.get("employeeNo"))
                            && Long.valueOf(201L).equals(params.get("createdBy"))));
                    }

                    @Test
                    void createWorkPersistsCommonCodeIdsAndLegacyDisplayNamesToSourceRow() throws Exception {
                    when(codeIdGnrService.getNextStringId()).thenReturn("009");

                    CommonCodeGroupVO categoryGroup = new CommonCodeGroupVO();
                    categoryGroup.setCommonCodeGroupId(31L);
                    categoryGroup.setGroupCode("WF_FORM_CATEGORY");
                    categoryGroup.setUseAt("Y");
                    CommonCodeGroupVO cycleGroup = new CommonCodeGroupVO();
                    cycleGroup.setCommonCodeGroupId(32L);
                    cycleGroup.setGroupCode("WF_FORM_CYCLE");
                    cycleGroup.setUseAt("Y");
                    when(commonCodeGroupService.listGroups(9L))
                        .thenReturn(java.util.Arrays.asList(categoryGroup, cycleGroup));

                    CommonCodeItemVO activeCategory = new CommonCodeItemVO();
                    activeCategory.setCommonCodeItemId(42L);
                    activeCategory.setItemCode("INSPECTION");
                    activeCategory.setItemNm("점검");
                    activeCategory.setUseAt("Y");
                    when(commonCodeItemService.listItems(9L, 31L))
                        .thenReturn(Collections.singletonList(activeCategory));

                    CommonCodeItemVO activeCycle = new CommonCodeItemVO();
                    activeCycle.setCommonCodeItemId(55L);
                    activeCycle.setItemCode("MONTH");
                    activeCycle.setItemNm("월");
                    activeCycle.setUseAt("Y");
                    when(commonCodeItemService.listItems(9L, 32L))
                        .thenReturn(Collections.singletonList(activeCycle));

                    DraftingWorkSaveRequestVO payload = new DraftingWorkSaveRequestVO();
                    payload.setCodeName(" 정기점검 ");
                    payload.setCategoryItemId(42L);
                    payload.setRegTermId(55L);
                    payload.setReviewerId(210L);
                    payload.setApproverId(211L);
                    payload.setAssigneeIds(Collections.singletonList("110"));
                    payload.setUseAt("Y");

                    DraftingWorkUserOptionVO reviewer = new DraftingWorkUserOptionVO();
                    reviewer.setUserId(110L);
                    reviewer.setLoginId(210L);
                    DraftingWorkUserOptionVO approver = new DraftingWorkUserOptionVO();
                    approver.setUserId(111L);
                    approver.setLoginId(211L);
                    DraftingWorkUserOptionVO actor = new DraftingWorkUserOptionVO();
                    actor.setUserId(101L);
                    actor.setLoginId(201L);
                    when(draftingWorkDAO.selectUserOptions(9L))
                        .thenReturn(java.util.Arrays.asList(actor, reviewer, approver));
                    when(draftingWorkDAO.selectWorkIdByCode(9L, "009")).thenReturn(null);

                    draftingWorkService.createWork(9L, 101L, payload);

                    verify(draftingWorkDAO).insertWork(argThat(params ->
                        Long.valueOf(9L).equals(params.get("tenantId"))
                            && "009".equals(params.get("divisionCode"))
                            && "정기점검".equals(params.get("divisionName"))
                            && Long.valueOf(42L).equals(params.get("categoryItemId"))
                            && Long.valueOf(55L).equals(params.get("regTermId"))
                            && "월".equals(params.get("cycle"))
                            && Long.valueOf(210L).equals(params.get("reviewerId"))
                            && Long.valueOf(211L).equals(params.get("approverId"))
                            && Long.valueOf(201L).equals(params.get("createdBy"))));
                    }

                    @Test
                    void createWorkRejectsReviewerLoginOutsideTenantBeforeWritingSourceRows() throws Exception {
                    when(codeIdGnrService.getNextStringId()).thenReturn("010");
                    CommonCodeGroupVO categoryGroup = activeGroup(31L, "WF_FORM_CATEGORY");
                    CommonCodeGroupVO cycleGroup = activeGroup(32L, "WF_FORM_CYCLE");
                    when(commonCodeGroupService.listGroups(9L))
                        .thenReturn(java.util.Arrays.asList(categoryGroup, cycleGroup));
                    when(commonCodeItemService.listItems(9L, 31L))
                        .thenReturn(Collections.singletonList(activeItem(42L, "INSPECTION", "점검")));
                    when(commonCodeItemService.listItems(9L, 32L))
                        .thenReturn(Collections.singletonList(activeItem(55L, "MONTH", "월")));
                    when(draftingWorkDAO.selectUserOptions(9L)).thenReturn(Collections.emptyList());

                    DraftingWorkSaveRequestVO payload = new DraftingWorkSaveRequestVO();
                    payload.setCodeName("정기점검");
                    payload.setCategoryItemId(42L);
                    payload.setRegTermId(55L);
                    payload.setReviewerId(999L);

                    IllegalArgumentException error = assertThrows(
                        IllegalArgumentException.class,
                        () -> draftingWorkService.createWork(9L, 101L, payload));

                    assertEquals("검토자는 현재 테넌트에서 사용 가능한 사용자여야 합니다.", error.getMessage());
                    verify(draftingWorkDAO, never()).insertWork(any());
                    }

                        @Test
                        void createWorkAllowsOptionalReviewerAndApprover() throws Exception {
                        when(codeIdGnrService.getNextStringId()).thenReturn("012");
                        when(commonCodeGroupService.listGroups(9L)).thenReturn(java.util.Arrays.asList(
                            activeGroup(31L, "WF_FORM_CATEGORY"), activeGroup(32L, "WF_FORM_CYCLE")));
                        when(commonCodeItemService.listItems(9L, 31L))
                            .thenReturn(Collections.singletonList(activeItem(42L, "INSPECTION", "점검")));
                        when(commonCodeItemService.listItems(9L, 32L))
                            .thenReturn(Collections.singletonList(activeItem(55L, "MONTH", "월")));
                        when(draftingWorkDAO.selectUserOptions(9L))
                            .thenReturn(Collections.singletonList(userOption(101L, 201L)));
                        when(draftingWorkDAO.selectWorkIdByCode(9L, "012")).thenReturn(null);
                        when(draftingWorkDAO.insertWork(any())).thenReturn(77L);

                        DraftingWorkSaveRequestVO payload = new DraftingWorkSaveRequestVO();
                        payload.setCodeName("점검양식");
                        payload.setCategoryItemId(42L);
                        payload.setRegTermId(55L);

                        DraftingWorkVO result = draftingWorkService.createWork(9L, 101L, payload);

                        assertEquals(77L, result.getDraftingWorkCategoryId());
                        verify(draftingWorkDAO).insertWork(argThat(params ->
                            params.get("reviewerId") == null
                                && params.get("approverId") == null));
                        }

                        @Test
                        void createWorkRejectsUseAtOutsideYesOrNo() throws Exception {
                        DraftingWorkSaveRequestVO payload = new DraftingWorkSaveRequestVO();
                            payload.setCataTypeCode("013");
                        payload.setCodeName("점검양식");
                        payload.setCategoryItemId(42L);
                        payload.setRegTermId(55L);
                        payload.setUseAt("X");

                        IllegalArgumentException error = assertThrows(
                            IllegalArgumentException.class,
                            () -> draftingWorkService.createWork(9L, 101L, payload));

                        assertEquals("사용여부는 Y 또는 N이어야 합니다.", error.getMessage());
                        verify(draftingWorkDAO, never()).insertWork(any());
                        }

                        private static CommonCodeGroupVO activeGroup(Long id, String code) {
                        CommonCodeGroupVO group = new CommonCodeGroupVO();
                        group.setCommonCodeGroupId(id);
                        group.setGroupCode(code);
                        group.setUseAt("Y");
                        return group;
                    }

                    private static CommonCodeItemVO activeItem(Long id, String code, String name) {
                        CommonCodeItemVO item = new CommonCodeItemVO();
                        item.setCommonCodeItemId(id);
                        item.setItemCode(code);
                        item.setItemNm(name);
                        item.setUseAt("Y");
                        return item;
                    }

                    private static DraftingWorkUserOptionVO userOption(Long userId, Long loginId) {
                        DraftingWorkUserOptionVO user = new DraftingWorkUserOptionVO();
                        user.setUserId(userId);
                        user.setLoginId(loginId);
                        return user;
                    }

                    @Test
                    void createWorkRejectsDuplicateCataTypeCodeWithinTenant() throws Exception {
                    when(commonCodeGroupService.listGroups(9L))
                        .thenReturn(java.util.Arrays.asList(
                            activeGroup(31L, "WF_FORM_CATEGORY"),
                            activeGroup(32L, "WF_FORM_CYCLE")));
                    when(commonCodeItemService.listItems(9L, 31L))
                        .thenReturn(Collections.singletonList(activeItem(42L, "INSPECTION", "점검")));
                    when(commonCodeItemService.listItems(9L, 32L))
                        .thenReturn(Collections.singletonList(activeItem(55L, "MONTH", "월")));
                    DraftingWorkUserOptionVO reviewer = new DraftingWorkUserOptionVO();
                    reviewer.setUserId(110L);
                    reviewer.setLoginId(210L);
                    DraftingWorkUserOptionVO approver = new DraftingWorkUserOptionVO();
                    approver.setUserId(111L);
                    approver.setLoginId(211L);
                    when(draftingWorkDAO.selectUserOptions(9L))
                        .thenReturn(java.util.Arrays.asList(reviewer, approver));

                    DraftingWorkSaveRequestVO payload = new DraftingWorkSaveRequestVO();
                    payload.setCataTypeCode("007");
                    payload.setCodeName("정기점검");
                    payload.setCategoryItemId(42L);
                    payload.setRegTermId(55L);
                    payload.setReviewerId(210L);
                    payload.setApproverId(211L);

                    when(draftingWorkDAO.selectWorkIdByCode(9L, "007"))
                        .thenReturn(501L);

                    IllegalArgumentException error = assertThrows(
                        IllegalArgumentException.class,
                        () -> draftingWorkService.createWork(9L, 101L, payload));

                    assertEquals("이미 사용 중인 구분코드입니다.", error.getMessage());
                    verify(draftingWorkDAO, never()).insertWork(any());
                    }
}