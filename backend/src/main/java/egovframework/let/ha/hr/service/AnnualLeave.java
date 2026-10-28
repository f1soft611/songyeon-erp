package egovframework.let.ha.hr.service;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;

/**
 * 인사·회계 - 연차 일수 계산 (송연 annual_leave_entitlement, 근로기준법 60조)
 * 입사일 기준으로 센다(사람마다 연차가 새로 생기는 날이 다르다).
 * 받은 개수는 저장하지 않고 그때그때 센다 — 적어두면 입사일을 고쳤을 때 따라 고쳐야 하고, 안 고치면 조용히 어긋난다.
 * 1년 미만은 '매달 개근했다' 고 본다(이 프로그램에는 출근 기록이 없다. 화면에 그렇게 적어둔다).
 * @author SONGYEON ERP
 * @since 2026.10.14
 * @version 1.0
 */
public final class AnnualLeave {

    /** 근속 연수 · 연차연도(시작~끝) · 받은 일수 · 첫 해(달마다 늘어나는 중) */
    public static final class Entitlement {
        private final int yearsOfService;
        private final LocalDate yearStart;
        private final LocalDate yearEnd;
        private final double entitledDays;

        Entitlement(int yearsOfService, LocalDate yearStart, LocalDate yearEnd, double entitledDays) {
            this.yearsOfService = yearsOfService;
            this.yearStart = yearStart;
            this.yearEnd = yearEnd;
            this.entitledDays = entitledDays;
        }

        public int getYearsOfService() {
            return yearsOfService;
        }

        public String getYearStart() {
            return yearStart.toString();
        }

        public String getYearEnd() {
            return yearEnd.toString();
        }

        public double getEntitledDays() {
            return entitledDays;
        }

        public boolean isAccruing() {
            return yearsOfService == 0;
        }

        /** 'YYYY-MM-DD' 글자가 이 연차연도 안인가(앞 10글자로 견준다) */
        public boolean contains(String date) {
            return date != null && date.compareTo(getYearStart()) >= 0 && date.compareTo(getYearEnd()) <= 0;
        }
    }

    private AnnualLeave() {
    }

    /** 'YYYY-MM-DD' 를 날짜로. 못 읽으면 null */
    public static LocalDate parse(String text) {
        if (text == null) {
            return null;
        }
        try {
            return LocalDate.parse(text.trim());
        } catch (DateTimeParseException ex) {
            return null;
        }
    }

    /** start 부터 end 까지 꽉 채운 달 수. 3월 15일에 들어와 9월 9일이면 5달이다 */
    static int monthsBetween(LocalDate start, LocalDate end) {
        int months = (end.getYear() - start.getYear()) * 12 + (end.getMonthValue() - start.getMonthValue());
        if (end.getDayOfMonth() < start.getDayOfMonth()) {
            months -= 1;
        }
        return Math.max(0, months);
    }

    /** n 년 뒤 같은 날. 2월 29일에 들어온 사람은 평년에 2월 28일로 본다 */
    static LocalDate addYears(LocalDate d, int n) {
        // LocalDate.plusYears 도 2월 29일을 평년에는 2월 28일로 맞춘다(송연 _add_years 와 같음)
        return d.plusYears(n);
    }

    /**
     * asOf 가 속한 연차연도에 받은 연차 일수. 아직 입사 전이면 null.
     * 1년 미만: 한 달 일할 때마다 하루, 최대 11일 / 1년 이상: 15일 / 3년 이상: 2년마다 하루씩 더, 최대 25일.
     */
    public static Entitlement entitlement(LocalDate hire, LocalDate asOf) {
        if (asOf.isBefore(hire)) {
            return null;
        }
        int years = monthsBetween(hire, asOf) / 12;
        LocalDate yearStart = addYears(hire, years);
        LocalDate yearEnd = addYears(hire, years + 1).minusDays(1);
        int days = years == 0 ? Math.min(11, monthsBetween(hire, asOf)) : Math.min(25, 15 + (years - 1) / 2);
        return new Entitlement(years, yearStart, yearEnd, days);
    }
}
