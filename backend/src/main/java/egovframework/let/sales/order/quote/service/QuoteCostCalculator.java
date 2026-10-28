package egovframework.let.sales.order.quote.service;

import java.math.BigDecimal;

import egovframework.let.sales.order.quote.domain.model.QuoteCostsVO;

/**
 * 영업관리 - 견적 원가 계산 (송연 compute_cost_fields / update_pricing 규칙)
 * 원재료비 → 고정마진 = 원재료비 × 율/100 → 로스 = (원재료비 + 고정마진) × 율/100 → 모든 원가 항목의 합.
 * 견적 저장과, 견적 확정으로 제품을 등록할 때의 단가표가 같은 계산을 쓴다.
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
public final class QuoteCostCalculator {

    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    private QuoteCostCalculator() {
    }

    /** 계산 결과. 율이 비어 있으면 그 금액은 null(빈 값은 합계에서 0). */
    public static final class Result {
        private final Double markupCost;
        private final Double lossCost;
        private final double costSum;

        Result(Double markupCost, Double lossCost, double costSum) {
            this.markupCost = markupCost;
            this.lossCost = lossCost;
            this.costSum = costSum;
        }

        public Double getMarkupCost() {
            return markupCost;
        }

        public Double getLossCost() {
            return lossCost;
        }

        /** 원재료비 + 로스 + 고정마진 + 인건비 + 포장비 + 물류비 + 마진 + 기타1~4 */
        public double getCostSum() {
            return costSum;
        }
    }

    public static Result compute(double materialCost, QuoteCostsVO costs) {
        QuoteCostsVO c = costs == null ? new QuoteCostsVO() : costs;
        BigDecimal material = BigDecimal.valueOf(materialCost);
        BigDecimal markupCost = c.getMarkupRate() == null ? null
                : material.multiply(BigDecimal.valueOf(c.getMarkupRate())).divide(HUNDRED);
        BigDecimal lossCost = c.getLossRate() == null ? null
                : material.add(markupCost == null ? BigDecimal.ZERO : markupCost)
                        .multiply(BigDecimal.valueOf(c.getLossRate())).divide(HUNDRED);
        BigDecimal sum = material.add(orZero(markupCost)).add(orZero(lossCost));
        for (Double value : new Double[] { c.getLaborCost(), c.getPackagingCost(), c.getLogisticsCost(), c.getMargin(),
                c.getOtherCost1(), c.getOtherCost2(), c.getOtherCost3(), c.getOtherCost4() }) {
            if (value != null) {
                sum = sum.add(BigDecimal.valueOf(value));
            }
        }
        return new Result(markupCost == null ? null : markupCost.doubleValue(),
                lossCost == null ? null : lossCost.doubleValue(), sum.doubleValue());
    }

    private static BigDecimal orZero(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
