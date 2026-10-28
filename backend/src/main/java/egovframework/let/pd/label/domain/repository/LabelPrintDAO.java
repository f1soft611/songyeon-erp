package egovframework.let.pd.label.domain.repository;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.pd.label.domain.model.LabelPrintVO;

/**
 * 생산관리 - 라벨출력 데이터 접근 클래스 (송연 production_schedule · products, 조회만)
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Repository("labelPrintDAO")
public class LabelPrintDAO extends EgovAbstractMapper {

    public List<LabelPrintVO> selectByDate(String date) throws Exception {
        return selectList("LabelPrintDAO.selectByDate", date);
    }
}
