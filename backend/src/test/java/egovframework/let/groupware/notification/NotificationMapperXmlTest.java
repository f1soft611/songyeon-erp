package egovframework.let.groupware.notification;

import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

// S_ERP NotificationMapperXmlTest 와 같은 확인(웹푸시 조회 확인은 웹푸시 단계에서)
class NotificationMapperXmlTest {

    @Test
    void notificationListFiltersByOwnerTypeAndActiveStateBeforePagination() throws Exception {
        String query = selectBlock(readMapper(), "selectNotifications").replaceAll("\\s+", " ");

        assertTrue(query.contains("n.tenant_id = #{tenantId}"));
        assertTrue(query.contains("n.recipient_user_id = #{userId}"));
        assertTrue(query.contains("n.archived_at IS NULL"));
        assertTrue(query.contains("<if test=\"eventType != null\"> AND n.event_type = #{eventType}"));
        assertTrue(query.contains("n.notification_id &lt; #{beforeNotificationId}"));
        assertTrue(query.contains("LIMIT #{limit}"));
    }

    @Test
    void unreadSummaryAndBulkArchiveExcludeArchivedAndUnreadRows() throws Exception {
        String xml = readMapper();
        String unreadCount = selectBlock(xml, "selectUnreadCount");
        String archiveRead = updateBlock(xml, "archiveReadNotifications").replaceAll("\\s+", " ");
        String archiveOne = updateBlock(xml, "archiveNotification").replaceAll("\\s+", " ");

        assertTrue(unreadCount.contains("read_at IS NULL"));
        assertTrue(unreadCount.contains("archived_at IS NULL"));
        assertTrue(archiveRead.contains("tenant_id = #{tenantId}"));
        assertTrue(archiveRead.contains("recipient_user_id = #{userId}"));
        assertTrue(archiveRead.contains("read_at IS NOT NULL"));
        assertTrue(archiveRead.contains("archived_at IS NULL"));
        assertTrue(archiveRead.contains("<if test=\"eventType != null\"> AND event_type = #{eventType}"));
        assertTrue(archiveOne.contains("COALESCE(archived_at, CURRENT_TIMESTAMP)"));
        assertTrue(archiveOne.contains("tenant_id = #{tenantId}"));
        assertTrue(archiveOne.contains("recipient_user_id = #{userId}"));
        assertTrue(archiveOne.contains("notification_id = #{notificationId}"));
    }


    private static String selectBlock(String xml, String id) {
        return block(xml, "<select id=\"" + id + "\"", "</select>", id);
    }

    private static String updateBlock(String xml, String id) {
        return block(xml, "<update id=\"" + id + "\"", "</update>", id);
    }

    private static String block(String xml, String open, String close, String id) {
        int start = xml.indexOf(open);
        if (start < 0) throw new AssertionError("mapper statement not found: " + id);
        return xml.substring(start, xml.indexOf(close, start));
    }

    private String readMapper() throws Exception {
        try (InputStream input = getClass().getClassLoader().getResourceAsStream(
                "egovframework/mapper/let/groupware/notification/Notification_SQL_postgresql.xml")) {
            if (input == null) {
                throw new IllegalStateException("Notification mapper XML not found");
            }
            return new String(input.readAllBytes(), StandardCharsets.UTF_8);
        }
    }
}
