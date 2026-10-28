package egovframework.let.sl.status.service;

import egovframework.let.sl.status.domain.model.SalesStatusVO;
import egovframework.let.sl.status.domain.model.SalesTotalVO;

/**
 * 판매관리 - 판매현황·토탈집계 서비스 인터페이스 클래스 (송연 sales.py)
 * @author SONGYEON ERP
 * @since 2026.10.07
 * @version 1.0
 */
public interface SalesStatusService {

    /** 판매현황: 적어둔 판매만(줄마다 지울 수 있는 관리 화면). 기간 필수. */
    SalesStatusVO listStatus(String start, String end, String clientName, String productName) throws Exception;

    /** 판매 한 줄 지우기 */
    void delete(long id) throws Exception;

    /** 토탈집계: 생산입고(들어온 것)와 판매(나간 것)를 한 표에. 같은 날이면 입고를 먼저. 기간 필수. */
    SalesTotalVO total(String start, String end, String clientName, String productName) throws Exception;
}
