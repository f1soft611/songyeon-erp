package egovframework.let.ha.hr.service.impl;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import egovframework.com.cmm.util.SecretsStore;
import egovframework.let.ha.hr.domain.model.HrEmployeeVO;
import egovframework.let.ha.hr.domain.model.HrLeaveRecordVO;
import egovframework.let.ha.hr.domain.model.HrLeaveSaveVO;
import egovframework.let.ha.hr.domain.model.HrLeaveSummaryVO;
import egovframework.let.ha.hr.domain.repository.HrDAO;
import egovframework.let.ha.hr.service.AnnualLeave;
import egovframework.let.ha.hr.service.HrService;
import egovframework.let.common.idsequence.service.IdSequenceService;
import egovframework.let.uat.uia.service.impl.WerkzeugPasswordVerifier;

/**
 * 인사·회계 - 인사관리 서비스 구현 클래스 (송연 app.py 와 같은 규칙)
 * @author SONGYEON ERP
 * @since 2026.10.14
 * @version 1.0
 */
@Service("hrService")
public class HrServiceImpl extends EgovAbstractServiceImpl implements HrService {

    private static final Logger LOGGER = LoggerFactory.getLogger(HrServiceImpl.class);
    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");
    private static final DateTimeFormatter ISO_SECONDS = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
    private static final DateTimeFormatter LOG_TIME = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    /** 인사정보 칸(화면 이름 → 송연 칸) */
    static final String[] HR_FIELDS = { "department", "position", "phone", "birthDate", "address", "hireDate", "resignDate", "memo" };

    static final String EMPLOYEE_ID_KEY = "EMPLOYEE_ID";
    static final String EMPLOYEE_ID_SCOPE = "ALL";
    static final int EMPLOYEE_ID_WIDTH = 8;
    /** 사원 등록 · 아이디를 처음 만들 때의 비밀번호(2026-10-21). 로그인한 뒤 내 정보에서 바꾼다 */
    static final String INITIAL_PASSWORD = "changeme";

    private final HrDAO hrDAO;
    private final IdSequenceService idSequenceService;
    private final SecretsStore secretsStore;
    private final WerkzeugPasswordVerifier passwordHasher;

    /** 계정 표(tb_login_account)의 테넌트 코드. 로그인(EgovLoginServiceImpl)과 같은 설정값 */
    @Value("${Globals.songyeon.tenantCode:SONGYEON}")
    private String songyeonTenantCode = "SONGYEON";

    // 비밀번호는 송연 employees.password_hash 와 같은 Werkzeug 해시로 만든다(로그인 화면이 같은 방식으로 확인한다)
    public HrServiceImpl(HrDAO hrDAO, SecretsStore secretsStore, WerkzeugPasswordVerifier passwordHasher,
            IdSequenceService idSequenceService) {
        this.idSequenceService = idSequenceService;
        this.hrDAO = hrDAO;
        this.secretsStore = secretsStore;
        this.passwordHasher = passwordHasher;
    }

    // ===== 사원 =====

    @Override
    public List<HrEmployeeVO> listEmployees() throws Exception {
        List<HrEmployeeVO> rows = new ArrayList<>();
        for (Map<String, Object> r : hrDAO.selectEmployees()) {
            HrEmployeeVO e = new HrEmployeeVO();
            e.setId(String.valueOf(r.get("id")));
            e.setName((String) r.get("name"));
            e.setDepartment((String) r.get("department"));
            e.setPosition((String) r.get("position"));
            e.setPhone((String) r.get("phone"));
            e.setBirthDate((String) r.get("birthDate"));
            e.setAddress((String) r.get("address"));
            e.setHireDate((String) r.get("hireDate"));
            e.setResignDate((String) r.get("resignDate"));
            e.setMemo((String) r.get("memo"));
            e.setUsername((String) r.get("username"));
            e.setCreatedAt((String) r.get("createdAt"));
            e.setHasLogin(hasText(e.getUsername()));
            // 주민번호는 가려서만 보낸다. 잠긴 값도 안 내보낸다 — 잠겨 있어도 브라우저까지 갈 까닭이 없다
            String enc = (String) r.get("residentNoEnc");
            e.setHasResidentNo(hasText(enc));
            e.setResidentNoMasked(maskResidentNo(unlock(enc)));
            Object admin = r.get("isAdmin");
            e.setAdmin(admin instanceof Number && ((Number) admin).intValue() != 0);
            e.setPermissionCount(permissionCount((String) r.get("permissions")));
            rows.add(e);
        }
        return rows;
    }

