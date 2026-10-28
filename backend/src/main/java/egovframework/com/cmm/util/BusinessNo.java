package egovframework.com.cmm.util;

/**
 * 사업자등록번호를 'XXX-XX-XXXXX' 모양으로 다듬고 국세청 검산식으로 확인한다
 * (송연 변환본 kr.co.songyeon.mes.common.util.BusinessNo 와 같은 규칙).
 * 세금계산서에 그대로 나가는 번호라 숫자 두 개를 바꿔 친 것 같은 실수를 저장 전에 막는다.
 * @author SONGYEON ERP
 * @since 2026.10.02
 * @version 1.0
 */
public final class BusinessNo {

    private static final int[] WEIGHTS = { 1, 3, 7, 1, 3, 7, 1, 3, 5 };

    private BusinessNo() {
    }

    /** 다듬은 값(비어 있으면 null)과 막은 이유(없으면 null) */
    public static final class Result {
        private final String value;
        private final String error;

        Result(String value, String error) {
            this.value = value;
            this.error = error;
        }

        public String getValue() {
            return value;
        }

        public String getError() {
            return error;
        }
    }

    public static Result normalize(String raw) {
        String digits = (raw == null ? "" : raw).replaceAll("[^0-9]", "");
        if (digits.isEmpty()) {
            return new Result(null, null);
        }
        if (digits.length() != 10) {
            return new Result(null, "사업자등록번호는 숫자 10자리여야 합니다 (지금 " + digits.length() + "자리). 예: 123-45-67890");
        }
        int[] d = new int[10];
        for (int i = 0; i < 10; i++) {
            d[i] = digits.charAt(i) - '0';
        }
        // 가중치를 곱해 더하고, 9번째 자리는 5를 곱한 뒤 10으로 나눈 몫도 더한다.
        int total = (d[8] * 5) / 10;
        for (int i = 0; i < 9; i++) {
            total += d[i] * WEIGHTS[i];
        }
        if ((10 - total % 10) % 10 != d[9]) {
            return new Result(null, "사업자등록번호 '" + format(digits) + "' 가 올바르지 않습니다. 숫자를 다시 확인해주세요.");
        }
        return new Result(format(digits), null);
    }

    private static String format(String digits) {
        return digits.substring(0, 3) + "-" + digits.substring(3, 5) + "-" + digits.substring(5);
    }
}
