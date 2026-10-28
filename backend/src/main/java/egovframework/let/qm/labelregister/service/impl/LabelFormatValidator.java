package egovframework.let.qm.labelregister.service.impl;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * 라벨 양식이 쓸 만한지 본다 (송연 label.py _check_format).
 * 라벨은 잘못 나가면 되돌릴 수 없으므로, 저장하기 전에 여기서 한 번 거른다.
 *
 * 위아래로 합쳐진 칸(rowspan)이 있으면 아래 줄은 그만큼 칸이 적은 것이 정상이다.
 * 그래서 줄마다 단순히 더하지 않고, 실제 격자를 채워보며 확인한다(예: 해썹 자리는 3줄을 차지한다).
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
final class LabelFormatValidator {

    private LabelFormatValidator() {
    }

    /** 문제가 있으면 안내 문구, 괜찮으면 null */
    static String check(Object layoutObject) {
        if (!(layoutObject instanceof Map)) {
            return "양식 내용이 올바르지 않습니다";
        }
        Map<?, ?> layout = (Map<?, ?>) layoutObject;
        Object colsObject = layout.get("cols");
        if (!(colsObject instanceof List) || ((List<?>) colsObject).isEmpty()) {
            return "칸 나누기(cols)가 없습니다";
        }
        List<Double> widths = new ArrayList<>();
        for (Object w : (List<?>) colsObject) {
            Double v = toDouble(w);
            if (v == null) {
                return "칸 폭은 숫자여야 합니다";
            }
            widths.add(v);
        }
        for (double w : widths) {
            if (w <= 0) {
                return "칸 폭은 0보다 커야 합니다";
            }
        }
        Object paper = layout.get("paper");
        Double paperW = paper instanceof Map ? toDouble(((Map<?, ?>) paper).get("w")) : null;
        if (paperW == null) {
            return "종이 가로 크기가 없습니다";
        }
        double sum = 0;
        for (double w : widths) {
            sum += w;
        }
        if (Math.abs(sum - paperW) > 0.51) {
            return "칸 폭 합계(" + fmtG(sum) + "mm)가 종이 가로(" + fmtG(paperW) + "mm)와 다릅니다";
        }
        Object rowsObject = layout.get("rows");
        if (!(rowsObject instanceof List) || ((List<?>) rowsObject).isEmpty()) {
            return "줄이 하나도 없습니다";
        }
        List<?> rows = (List<?>) rowsObject;
        int nCols = widths.size();
        boolean[][] filled = new boolean[rows.size()][nCols];
        for (int r = 0; r < rows.size(); r++) {
            Object row = rows.get(r);
            Object cellsObject = row instanceof Map ? ((Map<?, ?>) row).get("cells") : null;
            if (!(cellsObject instanceof List) || ((List<?>) cellsObject).isEmpty()) {
                return (r + 1) + "번째 줄에 칸이 없습니다";
            }
            int c = 0;
            for (Object cellObject : (List<?>) cellsObject) {
                Map<?, ?> cell = cellObject instanceof Map ? (Map<?, ?>) cellObject : java.util.Collections.emptyMap();
                while (c < nCols && filled[r][c]) {
                    c++; // 위에서 내려온 칸이 차지한 자리는 건너뛴다
                }
                Integer span = toInt(cell.get("span"));
                Integer rowspan = toInt(cell.get("rowspan"));
                if (span == null || rowspan == null) {
                    return (r + 1) + "번째 줄에 크기가 이상한 칸이 있습니다";
                }
                if (span < 1 || rowspan < 1) {
                    return (r + 1) + "번째 줄에 크기가 이상한 칸이 있습니다";
                }
                if (c + span > nCols) {
                    return (r + 1) + "번째 줄의 칸이 오른쪽으로 넘칩니다";
                }
                if (r + rowspan > rows.size()) {
                    return (r + 1) + "번째 줄의 칸이 아래로 넘칩니다";
                }
                for (int dr = 0; dr < rowspan; dr++) {
                    for (int dc = 0; dc < span; dc++) {
                        if (filled[r + dr][c + dc]) {
                            return (r + 1) + "번째 줄에 겹치는 칸이 있습니다";
                        }
                        filled[r + dr][c + dc] = true;
                    }
                }
                c += span;
            }
        }
        for (int r = 0; r < rows.size(); r++) {
            int empty = 0;
            for (boolean f : filled[r]) {
                if (!f) {
                    empty++;
                }
            }
            if (empty > 0) {
                return (r + 1) + "번째 줄에 채워지지 않은 자리가 " + empty + "칸 있습니다";
            }
        }
        return null;
    }

    // 파이썬 float(x): 숫자나 숫자 글자. 참/거짓은 숫자로 보지 않는다
    private static Double toDouble(Object value) {
        if (value instanceof Number) {
            return ((Number) value).doubleValue();
        }
        if (value instanceof String) {
            try {
                return Double.valueOf(((String) value).trim());
            } catch (NumberFormatException ex) {
                return null;
            }
        }
        return null;
    }

    // 파이썬 int(cell.get(k) or 1): 비었거나 0 이면 1, 소수는 버림, 숫자가 아니면 null
    private static Integer toInt(Object value) {
        if (value == null || "".equals(value) || Boolean.FALSE.equals(value)) {
            return 1;
        }
        if (value instanceof Number) {
            double d = ((Number) value).doubleValue();
            return d == 0 ? 1 : (int) d;
        }
        if (value instanceof String) {
            try {
                int v = Integer.parseInt(((String) value).trim());
                return v == 0 ? 1 : v;
            } catch (NumberFormatException ex) {
                return null;
            }
        }
        return null;
    }

    // 송연 f"{x:g}": 유효숫자 여섯 자리, 끝의 0 은 뗀다(아주 크거나 작으면 지수 표기)
    static String fmtG(double value) {
        if (value == 0) {
            return "0";
        }
        BigDecimal rounded = new BigDecimal(value).round(new MathContext(6, RoundingMode.HALF_EVEN));
        int exponent = rounded.precision() - rounded.scale() - 1;
        if (exponent < -4 || exponent >= 6) {
            String mantissa = rounded.movePointLeft(exponent).stripTrailingZeros().toPlainString();
            return mantissa + "e" + (exponent < 0 ? "-" : "+") + String.format("%02d", Math.abs(exponent));
        }
        return rounded.stripTrailingZeros().toPlainString();
    }
}
