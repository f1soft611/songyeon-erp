package egovframework.let.pd.label.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.let.pd.label.domain.model.LabelPrintVO;
import egovframework.let.pd.label.domain.repository.LabelPrintDAO;
import egovframework.let.pd.label.service.LabelPrintService;

/**
 * 생산관리 - 라벨출력 서비스 구현 클래스 (송연 PD0004Service, 기존 label_print_by_date)
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Service("labelPrintService")
public class LabelPrintServiceImpl extends EgovAbstractServiceImpl implements LabelPrintService {

    static final String DATE_REQUIRED_MESSAGE = "날짜를 선택해주세요";

    private final LabelPrintDAO labelPrintDAO;

    public LabelPrintServiceImpl(LabelPrintDAO labelPrintDAO) {
        this.labelPrintDAO = labelPrintDAO;
    }

    @Override
    public List<LabelPrintVO> listByDate(String date) throws Exception {
        if (date == null || date.trim().isEmpty()) {
            throw new IllegalArgumentException(DATE_REQUIRED_MESSAGE);
        }
        return labelPrintDAO.selectByDate(date.trim());
    }
}
