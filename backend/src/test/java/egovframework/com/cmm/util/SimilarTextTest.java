package egovframework.com.cmm.util;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.Arrays;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class SimilarTextTest {

	// 기대값은 송연 venv 의 파이썬 difflib.get_close_matches(word, NAMES, 4, 0.45) 결과
	private static final List<String> NAMES = Arrays.asList("양파", "양파분말", "대파", "마늘", "다진마늘", "설탕", "백설탕", "고춧가루");

	@DisplayName("비슷한 이름 제안이 파이썬 difflib 과 같다")
	@Test
	void closeMatchesSameAsPython() {
		assertEquals(Arrays.asList("양파", "양파분말", "고춧가루"), SimilarText.closeMatches("양파가루", NAMES, 4, 0.45));
		assertEquals(Arrays.asList("마늘", "다진마늘"), SimilarText.closeMatches("마늘다짐", NAMES, 4, 0.45));
		assertEquals(Arrays.asList("설탕", "백설탕"), SimilarText.closeMatches("설탕1", NAMES, 4, 0.45));
		assertEquals(Arrays.asList("고춧가루"), SimilarText.closeMatches("고추가루", NAMES, 4, 0.45));
		assertEquals(Arrays.asList("양파", "대파"), SimilarText.closeMatches("파", NAMES, 4, 0.45));
		assertEquals(0.5, SimilarText.ratio("다진마늘", "마늘다짐"), 1e-9);
	}

	@DisplayName("조사: 을/를, 은/는, (으)로")
	@Test
	void josa() {
		assertEquals("를", KoreanText.josa("자재창고", "을를"));
		assertEquals("을", KoreanText.josa("냉장실", "을를"));
		assertEquals("은", KoreanText.josa("필름", "은는"));
		assertEquals("는", KoreanText.josa("파우치", "은는"));
		assertEquals("으로", KoreanText.josa("필름", "로"));
		assertEquals("로", KoreanText.josa("박스", "로"));
		assertEquals("로", KoreanText.josa("파우치", "로"));
	}
}
