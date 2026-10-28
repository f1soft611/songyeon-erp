package egovframework.let.pu.substitution.service;

import java.util.List;

import egovframework.let.pu.substitution.domain.model.SubstitutionDetailVO;
import egovframework.let.pu.substitution.domain.model.SubstitutionMaterialVO;
import egovframework.let.pu.substitution.domain.model.SubstitutionRequestVO;
import egovframework.let.pu.substitution.domain.model.SubstitutionScheduleVO;

/**
 * 구매관리 - 재료 치환등록 서비스 인터페이스 (송연 app.py list_material_substitution · get_production_materials ·
 * substitute_production_material · undo_substitute_production_material)
 * 그날 생산할 건의 원재료를 이번 한 번만 다른 것으로 바꿔 쓴다. 제품BOM 은 건드리지 않는다.
 * 입력이 잘못되면 IllegalArgumentException(송연과 같은 문구).
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
public interface MaterialSubstitutionService {

    /** 그날 생산확정된 건 목록(원재료 줄 없이, 바꿔 쓰는 원재료 수만). 날짜 필수 */
    List<SubstitutionScheduleVO> listSchedules(String date) throws Exception;

    /** 생산건 하나의 원재료 줄(바꿔 쓰기 반영) */
    SubstitutionDetailVO detail(long scheduleId) throws Exception;

    /** 이 생산건에서만 원재료 하나를 다른 것으로 바꿔 쓴다 → 원재료 차감을 다시 계산하고 바뀐 상세를 돌려준다 */
    SubstitutionDetailVO substitute(long scheduleId, SubstitutionRequestVO request, String userName) throws Exception;

    /** 바꿔 쓰기를 취소하고 원래 배합표대로 되돌린다 → 바뀐 상세 */
    SubstitutionDetailVO undo(long scheduleId, long subId) throws Exception;

    /** 대신 쓸 원재료 후보(코드 · 이름 · 재고) */
    List<SubstitutionMaterialVO> listMaterials() throws Exception;
}
