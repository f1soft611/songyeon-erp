package egovframework.let.pd.status.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.let.pd.status.domain.model.ProductionStatusVO;
import egovframework.let.pd.status.domain.repository.ProductionStatusDAO;
import egovframework.let.pd.status.service.ProductionStatusService;

/**
 * 생산관리 - 생산현황 서비스 구현 클래스 (송연 PD0003Service, 기존 production_status 와 같은 규칙)
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Service("productionStatusService")
public class ProductionStatusServiceImpl extends EgovAbstractServiceImpl implements ProductionStatusService {

    static final String PERIOD_REQUIRED_MESSAGE = "조회 기간을 선택해주세요";

    private final ProductionStatusDAO productionStatusDAO;

    public ProductionStatusServiceImpl(ProductionStatusDAO productionStatusDAO) {
        this.productionStatusDAO = productionStatusDAO;
    }

    @Override
    public List<ProductionStatusVO> listStatus(String start, String end, String productName, String clientName) throws Exception {
        String from = blankToNull(start);
        String to = blankToNull(end);
        if (from == null || to == null) {
            throw new IllegalArgumentException(PERIOD_REQUIRED_MESSAGE);
        }
        return productionStatusDAO.selectStatus(from, to, blankToNull(productName), blankToNull(clientName));
    }

    private static String blankToNull(String value) {
        return value == null || value.trim().isEmpty() ? null : value.trim();
    }
}