    /** 송연 permissions 칸(JSON 배열 글자)의 항목 수. 비었거나 못 읽으면 0 */
    static int permissionCount(String json) {
        if (!hasText(json)) {
            return 0;
        }
        try {
            com.fasterxml.jackson.databind.JsonNode node = new com.fasterxml.jackson.databind.ObjectMapper().readTree(json);
            return node != null && node.isArray() ? node.size() : 0;
        } catch (java.io.IOException ex) {
            return 0;
        }
    }

    /** 900101-1****** 로 가린다. 뒤 6자리는 아예 안 보낸다 */
    static String maskResidentNo(String plain) {
        String digits = plain == null ? "" : plain.replaceAll("\\D", "");
        if (digits.length() < 7) {
            return null;
        }
        return digits.substring(0, 6) + "-" + digits.charAt(6) + "******";
    }

    private String unlock(String enc) {
        if (!hasText(enc)) {
            return null;
        }
        try {
            String plain = secretsStore.unlock(enc);
            return hasText(plain) ? plain : null;
        } catch (RuntimeException ex) {
            return null;
        }
    }

    @Override
    public String residentNo(String id, String viewerName) throws Exception {
        Map<String, Object> row = hrDAO.selectEmployee(id);
        if (row == null) {
            throw new IllegalArgumentException("사원을 찾을 수 없습니다");
        }
        String plain = unlock((String) row.get("residentNoEnc"));
        if (plain == null) {
            throw new IllegalArgumentException("적혀 있지 않아요");
        }
        // 누가 언제 꺼내봤는지 남긴다. 남기지 않으면 새어나갔을 때 어디서 샜는지 알 수 없다(번호는 남기지 않는다)
        LOGGER.info("[주민번호조회] {} 본 사람={} 대상={}", LocalDateTime.now(SEOUL).format(LOG_TIME), viewerName, row.get("name"));
        return plain;
    }

    @Override
    public String createEmployee(Map<String, Object> body) throws Exception {
        Map<String, Object> b = body == null ? new HashMap<String, Object>() : body;
        String name = trim(b.get("name"));
        if (name.isEmpty()) {
            throw new IllegalArgumentException("이름은 필수입니다");
        }
        Map<String, Object> values = new HashMap<>();
        values.put("name", name);
        values.put("now", LocalDateTime.now(SEOUL).format(ISO_SECONDS));
        for (String f : HR_FIELDS) {
            values.put(f, cleanField(b.get(f)));
        }
        String rrn = digits(b.get("residentNo"));
        if (!rrn.isEmpty()) {
            if (rrn.length() != 13) {
                throw new IllegalArgumentException("주민등록번호는 13자리로 적어주세요");
            }
            values.put("residentNoEnc", lock(rrn));
        }
        // 등록하면 로그인 계정도 함께 만든다(2026-10-21): username = 이름, 첫 비밀번호 changeme, 일반 사용자 역할.
        // username 은 겹칠 수 없고(UNIQUE) 메뉴 권한 · 내 정보가 username 으로 사람을 찾아서, 같은 이름이면 막는다
        if (hrDAO.countOtherUsername("", name) > 0) {
            throw new IllegalArgumentException("같은 이름의 사원이 이미 있어요. 이름 뒤에 구분을 붙여 주세요(예: 김민수B)");
        }
        values.put("username", name);
        values.put("passwordHash", passwordHasher.encode(INITIAL_PASSWORD));
        String id = nextEmployeeId();
        values.put("id", id);
        hrDAO.insertEmployee(values);
        hrDAO.upsertLoginAccount(songyeonTenantCode, id);
        hrDAO.insertDefaultRole(songyeonTenantCode, id);
        // 전자결재 사용자(tb_user): 로그인 uniqId 가 이 번호다(2026-10-22)
        hrDAO.insertUserIfMissing(songyeonTenantCode, id);
        return id;
    }

    // 새 사번: 8자리 번호(00000001 …, 번호표 tb_id_sequence). 이미 있는 사번(예: 0000)과 겹치면 다음 번호로 넘어간다
    private String nextEmployeeId() throws Exception {
        for (int tries = 0; tries < 1000; tries++) {
            String id = formatEmployeeId(idSequenceService.nextValue(EMPLOYEE_ID_KEY, EMPLOYEE_ID_SCOPE, EMPLOYEE_ID_SCOPE));
            if (hrDAO.countEmployeeId(id) == 0) {
                return id;
            }
        }
        throw new IllegalStateException("사번을 만들지 못했습니다");
    }

