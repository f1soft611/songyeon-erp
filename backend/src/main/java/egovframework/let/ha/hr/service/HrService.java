package egovframework.let.ha.hr.service;

import java.util.List;
import java.util.Map;

import egovframework.let.ha.hr.domain.model.HrEmployeeVO;
import egovframework.let.ha.hr.domain.model.HrLeaveSaveVO;

/**
 * 인사·회계 - 인사관리 서비스 인터페이스 (송연 app.py 사원 · 근태(연차))
 * 사원관리(인사정보)와 로그인계정관리(아이디·비밀번호)는 같은 사람의 두 갈래라 주소를 갈라 둔다.
 * 그만둔 사람은 지우지 않는다 — 지우면 그가 만든 기록에 이름만 남고 누구인지 알 수 없다. 퇴사일을 적어 목록에서 내린다.
 * 송연은 탭마다 권한(hr · employees, 계정은 관리자만)을 봤지만 이 프로젝트는 권한 개념이 없어 누구나 한다.
 * 화면별 권한 · 상품개발 등급은 이 프로그램에서 쓰지 않으므로 고치지 않는다(같은 DB 를 쓰는 송연 원본 몫). 목록에 보여주기만 한다.
 * @author SONGYEON ERP
 * @since 2026.10.14
 * @version 1.0
 */
public interface HrService {

    /** 사원 목록. 주민번호는 가려서만(900101-1******) */
    List<HrEmployeeVO> listEmployees() throws Exception;

    /** 주민번호 전체. 누가 언제 봤는지 서버 기록에 남긴다 */
    String residentNo(String id, String viewerName) throws Exception;

    /** 사원 등록(인사정보만) → 새 id */
    String createEmployee(Map<String, Object> body) throws Exception;

    /** 인사정보 고치기(보낸 칸만) */
    void updateEmployee(String id, Map<String, Object> body) throws Exception;

    /** 아이디 · 비밀번호 정하기(비밀번호는 바꿀 때만) */
    void saveAccount(String id, String username, String password) throws Exception;

    /** 로그인 거두기(사원 줄은 남는다) */
    void revokeAccount(String id) throws Exception;

    /** 사원별 연차 갯수 · 사용 · 잔여 → {date, rows} */
    Map<String, Object> listLeave(String date) throws Exception;

    /** 한 사람의 연차 사용 내역(이번 연차연도 · 그 전) */
    Map<String, Object> leaveDetail(String employeeId, String date) throws Exception;

    void createLeave(HrLeaveSaveVO request, String createdBy) throws Exception;

    void deleteLeave(long id) throws Exception;
}
