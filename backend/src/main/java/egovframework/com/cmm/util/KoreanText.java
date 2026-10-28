package egovframework.com.cmm.util;

/**
 * 한글 조사 고르기 — 송연 변환본 kr.co.songyeon.mes.common.util.KoreanText 와 같은 규칙
 * josa("자재창고", "을를") → "를", josa("냉장실", "을를") → "을", josa("필름", "로") → "으로"
 * @author SONGYEON ERP
 * @since 2026.10.02
 * @version 1.0
 */
public final class KoreanText {

    private KoreanText() {
    }

    /**
     * @param word 앞 단어
     * @param pair 받침 있을 때·없을 때 조사 두 글자(예: "을를", "은는", "이가"). "로" 는 (으)로.
     */
    public static String josa(String word, String pair) {
        String w = word == null ? "" : word.trim();
        char last = w.isEmpty() ? 0 : w.charAt(w.length() - 1);
        boolean hangul = last >= 0xAC00 && last <= 0xD7A3;
        int jong = hangul ? (last - 0xAC00) % 28 : -1;
        if ("로".equals(pair)) {
            return jong == 0 || jong == 8 ? "로" : "으로";
        }
        if (!hangul) {
            return pair.substring(0, 1);
        }
        return jong == 0 ? pair.substring(1) : pair.substring(0, 1);
    }
}