    static String formatEmployeeId(Long value) {
        StringBuilder digits = new StringBuilder(String.valueOf(value));
        while (digits.length() < EMPLOYEE_ID_WIDTH) {
            digits.insert(0, '0');
        }
        return digits.toString();
    }

    @Override
    public void updateEmployee(String id, Map<String, Object> body) throws Exception {
        Map<String, Object> b = body == null ? new HashMap<String, Object>() : body;
        String name = trim(b.get("name"));
        if (name.isEmpty()) {
            throw new IllegalArgumentException("이름은 필수입니다");
        }
        if (hrDAO.selectEmployee(id) == null) {
            throw new IllegalArgumentException("사원을 찾을 수 없습니다");
        }
        Map<String, Object> values = new HashMap<>();
        values.put("id", id);
        values.put("name", name);
        // 주민번호는 보낸 때만 바꾼다. 화면이 가린 값(900101-1******)을 그대로 돌려보내는 일이 있어서 별표가 섞여 있으면 안 건드린다
        values.put("setResidentNo", false);
        if (b.containsKey("residentNo")) {
            String raw = trim(b.get("residentNo"));
            if (raw.isEmpty()) {
                values.put("setResidentNo", true);
                values.put("residentNoEnc", null);
            } else if (!raw.contains("*")) {
                String rrn = raw.replaceAll("\\D", "");
                if (rrn.length() != 13) {
                    throw new IllegalArgumentException("주민등록번호는 13자리로 적어주세요");
                }
                values.put("setResidentNo", true);
                values.put("residentNoEnc", lock(rrn));
            }
        }
        for (String f : HR_FIELDS) {
            values.put("has_" + f, b.containsKey(f));
            values.put(f, cleanField(b.get(f)));
        }
        hrDAO.updateEmployee(values);
        // 전자결재 사용자(tb_user) 이름 · 사용 여부를 맞춘다(2026-10-22)
        hrDAO.syncUserFromEmployee(songyeonTenantCode, id);
    }

    private String lock(String plain) {
        try {
            return secretsStore.lock(plain);
        } catch (IllegalStateException ex) {
            throw new IllegalArgumentException("프로그램 비밀키가 없어 주민등록번호를 잠가 넣을 수 없어요. 서버 설정을 확인해주세요");
        }
    }

    @Override
    public void saveAccount(String id, String usernameValue, String password) throws Exception {
        String username = usernameValue == null ? "" : usernameValue.trim();
        if (username.isEmpty()) {
            throw new IllegalArgumentException("로그인아이디를 적어주세요");
        }
        Map<String, Object> row = hrDAO.selectEmployee(id);
        if (row == null) {
            throw new IllegalArgumentException("사원을 찾을 수 없습니다");
        }
        if (hrDAO.countOtherUsername(id, username) > 0) {
            throw new IllegalArgumentException("이미 사용 중인 로그인아이디입니다");
        }
        // 아이디가 아예 없던 사람에게 처음 만들어 주는 것이면 비밀번호는 changeme 로 정한다(보낸 값은 쓰지 않음)
        boolean firstLogin = !hasText((String) row.get("username"));
        String pw = firstLogin ? INITIAL_PASSWORD : (password == null ? "" : password);
        hrDAO.updateAccount(id, username, pw.isEmpty() ? null : passwordHasher.encode(pw));
        // 로그인 · 권한관리는 계정 표를 본다: 같은 비밀번호로 계정 줄을 만들거나 고친다.
        // 처음 만든 계정에는 일반 사용자 역할을 붙인다(역할이 없으면 로그인은 되지만 메뉴가 없다)
        boolean newAccount = hrDAO.countLoginAccount(songyeonTenantCode, id) == 0;
        hrDAO.upsertLoginAccount(songyeonTenantCode, id);
        if (newAccount) {
            hrDAO.insertDefaultRole(songyeonTenantCode, id);
        }
        hrDAO.insertUserIfMissing(songyeonTenantCode, id);
    }

    @Override
    public void revokeAccount(String id) throws Exception {
        Map<String, Object> row = hrDAO.selectEmployee(id);
        if (row == null) {
            throw new IllegalArgumentException("사원을 찾을 수 없습니다");
        }
        Object admin = row.get("isAdmin");
        if (admin instanceof Number && ((Number) admin).intValue() != 0 && hrDAO.countOtherAdmins(id) == 0) {
            throw new IllegalArgumentException("마지막 관리자 계정이에요. 이걸 거두면 아무도 못 들어옵니다");
        }
        hrDAO.revokeAccount(id);
        hrDAO.deleteLoginAccount(songyeonTenantCode, id);
    }

