package egovframework.let.qm.haccp.prerequisite.service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.time.temporal.IsoFields;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 서류의 기간(주기) 계산 (송연 qsurvey._period · _periods_back).
 * 한 기간에 한 장이다 — 주1회 점검표가 같은 주에 두 장 생기면 어느 것이 그 주의 점검인지 알 수 없다. '수시' 만 여러 장을 허용한다.
 * 날짜는 'YYYY-MM-DD' 글로 주고받는다(qdoc_record.doc_date 가 글이라 BETWEEN 에 그대로 넣는다)
 * @author SONGYEON ERP
 * @since 2026.11.09
 * @version 1.0
 */
public final class SurveyPeriod {

    public static final List<String> CYCLES = Collections.unmodifiableList(Arrays.asList("매일", "주1회", "월1회", "분기1회", "반기1회", "연1회", "수시"));

    /** 현황에서 거슬러 볼 기간 수(매일 것을 세 칸만 보여주면 빠진 줄을 알아채기 어렵고, 연1회 것을 열두 칸 보여주면 오지도 않은 해가 뜬다) */
    private static final Map<String, Integer> LOOKBACK = new HashMap<>();
    static {
        LOOKBACK.put("매일", 14);
        LOOKBACK.put("주1회", 8);
        LOOKBACK.put("월1회", 6);
        LOOKBACK.put("분기1회", 4);
        LOOKBACK.put("반기1회", 4);
        LOOKBACK.put("연1회", 3);
    }

    private final String start;
    private final String end;
    private final String label;

    private SurveyPeriod(LocalDate start, LocalDate end, String label) {
        this.start = start.toString();
        this.end = end.toString();
        this.label = label;
    }

    public String getStart() {
        return start;
    }

    public String getEnd() {
        return end;
    }

    public String getLabel() {
        return label;
    }

    public List<String> asList() {
        return Arrays.asList(start, end, label);
    }

    public static int lookback(String cycle) {
        return LOOKBACK.getOrDefault(cycle, 6);
    }

    /** 그 날짜가 든 기간. 수시 · 모르는 주기 · 잘못된 날짜면 null */
    public static SurveyPeriod of(String cycle, String ymd) {
        if (ymd == null) {
            return null;
        }
        try {
            return of(cycle, LocalDate.parse(ymd.trim()));
        } catch (DateTimeParseException ex) {
            return null;
        }
    }

    public static SurveyPeriod of(String cycle, LocalDate d) {
        String c = cycle == null ? "" : cycle.trim();
        switch (c) {
            case "매일":
                return new SurveyPeriod(d, d, d.toString());
            case "주1회": {
                // 주차는 ISO 로 센다. 달을 걸친 주에 '9월 5주차 / 10월 1주차' 처럼 두 이름이 붙는 것을 막는다
                LocalDate mon = d.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
                LocalDate sun = mon.plusDays(6);
                return new SurveyPeriod(mon, sun, String.format("%d년 %d주차 (%d.%d~%d.%d)", d.get(IsoFields.WEEK_BASED_YEAR), d.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR),
                        mon.getMonthValue(), mon.getDayOfMonth(), sun.getMonthValue(), sun.getDayOfMonth()));
            }
            case "월1회":
                return new SurveyPeriod(d.withDayOfMonth(1), d.with(TemporalAdjusters.lastDayOfMonth()), String.format("%d년 %d월", d.getYear(), d.getMonthValue()));
            case "분기1회": {
                int q = (d.getMonthValue() - 1) / 3;
                LocalDate s = LocalDate.of(d.getYear(), q * 3 + 1, 1);
                return new SurveyPeriod(s, s.plusMonths(3).minusDays(1), String.format("%d년 %d분기", d.getYear(), q + 1));
            }
            case "반기1회": {
                boolean first = d.getMonthValue() <= 6;
                LocalDate s = LocalDate.of(d.getYear(), first ? 1 : 7, 1);
                return new SurveyPeriod(s, s.plusMonths(6).minusDays(1), String.format("%d년 %s", d.getYear(), first ? "상반기" : "하반기"));
            }
            case "연1회":
                return new SurveyPeriod(LocalDate.of(d.getYear(), 1, 1), LocalDate.of(d.getYear(), 12, 31), String.format("%d년", d.getYear()));
            default:
                return null;
        }
    }

    /** 오늘이 든 기간부터 거슬러 최근 기간 n 개(새 것이 먼저) */
    public static List<SurveyPeriod> back(String cycle, int n, LocalDate today) {
        List<SurveyPeriod> out = new ArrayList<>();
        LocalDate d = today;
        while (out.size() < n) {
            SurveyPeriod p = of(cycle, d);
            if (p == null) {
                break;
            }
            out.add(p);
            d = LocalDate.parse(p.start).minusDays(1);
        }
        return out;
    }
}
