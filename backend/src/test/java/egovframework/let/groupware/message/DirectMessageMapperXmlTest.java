package egovframework.let.groupware.message;

import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

class DirectMessageMapperXmlTest {

    @Test
    void threadListSelectsOtherUsersProfileImageThroughLoginAccount() throws Exception {
        String xml = readMapper();
        int start = xml.indexOf("<select id=\"selectThreads\"");
        String selectThreads = xml.substring(start, xml.indexOf("</select>", start));

        assertTrue(selectThreads.contains("la.profile_image AS otherUserProfileImage"));
        assertTrue(selectThreads.replaceAll("\\s+", " ")
                .contains("LEFT JOIN public.tb_login_account la ON la.tenant_id = other.tenant_id AND la.login_id = other.login_id"));
    }

    @Test
    void threadMessagesAreLimitedToOneDayAndThreadListSupportsAllFolder() throws Exception {
        String xml = readMapper();
        String messages = selectBlock(xml, "selectThreadMessages").replaceAll("\\s+", " ");
        assertTrue(messages.contains("m.created_at &gt;= #{dayStart}"));
        assertTrue(messages.contains("m.created_at &lt; #{dayEnd}"));
        assertTrue(selectBlock(xml, "selectLatestMessageDate").contains("#{beforeDayStart}"));
        assertTrue(selectBlock(xml, "selectHasMessagesBefore").contains("#{dayStart}"));
        assertTrue(selectBlock(xml, "selectThreads").contains("#{folder} = 'ALL'"));
    }

    @Test
    void hiddenThreadsStayHiddenUntilANewerMessageArrives() throws Exception {
        String xml = readMapper();
        String threads = selectBlock(xml, "selectThreads").replaceAll("\\s+", " ");
        assertTrue(threads.contains("participant_a_hidden_at"));
        assertTrue(threads.contains("latest.created_at &gt; hidden.hidden_at"));
        assertTrue(selectBlock(xml, "selectThreadForParticipant").contains("AS hiddenAt"));
        for (String id : new String[] {"selectThreadMessages", "selectLatestMessageDate", "selectHasMessagesBefore"}) {
            assertTrue(selectBlock(xml, id).contains("m.created_at &gt; #{visibleAfter}"), id);
        }
        assertTrue(selectBlock(xml, "selectThreadIdForMessage").contains("participant_a_hidden_at"));
        int start = xml.indexOf("<update id=\"hideThreadForParticipant\"");
        assertTrue(start >= 0);
        String hide = xml.substring(start, xml.indexOf("</update>", start));
        assertTrue(hide.contains("participant_a_hidden_at = CASE"));
        assertTrue(hide.contains("participant_b_hidden_at = CASE"));
    }

    private static String selectBlock(String xml, String id) {
        int start = xml.indexOf("<select id=\"" + id + "\"");
        if (start < 0) {
            throw new AssertionError("select not found: " + id);
        }
        return xml.substring(start, xml.indexOf("</select>", start));
    }

    private String readMapper() throws Exception {
        try (InputStream input = getClass().getClassLoader().getResourceAsStream(
                "egovframework/mapper/let/groupware/message/DirectMessage_SQL_postgresql.xml")) {
            if (input == null) {
                throw new IllegalStateException("DirectMessage mapper XML not found");
            }
            return new String(input.readAllBytes(), StandardCharsets.UTF_8);
        }
    }
}
