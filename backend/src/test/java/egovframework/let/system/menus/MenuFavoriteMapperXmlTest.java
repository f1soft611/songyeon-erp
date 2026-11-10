package egovframework.let.system.menus;

import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import org.junit.jupiter.api.Test;

class MenuFavoriteMapperXmlTest {

    @Test
    void favoriteMapperScopesFolderAndFavoriteOperationsToOwner() throws Exception {
        String xml = readMapper();
        String favorites = statement(xml, "selectFavorites", "select");
        String folderDelete = statement(xml, "deleteFolder", "delete");

        assertTrue(favorites.contains("tenant_id = #{tenantId}"));
        assertTrue(favorites.contains("user_id = #{userId}"));
        assertTrue(folderDelete.contains("tenant_id = #{tenantId}"));
        assertTrue(folderDelete.contains("user_id = #{userId}"));
        assertTrue(folderDelete.contains("NOT EXISTS"));
    }

    @Test
    void schemaPreventsDuplicateMenusAndCrossOwnerFolderReferences() throws Exception {
        String sql = readSchema().replaceAll("\\s+", " ").toLowerCase();

        assertTrue(sql.contains("unique (tenant_id, user_id, menu_id)"));
        assertTrue(sql.contains("foreign key (favorite_folder_id, tenant_id, user_id)"));
        assertTrue(sql.contains("on delete cascade"));
    }

    @Test
    void nullableFolderParametersDeclareBigintJdbcType() throws Exception {
        String xml = readMapper();
        String insertFavorite = statement(xml, "insertFavorite", "insert");
        String moveFavorite = statement(xml, "moveFavorite", "update");

        assertTrue(insertFavorite.contains("#{folderId, jdbcType=BIGINT}"));
        assertTrue(moveFavorite.contains("#{folderId, jdbcType=BIGINT}"));
    }

    @Test
    void favoriteMapperPersistsOptionalFavoriteName() throws Exception {
        String xml = readMapper();
        String selectFavorites = statement(xml, "selectFavorites", "select");
        String insertFavorite = statement(xml, "insertFavorite", "insert");
        String moveFavorite = statement(xml, "moveFavorite", "update");

        assertTrue(selectFavorites.contains("favorite_nm AS favorite_name"));
        assertTrue(insertFavorite.contains("favorite_nm"));
        assertTrue(insertFavorite.contains("#{favoriteName, jdbcType=VARCHAR}"));
        assertTrue(moveFavorite.contains("favorite_nm = COALESCE(#{favoriteName, jdbcType=VARCHAR}, favorite_nm)"));
    }

    private static String statement(String xml, String id, String kind) {
        String open = "<" + kind + " id=\"" + id + "\"";
        String close = "</" + kind + ">";
        int start = xml.indexOf(open);
        if (start < 0) {
            throw new AssertionError(kind + " statement not found: " + id);
        }
        return xml.substring(start, xml.indexOf(close, start)).replaceAll("\\s+", " ");
    }

    private String readMapper() throws Exception {
        try (InputStream input = getClass().getClassLoader().getResourceAsStream(
                "egovframework/mapper/let/system/menus/MenuFavorite_SQL_postgresql.xml")) {
            if (input == null) {
                throw new IllegalStateException("Menu favorite mapper XML not found");
            }
            return new String(input.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    private String readSchema() throws Exception {
        Path repositoryRoot = Paths.get("docs/database/20261104/20261104_003_create_menu_favorites.sql");
        Path backendWorkingDirectory = Paths.get("..", "docs", "database", "20261104",
                "20261104_003_create_menu_favorites.sql");
        Path schema = Files.exists(repositoryRoot) ? repositoryRoot : backendWorkingDirectory;
        if (!Files.exists(schema)) {
            throw new IllegalStateException("Menu favorite schema migration not found: " + schema);
        }
        return Files.readString(schema, StandardCharsets.UTF_8);
    }
}
