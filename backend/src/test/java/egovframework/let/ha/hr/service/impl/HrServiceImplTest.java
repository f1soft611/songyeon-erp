package egovframework.let.ha.hr.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.times;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.ArgumentMatchers.startsWith;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import egovframework.com.cmm.util.SecretsStore;
import egovframework.let.ha.hr.domain.model.HrEmployeeVO;
import egovframework.let.ha.hr.domain.model.HrLeaveRecordVO;
import egovframework.let.ha.hr.domain.model.HrLeaveSaveVO;
import egovframework.let.ha.hr.domain.model.HrLeaveSummaryVO;
import egovframework.let.ha.hr.domain.repository.HrDAO;
import egovframework.let.common.idsequence.service.IdSequenceService;
import egovframework.let.ha.hr.service.AnnualLeave;
import egovframework.let.uat.uia.service.impl.WerkzeugPasswordVerifier;

class HrServiceImplTest {

    private static final SecretsStore STORE = new SecretsStore("test-secret-key", "");

    private static Map<String, Object> person(long id, String name, String hire) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", String.valueOf(id)); // 사번은 글자
        m.put("name", name);
        m.put("hireDate", hire);
        return m;
    }

    private static HrLeaveRecordVO leave(String date, double days) {
        HrLeaveRecordVO r = new HrLeaveRecordVO();
        r.setLeaveDate(date);
        r.setDays(days);
        return r;
    }

    private static LocalDate d(String s) {
        return LocalDate.parse(s);
    }

    @DisplayName("연차 일수(근로기준법 60조): 첫 해 달마다 하루(최대 11), 1년 15일, 3년부터 2년마다 하루, 최대 25, 2월 29일 입사")
    @Test
    void entitlement() {
        AnnualLeave.Entitlement first = AnnualLeave.entitlement(d("2026-03-15"), d("2026-09-09"));
        assertEquals(0, first.getYearsOfService());
        assertEquals(5.0, first.getEntitledDays());
        assertTrue(first.isAccruing());
        assertEquals("2026-03-15", first.getYearStart());
        assertEquals("2027-03-14", first.getYearEnd());
        assertEquals(11.0, AnnualLeave.entitlement(d("2025-03-15"), d("2026-03-14")).getEntitledDays());
        AnnualLeave.Entitlement one = AnnualLeave.entitlement(d("2025-03-15"), d("2026-03-15"));
        assertEquals(1, one.getYearsOfService());
        assertEquals(15.0, one.getEntitledDays());
        assertFalse(one.isAccruing());
        assertEquals(15.0, AnnualLeave.entitlement(d("2023-03-15"), d("2026-03-14")).getEntitledDays()); // 2년차
        assertEquals(16.0, AnnualLeave.entitlement(d("2023-03-15"), d("2026-03-15")).getEntitledDays()); // 3년
        assertEquals(17.0, AnnualLeave.entitlement(d("2021-03-15"), d("2026-03-15")).getEntitledDays()); // 5년
        assertEquals(25.0, AnnualLeave.entitlement(d("1990-01-01"), d("2026-10-14")).getEntitledDays());
        assertNull(AnnualLeave.entitlement(d("2026-11-01"), d("2026-10-14")));
        AnnualLeave.Entitlement leap = AnnualLeave.entitlement(d("2024-02-29"), d("2025-03-01"));
        assertEquals("2025-02-28", leap.getYearStart());
        assertEquals("2026-02-27", leap.getYearEnd());
    }

    @DisplayName("연차 목록 한 줄: 입사일 없음 · 입사 전은 까닭, 이번 연차연도에 쓴 것만 사용으로")
    @Test
    void summarize() {
        HrLeaveSummaryVO none = HrServiceImpl.summarize(person(1, "가", null), d("2026-10-14"), Collections.<HrLeaveRecordVO>emptyList());
        assertFalse(none.isCountable());
        assertEquals("입사일이 없어요", none.getReason());
        assertEquals("아직 입사 전이에요", HrServiceImpl.summarize(person(1, "가", "2026-11-01"), d("2026-10-14"), Collections.<HrLeaveRecordVO>emptyList()).getReason());
        HrLeaveSummaryVO row = HrServiceImpl.summarize(person(2, "나", "2024-03-15"), d("2026-10-14"),
                Arrays.asList(leave("2026-03-14", 1), leave("2026-03-15", 0.5), leave("2026-10-01", 1)));
        assertTrue(row.isCountable());
        assertEquals("2026-03-15", row.getYearStart());
        assertEquals(15.0, row.getEntitledDays());
        assertEquals(1.5, row.getUsedDays());
        assertEquals(13.5, row.getRemainingDays());
    }

    @DisplayName("사원 등록 · 고치기: 이름 필수, 등록하면 계정(username = 이름 · changeme · 일반 사용자), 같은 이름은 막음, 주민번호 13자리 · 잠가서 넣음, 별표가 섞이면 그대로, 비우면 지움, 보낸 칸만")
    @Test
    @SuppressWarnings("unchecked")
    void employees() throws Exception {
        HrDAO dao = mock(HrDAO.class);
        IdSequenceService seq = mock(IdSequenceService.class);
        WerkzeugPasswordVerifier hasher = new WerkzeugPasswordVerifier();
        HrServiceImpl service = new HrServiceImpl(dao, STORE, hasher, seq);
        Map<String, Object> body = new HashMap<>();
        body.put("name", " ");
        assertEquals("이름은 필수입니다", assertThrows(IllegalArgumentException.class, () -> service.createEmployee(body)).getMessage());
        body.put("name", " 김연구 ");
        body.put("department", " 연구소 ");
        body.put("phone", "");
        body.put("residentNo", "900101-123456");
        assertEquals("주민등록번호는 13자리로 적어주세요", assertThrows(IllegalArgumentException.class, () -> service.createEmployee(body)).getMessage());
        body.put("residentNo", "900101-1234567");
        when(seq.nextValue("EMPLOYEE_ID", "ALL", "ALL")).thenReturn(7L);
        assertEquals("00000007", service.createEmployee(body)); // 새 사번: 8자리 자동 번호
        ArgumentCaptor<Map<String, Object>> cap = ArgumentCaptor.forClass(Map.class);
        verify(dao).insertEmployee(cap.capture());
        assertEquals("00000007", cap.getValue().get("id"));
        assertEquals("김연구", cap.getValue().get("name"));
        assertEquals("연구소", cap.getValue().get("department"));
        assertNull(cap.getValue().get("phone"));
        String enc = (String) cap.getValue().get("residentNoEnc");
        assertTrue(enc.startsWith("enc:"));
        assertEquals("9001011234567", STORE.unlock(enc));
        // 2026-10-21 등록하면 로그인 계정도: username = 이름, 첫 비밀번호 changeme, 계정 표 + 일반 사용자 역할
        assertEquals("김연구", cap.getValue().get("username"));
        assertTrue(hasher.matches("changeme", (String) cap.getValue().get("passwordHash")));
        verify(dao).upsertLoginAccount("SONGYEON", "00000007");
        verify(dao).insertDefaultRole("SONGYEON", "00000007");
        // 같은 이름(= 같은 username)이 있으면 막고 아무것도 넣지 않는다
        when(dao.countOtherUsername("", "김연구")).thenReturn(1);
        assertEquals("같은 이름의 사원이 이미 있어요. 이름 뒤에 구분을 붙여 주세요(예: 김민수B)",
                assertThrows(IllegalArgumentException.class, () -> service.createEmployee(body)).getMessage());
        verify(dao, times(1)).insertEmployee(org.mockito.ArgumentMatchers.anyMap());
        verify(dao, times(1)).upsertLoginAccount(org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyString());

        when(dao.selectEmployee("7")).thenReturn(person(7, "김연구", null));
        Map<String, Object> upd = new HashMap<>();
        upd.put("name", "김연구");
        upd.put("residentNo", "900101-1******");
        upd.put("hireDate", "2026-03-15");
        service.updateEmployee("7", upd);
        ArgumentCaptor<Map<String, Object>> u = ArgumentCaptor.forClass(Map.class);
        verify(dao).updateEmployee(u.capture());
        assertEquals(false, u.getValue().get("setResidentNo"));
        assertEquals(true, u.getValue().get("has_hireDate"));
        assertEquals(false, u.getValue().get("has_department"));
        upd.put("residentNo", "");
        service.updateEmployee("7", upd);
        upd.put("residentNo", "12");
        assertEquals("주민등록번호는 13자리로 적어주세요", assertThrows(IllegalArgumentException.class, () -> service.updateEmployee("7", upd)).getMessage());
        upd.put("name", "김연구");
        when(dao.selectEmployee("99")).thenReturn(null);
        assertEquals("사원을 찾을 수 없습니다", assertThrows(IllegalArgumentException.class, () -> service.updateEmployee("99", upd)).getMessage());
        assertEquals("900101-1******", HrServiceImpl.maskResidentNo("9001011234567"));
        assertNull(HrServiceImpl.maskResidentNo("123"));
    }

    @DisplayName("목록: 주민번호는 가린 값만, 아이디 유무, 비밀키가 없으면 비밀번호 없이 저장 못 함")
    @Test
    void listAndNoKey() throws Exception {
        HrDAO dao = mock(HrDAO.class);
        IdSequenceService seq = mock(IdSequenceService.class);
        HrServiceImpl service = new HrServiceImpl(dao, STORE, new WerkzeugPasswordVerifier(), seq);
        Map<String, Object> row = person(1, "관리자", "2020-01-01");
        row.put("username", "admin");
        row.put("residentNoEnc", STORE.lock("9001011234567"));
        row.put("permissions", "[\"po\", \"recv\", \"hr\"]");
        row.put("isAdmin", 1);
        when(dao.selectEmployees()).thenReturn(Collections.singletonList(row));
        HrEmployeeVO e = service.listEmployees().get(0);
        assertTrue(e.isHasLogin());
        assertTrue(e.isHasResidentNo());
        assertEquals("900101-1******", e.getResidentNoMasked());
        // 권한은 보여주기만: 관리자 표시 · 화면 수(송연 '3개 화면')
        assertTrue(e.isAdmin());
        assertEquals(3, e.getPermissionCount());
        assertEquals(0, HrServiceImpl.permissionCount(null));
        assertEquals(0, HrServiceImpl.permissionCount("깨진값"));
        when(dao.selectEmployee("1")).thenReturn(row);
        assertEquals("9001011234567", service.residentNo("1", "관리자"));
        when(dao.selectEmployee("2")).thenReturn(person(2, "나", null));
        assertEquals("적혀 있지 않아요", assertThrows(IllegalArgumentException.class, () -> service.residentNo("2", "관리자")).getMessage());

        HrServiceImpl noKey = new HrServiceImpl(dao, new SecretsStore("", ""), new WerkzeugPasswordVerifier(), seq);
        Map<String, Object> body = new HashMap<>();
        body.put("name", "가");
        body.put("residentNo", "9001011234567");
        assertEquals("프로그램 비밀키가 없어 주민등록번호를 잠가 넣을 수 없어요. 서버 설정을 확인해주세요",
                assertThrows(IllegalArgumentException.class, () -> noKey.createEmployee(body)).getMessage());
    }

    @DisplayName("로그인계정: 아이디 필수 · 중복, 처음엔 비밀번호 changeme, 비밀번호는 Werkzeug 해시(바꿀 때만), 마지막 관리자는 못 거둠, 계정 표 같이 만들기 · 지우기")
    @Test
    void accounts() throws Exception {
        HrDAO dao = mock(HrDAO.class);
        IdSequenceService seq = mock(IdSequenceService.class);
        WerkzeugPasswordVerifier hasher = new WerkzeugPasswordVerifier();
        HrServiceImpl service = new HrServiceImpl(dao, STORE, hasher, seq);
        assertEquals("로그인아이디를 적어주세요", assertThrows(IllegalArgumentException.class, () -> service.saveAccount("1", " ", "pw")).getMessage());
        when(dao.selectEmployee("1")).thenReturn(person(1, "나", null));
        when(dao.countOtherUsername("1", "dup")).thenReturn(1);
        assertEquals("이미 사용 중인 로그인아이디입니다", assertThrows(IllegalArgumentException.class, () -> service.saveAccount("1", "dup", "pw")).getMessage());
        // 처음 만들면 비밀번호는 changeme(보낸 값은 쓰지 않는다, 2026-10-21)
        service.saveAccount("1", " na ", "secret1");
        ArgumentCaptor<String> hash = ArgumentCaptor.forClass(String.class);
        verify(dao).updateAccount(eq("1"), eq("na"), hash.capture());
        assertTrue(hash.getValue().startsWith("scrypt:32768:8:1$"));
        assertTrue(hasher.matches("changeme", hash.getValue()));
        assertFalse(hasher.matches("secret1", hash.getValue()));
        // 계정 표: 처음 만든 계정은 계정 줄 + 일반 사용자 역할(2026-10-21)
        verify(dao).upsertLoginAccount("SONGYEON", "1");
        verify(dao).insertDefaultRole("SONGYEON", "1");
        Map<String, Object> has = person(2, "다", null);
        has.put("username", "da");
        when(dao.selectEmployee("2")).thenReturn(has);
        when(dao.countLoginAccount("SONGYEON", "2")).thenReturn(1);
        service.saveAccount("2", "da", "");
        verify(dao).updateAccount(eq("2"), eq("da"), isNull());
        // 이미 있는 계정은 적은 비밀번호로 바꾼다
        service.saveAccount("2", "da", "newpass12");
        ArgumentCaptor<String> changed = ArgumentCaptor.forClass(String.class);
        verify(dao, times(2)).updateAccount(eq("2"), eq("da"), changed.capture());
        assertTrue(hasher.matches("newpass12", changed.getAllValues().get(1)));
        // 이미 있는 계정: 계정 줄만 고치고 역할은 건드리지 않는다
        verify(dao, times(2)).upsertLoginAccount("SONGYEON", "2");
        verify(dao, never()).insertDefaultRole("SONGYEON", "2");

        Map<String, Object> admin = person(3, "관리자", null);
        admin.put("isAdmin", 1);
        when(dao.selectEmployee("3")).thenReturn(admin);
        assertEquals("마지막 관리자 계정이에요. 이걸 거두면 아무도 못 들어옵니다", assertThrows(IllegalArgumentException.class, () -> service.revokeAccount("3")).getMessage());
        verify(dao, never()).revokeAccount("3");
        verify(dao, never()).deleteLoginAccount("SONGYEON", "3");
        service.revokeAccount("2");
        verify(dao).revokeAccount("2");
        verify(dao).deleteLoginAccount("SONGYEON", "2");
    }

    @DisplayName("연차 등록: 사원 · 날짜 · 종류(1·0.5), 입사일 없음 · 입사 전, 같은 날 하루 넘김 막기")
    @Test
    void createLeave() throws Exception {
        HrDAO dao = mock(HrDAO.class);
        IdSequenceService seq = mock(IdSequenceService.class);
        HrServiceImpl service = new HrServiceImpl(dao, STORE, new WerkzeugPasswordVerifier(), seq);
        HrLeaveSaveVO r = new HrLeaveSaveVO();
        r.setLeaveDate("2026-10-14");
        r.setDays(1);
        assertEquals("사원을 골라주세요", assertThrows(IllegalArgumentException.class, () -> service.createLeave(r, "관리자")).getMessage());
        r.setEmployeeId(5);
        r.setLeaveDate("2026/10/14");
        assertEquals("날짜를 골라주세요", assertThrows(IllegalArgumentException.class, () -> service.createLeave(r, "관리자")).getMessage());
        r.setLeaveDate("2026-10-14");
        r.setDays("2");
        assertEquals("연차(하루) 또는 반차(반나절)만 넣을 수 있어요", assertThrows(IllegalArgumentException.class, () -> service.createLeave(r, "관리자")).getMessage());
        r.setDays("0.5");
        when(dao.selectEmployee("5")).thenReturn(null);
        assertEquals("그런 사원이 없어요", assertThrows(IllegalArgumentException.class, () -> service.createLeave(r, "관리자")).getMessage());
        when(dao.selectEmployee("5")).thenReturn(person(5, "김연구", null));
        assertEquals("김연구 님의 입사일이 없어요. 사원관리에서 먼저 넣어주세요", assertThrows(IllegalArgumentException.class, () -> service.createLeave(r, "관리자")).getMessage());
        when(dao.selectEmployee("5")).thenReturn(person(5, "김연구", "2026-11-01"));
        assertEquals("입사일(2026-11-01) 보다 앞선 날짜예요", assertThrows(IllegalArgumentException.class, () -> service.createLeave(r, "관리자")).getMessage());
        when(dao.selectEmployee("5")).thenReturn(person(5, "김연구", "2026-03-15"));
        when(dao.sumLeaveOnDay("5", "2026-10-14")).thenReturn(1.0);
        assertEquals("2026-10-14 에 이미 1일이 들어 있어요. 하루를 넘길 수 없어요", assertThrows(IllegalArgumentException.class, () -> service.createLeave(r, "관리자")).getMessage());
        verify(dao, never()).insertLeave(anyString(), anyString(), anyDouble(), any(), anyString(), any());
        when(dao.sumLeaveOnDay("5", "2026-10-14")).thenReturn(0.5);
        r.setNote(" ");
        service.createLeave(r, "관리자");
        verify(dao).insertLeave(eq("5"), eq("2026-10-14"), eq(0.5), isNull(), startsWith("2026-"), eq("관리자"));
        assertEquals("0.5", HrServiceImpl.daysText(0.5));
    }

    @DisplayName("연차 상세: 없는 사원 · 입사일 없음, 이번 연차연도 사용 합계")
    @Test
    void leaveDetail() throws Exception {
        HrDAO dao = mock(HrDAO.class);
        IdSequenceService seq = mock(IdSequenceService.class);
        HrServiceImpl service = new HrServiceImpl(dao, STORE, new WerkzeugPasswordVerifier(), seq);
        when(dao.selectEmployee("9")).thenReturn(null);
        assertEquals("그런 사원이 없어요", assertThrows(IllegalArgumentException.class, () -> service.leaveDetail("9", "2026-10-14")).getMessage());
        when(dao.selectEmployee("5")).thenReturn(person(5, "김연구", null));
        assertEquals("입사일이 없어서 연차를 셀 수 없어요. 사원관리에서 입사일을 넣어주세요", assertThrows(IllegalArgumentException.class, () -> service.leaveDetail("5", "")).getMessage());
        when(dao.selectEmployee("5")).thenReturn(person(5, "김연구", "2026-03-15"));
        List<HrLeaveRecordVO> rows = Arrays.asList(leave("2026-10-01", 1), leave("2026-09-01", 0.5));
        when(dao.selectLeaveRecords("5", "2026-03-15", "2027-03-14")).thenReturn(rows);
        Map<String, Object> detail = service.leaveDetail("5", "2026-10-14");
        // 3월 15일 입사, 10월 14일 기준: 꽉 채운 달은 6달(14일 < 15일) → 6일
        assertEquals(6.0, detail.get("entitledDays"));
        assertEquals(1.5, detail.get("usedDays"));
        assertEquals(4.5, detail.get("remainingDays"));
        assertEquals(true, detail.get("accruing"));
        assertEquals("기준일을 'YYYY-MM-DD' 로 넣어주세요", assertThrows(IllegalArgumentException.class, () -> service.listLeave("10/14")).getMessage());
    }
}
