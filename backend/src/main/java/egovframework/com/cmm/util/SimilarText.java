package egovframework.com.cmm.util;

import java.util.AbstractMap;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.Deque;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 비슷한 글자 찾기 — 송연 기존 파이썬 difflib.SequenceMatcher.ratio / get_close_matches 와 같은 결과
 * (비슷한 원재료명 제안, "혹시 '(주)부산축산' 인가요?" 거래처 안내에 쓴다. 200자 미만이라 junk 처리는 없다)
 * 송연 변환본 kr.co.songyeon.mes.common.util.SimilarText 를 Java 8 문법으로 옮김.
 * @author SONGYEON ERP
 * @since 2026.10.02
 * @version 1.0
 */
public final class SimilarText {

    private SimilarText() {
    }

    public static double ratio(String a, String b) {
        int total = a.length() + b.length();
        return total == 0 ? 1.0 : 2.0 * matches(a, b) / total;
    }

    /** difflib.get_close_matches(word, possibilities, n, cutoff): 점수 높은 순, 점수가 같으면 문자열 역순 */
    public static List<String> closeMatches(String word, List<String> possibilities, int n, double cutoff) {
        List<Map.Entry<Double, String>> scored = new ArrayList<>();
        for (String x : possibilities) {
            if (x == null) {
                continue;
            }
            double score = ratio(x, word);
            if (score >= cutoff) {
                scored.add(new AbstractMap.SimpleEntry<>(score, x));
            }
        }
        scored.sort(Comparator.<Map.Entry<Double, String>>comparingDouble(Map.Entry::getKey).reversed()
                .thenComparing(Map.Entry::getValue, Comparator.reverseOrder()));
        List<String> result = new ArrayList<>();
        for (int i = 0; i < Math.min(n, scored.size()); i++) {
            result.add(scored.get(i).getValue());
        }
        return result;
    }

    /** SequenceMatcher.get_matching_blocks 의 일치 글자 수 합계 */
    private static int matches(String a, String b) {
        Map<Character, List<Integer>> b2j = new HashMap<>();
        for (int j = 0; j < b.length(); j++) {
            b2j.computeIfAbsent(b.charAt(j), key -> new ArrayList<>()).add(j);
        }
        int total = 0;
        Deque<int[]> queue = new ArrayDeque<>();
        queue.push(new int[] {0, a.length(), 0, b.length()});
        while (!queue.isEmpty()) {
            int[] range = queue.pop();
            int alo = range[0], ahi = range[1], blo = range[2], bhi = range[3];
            int besti = alo, bestj = blo, bestSize = 0;
            Map<Integer, Integer> j2len = new HashMap<>();
            for (int i = alo; i < ahi; i++) {
                Map<Integer, Integer> newJ2len = new HashMap<>();
                for (int j : b2j.getOrDefault(a.charAt(i), Collections.<Integer>emptyList())) {
                    if (j < blo) {
                        continue;
                    }
                    if (j >= bhi) {
                        break;
                    }
                    int k = j2len.getOrDefault(j - 1, 0) + 1;
                    newJ2len.put(j, k);
                    if (k > bestSize) {
                        besti = i - k + 1;
                        bestj = j - k + 1;
                        bestSize = k;
                    }
                }
                j2len = newJ2len;
            }
            if (bestSize > 0) {
                total += bestSize;
                if (alo < besti && blo < bestj) {
                    queue.push(new int[] {alo, besti, blo, bestj});
                }
                if (besti + bestSize < ahi && bestj + bestSize < bhi) {
                    queue.push(new int[] {besti + bestSize, ahi, bestj + bestSize, bhi});
                }
            }
        }
        return total;
    }
}