    // ===== 연차 =====

    @Override
    public Map<String, Object> listLeave(String date) throws Exception {
        LocalDate asOf = asOf(date);
        Map<String, List<HrLeaveRecordVO>> byEmployee = new HashMap<>();
        for (HrLeaveRecordVO r : hrDAO.selectAllLeaveDays()) {
            byEmployee.computeIfAbsent(r.getEmployeeId(), k -> new ArrayList<HrLeaveRecordVO>()).add(r);
        }
        List<HrLeaveSummaryVO> rows = new ArrayList<>();
        for (Map<String, Object> p : hrDAO.selectLeavePeople()) {
            String eid = String.valueOf(p.get("id"));
            rows.add(summarize(p, asOf, byEmployee.getOrDefault(eid, new ArrayList<HrLeaveRecordVO>())));
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("date", asOf.toString());
        result.put("rows", rows);
        return result;
    }

    /** 사원 한 줄: 셀 수 없으면 그 까닭을 적는다(0 으로 채우면 '연차가 없는 사람' 으로 읽혀 왜 그런지 알 수 없다) */
    static HrLeaveSummaryVO summarize(Map<String, Object> person, LocalDate asOf, List<HrLeaveRecordVO> records) {
        HrLeaveSummaryVO row = new HrLeaveSummaryVO();
        row.setEmployeeId(String.valueOf(person.get("id")));
        row.setName((String) person.get("name"));
        row.setDepartment((String) person.get("department"));
        row.setPosition((String) person.get("position"));
        String hireDate = (String) person.get("hireDate");
        row.setHireDate(hireDate);
        row.setResignDate((String) person.get("resignDate"));
        LocalDate hire = AnnualLeave.parse(hireDate);
        AnnualLeave.Entitlement info = hire == null ? null : AnnualLeave.entitlement(hire, asOf);
        if (info == null) {
            row.setCountable(false);
            row.setReason(!hasText(hireDate) ? "입사일이 없어요" : hire == null ? "입사일을 읽을 수 없어요" : "아직 입사 전이에요");
            return row;
        }
        double used = 0;
        for (HrLeaveRecordVO r : records) {
            if (info.contains(r.getLeaveDate())) {
                used += r.getDays() == null ? 0 : r.getDays();
            }
        }
        fill(row, info, used);
        return row;
    }

    private static void fill(HrLeaveSummaryVO row, AnnualLeave.Entitlement info, double used) {
        row.setCountable(true);
        row.setYearsOfService(info.getYearsOfService());
        row.setYearStart(info.getYearStart());
        row.setYearEnd(info.getYearEnd());
        row.setEntitledDays(info.getEntitledDays());
        row.setAccruing(info.isAccruing());
        row.setUsedDays(used);
        row.setRemainingDays(info.getEntitledDays() - used);
    }

    @Override
    public Map<String, Object> leaveDetail(String employeeId, String date) throws Exception {
        LocalDate asOf = asOf(date);
        Map<String, Object> person = hrDAO.selectEmployee(employeeId);
        if (person == null) {
            throw new IllegalArgumentException("그런 사원이 없어요");
        }
        LocalDate hire = AnnualLeave.parse((String) person.get("hireDate"));
        AnnualLeave.Entitlement info = hire == null ? null : AnnualLeave.entitlement(hire, asOf);
        if (info == null) {
            throw new IllegalArgumentException("입사일이 없어서 연차를 셀 수 없어요. 사원관리에서 입사일을 넣어주세요");
        }
        List<HrLeaveRecordVO> thisYear = hrDAO.selectLeaveRecords(employeeId, info.getYearStart(), info.getYearEnd());
        List<HrLeaveRecordVO> earlier = hrDAO.selectLeaveRecordsBefore(employeeId, info.getYearStart());
        double used = 0;
        for (HrLeaveRecordVO r : thisYear) {
            used += r.getDays() == null ? 0 : r.getDays();
        }
        HrLeaveSummaryVO head = new HrLeaveSummaryVO();
        fill(head, info, used);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("employeeId", employeeId);
        result.put("name", person.get("name"));
        result.put("department", person.get("department"));
        result.put("position", person.get("position"));
        result.put("hireDate", person.get("hireDate"));
        result.put("resignDate", person.get("resignDate"));
        result.put("date", asOf.toString());
        result.put("yearsOfService", head.getYearsOfService());
        result.put("yearStart", head.getYearStart());
        result.put("yearEnd", head.getYearEnd());
        result.put("entitledDays", head.getEntitledDays());
        result.put("accruing", head.getAccruing());
        result.put("usedDays", used);
        result.put("remainingDays", head.getRemainingDays());
        result.put("rows", thisYear);
        result.put("earlierRows", earlier);
        return result;
    }

    @Override
    public void createLeave(HrLeaveSaveVO request, String createdBy) throws Exception {
        String eidText = request.getEmployeeId() == null ? "" : String.valueOf(request.getEmployeeId()).trim();
        String leaveDate = request.getLeaveDate() == null ? "" : request.getLeaveDate().trim();
        double days = toDouble(request.getDays());
        String note = request.getNote() == null ? "" : request.getNote().trim();
        if (eidText.isEmpty()) {
            throw new IllegalArgumentException("사원을 골라주세요");
        }
        if (!leaveDate.matches("^\\d{4}-\\d{2}-\\d{2}$")) {
            throw new IllegalArgumentException("날짜를 골라주세요");
        }
        if (days != 0.5 && days != 1.0) {
            throw new IllegalArgumentException("연차(하루) 또는 반차(반나절)만 넣을 수 있어요");
        }
        String eid = eidText;
        Map<String, Object> person = hrDAO.selectEmployee(eid);
        if (person == null) {
            throw new IllegalArgumentException("그런 사원이 없어요");
        }
        String hireDate = (String) person.get("hireDate");
        if (!hasText(hireDate)) {
            throw new IllegalArgumentException(person.get("name") + " 님의 입사일이 없어요. 사원관리에서 먼저 넣어주세요");
        }
        LocalDate hire = AnnualLeave.parse(hireDate);
        LocalDate day = AnnualLeave.parse(leaveDate);
        if (day == null) {
            throw new IllegalArgumentException("날짜를 골라주세요");
        }
        if (hire == null || AnnualLeave.entitlement(hire, day) == null) {
            throw new IllegalArgumentException("입사일(" + hireDate + ") 보다 앞선 날짜예요");
        }
        // 같은 날에 이미 넣은 것이 있으면 막는다. 반차 두 번은 하루가 되므로 합이 하루를 넘길 때만 막는다
        double sameDay = hrDAO.sumLeaveOnDay(eid, leaveDate);
        if (sameDay + days > 1.0001) {
            throw new IllegalArgumentException(leaveDate + " 에 이미 " + daysText(sameDay) + "일이 들어 있어요. 하루를 넘길 수 없어요");
        }
        hrDAO.insertLeave(eid, leaveDate, days, note.isEmpty() ? null : note, LocalDateTime.now(SEOUL).format(ISO_SECONDS), createdBy);
    }

    @Override
    public void deleteLeave(long id) throws Exception {
        hrDAO.deleteLeave(id);
    }

    /** 파이썬 f"{x:g}": 0.5 → '0.5', 1.0 → '1' */
    static String daysText(double value) {
        return value == Math.rint(value) ? String.valueOf((long) value) : String.valueOf(value);
    }

    private static LocalDate asOf(String date) {
        String d = date == null ? "" : date.trim();
        if (d.isEmpty()) {
            return LocalDate.now(SEOUL);
        }
        LocalDate parsed = AnnualLeave.parse(d);
        if (parsed == null) {
            throw new IllegalArgumentException("기준일을 'YYYY-MM-DD' 로 넣어주세요");
        }
        return parsed;
    }

    /** 송연: 글자면 앞뒤 공백을 떼고 비면 null, 글자가 아니면 그대로 */
    static Object cleanField(Object value) {
        if (value instanceof String) {
            String s = ((String) value).trim();
            return s.isEmpty() ? null : s;
        }
        return value;
    }

    private static double toDouble(Object value) {
        if (value instanceof Number) {
            return ((Number) value).doubleValue();
        }
        try {
            return Double.parseDouble(String.valueOf(value).trim());
        } catch (RuntimeException ex) {
            return 0;
        }
    }

    private static String digits(Object value) {
        return value == null ? "" : String.valueOf(value).replaceAll("\\D", "");
    }

    private static String trim(Object value) {
        return value == null ? "" : String.valueOf(value).trim();
    }

    private static boolean hasText(String value) {
        return value != null && !value.isEmpty();
    }
}
