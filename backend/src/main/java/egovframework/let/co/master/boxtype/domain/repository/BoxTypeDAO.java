package egovframework.let.co.master.boxtype.domain.repository;

import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.co.master.boxtype.domain.model.BoxTypeVO;

/**
 * 기준정보 - 포장유형 데이터 접근 클래스 (tb_box_type)
 * @author SONGYEON ERP
 * @since 2026.10.02
 * @version 2.0 (2026.10.19 tb_box_type 으로 변경)
 */
@Repository("boxTypeDAO")
public class BoxTypeDAO extends EgovAbstractMapper {

    /** 사용 중인 포장유형 목록 {factoryCode, plantCode} (정렬순서 → 이름 순) */
    public List<BoxTypeVO> selectBoxTypeList(Map<String, Object> params) throws Exception {
        return selectList("BoxTypeDAO.selectBoxTypeList", params);
    }

    /** 6자리 숫자 포장유형코드 가운데 가장 큰 번호 {factoryCode, plantCode}. 없으면 null */
    public Integer selectMaxAutoCodeNo(Map<String, Object> params) throws Exception {
        return selectOne("BoxTypeDAO.selectMaxAutoCodeNo", params);
    }

    /** 사용안함 줄까지 포함한 같은 코드 수 {factoryCode, plantCode, boxTypeCd} */
    public int countAnyCode(Map<String, Object> params) throws Exception {
        Integer n = selectOne("BoxTypeDAO.countAnyCode", params);
        return n == null ? 0 : n;
    }

    /** 사용 중인 줄 가운데 같은 코드 수 {factoryCode, plantCode, boxTypeCd, boxTypeId(자기 자신, 없으면 null)} */
    public int countActiveCode(Map<String, Object> params) throws Exception {
        Integer n = selectOne("BoxTypeDAO.countActiveCode", params);
        return n == null ? 0 : n;
    }


    public int insertBoxType(Map<String, Object> params) throws Exception {
        return insert("BoxTypeDAO.insertBoxType", params);
    }

    /** 바뀐 줄 수(0 이면 없는 줄이거나 이미 삭제된 줄) */
    public int updateBoxType(Map<String, Object> params) throws Exception {
        return update("BoxTypeDAO.updateBoxType", params);
    }

    /** 물리 삭제(2026-10-22). 지운 줄 수 */
    public int deleteBoxType(Map<String, Object> params) throws Exception {
        return delete("BoxTypeDAO.deleteBoxType", params);
    }
}
