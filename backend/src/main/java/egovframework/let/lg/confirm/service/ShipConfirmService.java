package egovframework.let.lg.confirm.service;

import java.util.List;

import egovframework.let.lg.confirm.domain.model.CharterSummaryVO;
import egovframework.let.lg.confirm.domain.model.ShipConfirmRequestVO;
import egovframework.let.lg.confirm.domain.model.ShipConfirmVO;

/**
 * 물류관리 - 출하확정 서비스 인터페이스 클래스 (송연 LG0002Service)
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
public interface ShipConfirmService {

    /** 그 날짜의 출하 목록: 출하등록 줄(로트 배분 포함) + 물류출고일이 적힌 생산확정 줄(출하등록이 그 로트를 가리키면 숨김) */
    List<ShipConfirmVO> listSchedule(String date) throws Exception;

    /** 운행자 칸의 자동완성(사원 이름) */
    List<String> listDriverNames() throws Exception;

    /** 출하확정: 실출하량·박스 저장 → 재고 빼기(로트별, 생산입고 전 로트는 자동 입고) → 배차·포장 등 저장 → 확정 표시. 한 트랜잭션. */
    void confirm(String source, long id, ShipConfirmRequestVO request, String userName) throws Exception;

    /** 확정취소: 뺐던 재고(와 박스)를 되돌리고 다시 고칠 수 있는 상태로 */
    void unconfirm(String source, long id, String userName) throws Exception;

    /** 기간 안 확정된 출하 중 용차를 쓴 것과 합계(일자 순) */
    CharterSummaryVO charterSummary(String start, String end) throws Exception;
}
