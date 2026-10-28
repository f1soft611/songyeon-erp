package egovframework.let.groupware.approval.domain.repository;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

import org.apache.ibatis.builder.xml.XMLMapperBuilder;
import org.apache.ibatis.mapping.BoundSql;
import org.apache.ibatis.session.Configuration;
import org.apache.ibatis.io.Resources;
import org.junit.jupiter.api.Test;

class ApprovalLineTemplateMapperTest {

    private static final String MAPPER_RESOURCE =
            "egovframework/mapper/let/groupware/approval/ApprovalLineTemplate_SQL_postgresql.xml";

    @Test
    void templateCrudStatementsAreMapped() throws Exception {
        Configuration configuration = parseMapper();

        assertThat(configuration.hasStatement("ApprovalLineTemplateDAO.selectOwnedTemplates")).isTrue();
        assertThat(configuration.hasStatement("ApprovalLineTemplateDAO.selectOwnedTemplate")).isTrue();
        assertThat(configuration.hasStatement("ApprovalLineTemplateDAO.selectOwnedTemplateLines")).isTrue();
        assertThat(configuration.hasStatement("ApprovalLineTemplateDAO.selectOwnedTemplateNameExists")).isTrue();
        assertThat(configuration.hasStatement("ApprovalLineTemplateDAO.insertTemplate")).isTrue();
        assertThat(configuration.hasStatement("ApprovalLineTemplateDAO.insertTemplateLines")).isTrue();
        assertThat(configuration.hasStatement("ApprovalLineTemplateDAO.updateOwnedTemplateName")).isTrue();
        assertThat(configuration.hasStatement("ApprovalLineTemplateDAO.deleteOwnedTemplate")).isTrue();
    }

    @Test
    void readsAndMutationsAreScopedToTenantOwnerAndDocumentCode() throws Exception {
        Configuration configuration = parseMapper();
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", 4L);
        params.put("ownerUserId", "login-author");
        params.put("eabusNo", "001");
        params.put("templateId", 7L);
        params.put("name", "기본 결재선");

        BoundSql list = configuration.getMappedStatement("ApprovalLineTemplateDAO.selectOwnedTemplates")
                .getBoundSql(params);
        BoundSql detail = configuration.getMappedStatement("ApprovalLineTemplateDAO.selectOwnedTemplate")
                .getBoundSql(params);
        BoundSql lines = configuration.getMappedStatement("ApprovalLineTemplateDAO.selectOwnedTemplateLines")
                .getBoundSql(params);
        BoundSql duplicateName = configuration
                .getMappedStatement("ApprovalLineTemplateDAO.selectOwnedTemplateNameExists").getBoundSql(params);
        BoundSql rename = configuration.getMappedStatement("ApprovalLineTemplateDAO.updateOwnedTemplateName")
                .getBoundSql(params);
        BoundSql delete = configuration.getMappedStatement("ApprovalLineTemplateDAO.deleteOwnedTemplate")
                .getBoundSql(params);

        assertThat(list.getSql())
                .contains("tenant_id = ?")
                .contains("owner_user_id = ?")
                .contains("eabus_no = ?");
        assertThat(detail.getSql())
                .contains("tenant_id = ?")
                .contains("owner_user_id = ?")
                .contains("template_id = ?");
        assertThat(lines.getSql())
                .contains("tenant_id = ?")
                .contains("owner_user_id = ?")
                .contains("template_id = ?");
        assertThat(duplicateName.getSql())
                .contains("tenant_id = ?")
                .contains("owner_user_id = ?")
                .contains("eabus_no = ?")
                .contains("template_name = ?");
        assertThat(rename.getSql())
                .contains("tenant_id = ?")
                .contains("owner_user_id = ?")
                .contains("template_id = ?");
        assertThat(delete.getSql())
                .contains("tenant_id = ?")
                .contains("owner_user_id = ?")
                .contains("template_id = ?");
    }

    private Configuration parseMapper() throws Exception {
        Configuration configuration = new Configuration();
        try (InputStream input = Resources.getResourceAsStream(MAPPER_RESOURCE)) {
            new XMLMapperBuilder(input, configuration, MAPPER_RESOURCE, configuration.getSqlFragments()).parse();
        }
        return configuration;
    }
}
