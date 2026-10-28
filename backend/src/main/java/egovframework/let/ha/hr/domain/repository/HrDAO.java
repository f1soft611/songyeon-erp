package egovframework.let.ha.hr.domain.repository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.ha.hr.domain.model.HrLeaveRecordVO;

/**
 * 인사·회계 - 인사관리 데이터 접근 클래스 (송연 employees · leave_records)
 * @author SONGYEON ERP
 * @since 2026.10.14
 * @version 1.0
 */
@Repository("hrDAO")
public class HrDAO extends EgovAbstractMapper {

    private static Map<String, Object> params(Object... keyValues) {
        Map<String, Object> map = new HashMap<>();
        for (int i = 0; i + 1 < keyValues.length; i += 2) {
            map.put((String) keyValues[i], keyValues[i + 1]);
        }
        return map;
    }

    private static int count(Integer n) {
        return n == null ? 0 : n;
    }

    public List<Map<String, Object>> selectEmployees() throws Exception {
        return selectList("HrDAO.selectEmployees");
    }

    /** {id, name, hireDate, department, position, resignDate, username, isAdmin, residentNoEnc} 또는 null */
    public Map<String, Object> selectEmployee(String id) throws Exception {
        return selectOne("HrDAO.selectEmployee", id);
    }

    public int countEmployeeId(String id) throws Exception {
        return count(selectOne("HrDAO.countEmployeeId", id));
    }

    /** values 의 id(사번)로 넣는다 */
    public int insertEmployee(Map<String, Object> values) throws Exception {
        return insert("HrDAO.insertEmployee", values);
    }

    public int updateEmployee(Map<String, Object> values) throws Exception {
        return update("HrDAO.updateEmployee", values);
    }

    public int countOtherUsername(String id, String username) throws Exception {
        return count(selectOne("HrDAO.countOtherUsername", params("id", id, "username", username)));
    }

    public int updateAccount(String id, String username, String passwordHash) throws Exception {
        return update("HrDAO.updateAccount", params("id", id, "username", username, "passwordHash", passwordHash));
    }

    public int countOtherAdmins(String id) throws Exception {
        return count(selectOne("HrDAO.countOtherAdmins", id));
    }

    public int revokeAccount(String id) throws Exception {
        return update("HrDAO.revokeAccount", id);
    }

    // 계정 표(tb_login_account, login_code = 사번) — 로그인 · 역할(권한관리)이 이 줄을 본다(2026-10-21)
    public int countLoginAccount(String tenantCode, String id) throws Exception {
        return count(selectOne("HrDAO.countLoginAccount", params("tenantCode", tenantCode, "id", id)));
    }

    public int upsertLoginAccount(String tenantCode, String id) throws Exception {
        return insert("HrDAO.upsertLoginAccount", params("tenantCode", tenantCode, "id", id));
    }

    public int insertDefaultRole(String tenantCode, String id) throws Exception {
        return insert("HrDAO.insertDefaultRole", params("tenantCode", tenantCode, "id", id));
    }

    public int deleteLoginAccount(String tenantCode, String id) throws Exception {
        return delete("HrDAO.deleteLoginAccount", params("tenantCode", tenantCode, "id", id));
    }

    // 사용자 표(tb_user) — 로그인 uniqId · 전자결재가 이 줄을 본다(2026-10-22)
    public int insertUserIfMissing(String tenantCode, String id) throws Exception {
        return insert("HrDAO.insertUserIfMissing", params("tenantCode", tenantCode, "id", id));
    }

    public int syncUserFromEmployee(String tenantCode, String id) throws Exception {
        return update("HrDAO.syncUserFromEmployee", params("tenantCode", tenantCode, "id", id));
    }

    public List<Map<String, Object>> selectLeavePeople() throws Exception {
        return selectList("HrDAO.selectLeavePeople");
    }

    /** 모든 연차 기록의 {employeeId, leaveDate, days} */
    public List<HrLeaveRecordVO> selectAllLeaveDays() throws Exception {
        return selectList("HrDAO.selectAllLeaveDays");
    }

    public List<HrLeaveRecordVO> selectLeaveRecords(String employeeId, String start, String end) throws Exception {
        return selectList("HrDAO.selectLeaveRecords", params("employeeId", employeeId, "start", start, "end", end));
    }

    public List<HrLeaveRecordVO> selectLeaveRecordsBefore(String employeeId, String before) throws Exception {
        return selectList("HrDAO.selectLeaveRecords", params("employeeId", employeeId, "before", before));
    }

    public double sumLeaveOnDay(String employeeId, String leaveDate) throws Exception {
        Double sum = selectOne("HrDAO.sumLeaveOnDay", params("employeeId", employeeId, "leaveDate", leaveDate));
        return sum == null ? 0 : sum;
    }

    public int insertLeave(String employeeId, String leaveDate, double days, String note, String now, String createdBy) throws Exception {
        return insert("HrDAO.insertLeave", params("employeeId", employeeId, "leaveDate", leaveDate, "days", days, "note", note, "now", now, "createdBy", createdBy));
    }

    public int deleteLeave(long id) throws Exception {
        return delete("HrDAO.deleteLeave", id);
    }
}
