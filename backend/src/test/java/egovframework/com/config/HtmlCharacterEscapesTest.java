package egovframework.com.config;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.nio.charset.StandardCharsets;
import java.util.Collections;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.mock.http.MockHttpOutputMessage;

import com.fasterxml.jackson.databind.ObjectMapper;

import egovframework.com.security.WebMvcConfig;

// S_ERP HtmlCharacterEscapesTest(20261102_010 쪽지 이모지 응답 오류)와 같은 확인.
// 송연에는 쪽지가 없어 응답 본문을 Map 으로 만든다. 공지 · 결재 댓글 등 이모지가 든 모든 응답이 같은 변환을 탄다
class HtmlCharacterEscapesTest {
    @Test
    void preservesEmojiInUtf8JsonResponse() throws Exception {
        String text = "😀 👍🏽 👩‍💻 한글 \" <>&\n";
        MappingJackson2HttpMessageConverter converter = (MappingJackson2HttpMessageConverter)
                new WebMvcConfig(new ObjectMapper()).htmlEscapingConverter();
        MockHttpOutputMessage response = new MockHttpOutputMessage();
        converter.write(Collections.singletonMap("resultList",
                Collections.singletonList(Collections.singletonMap("content", text))),
                MediaType.APPLICATION_JSON, response);
        assertEquals(text, new ObjectMapper().readTree(response.getBodyAsString(StandardCharsets.UTF_8))
                .get("resultList").get(0).get("content").asText());
    }
}
