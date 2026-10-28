package egovframework.let.ha.hr.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.ha.hr.domain.model.HrAccountSaveVO;
import egovframework.let.ha.hr.domain.model.HrLeaveSaveVO;
import egovframework.let.ha.hr.service.HrService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 인사·회계 > 인사관리 컨트롤러 클래스 (송연 /api/employees · /api/hr/leave 를 S_ERP 규칙으로 옮김)
 * 인사정보(PUT /employees/{id})와 로그인정보(PUT /employees/{id}/account)는 주소를 갈라 둔다 — 화면에서 칸을 감추는 것만으로는 갈라진 것이 아니다.
 * @author SONGYEON ERP
 * @since 2026.10.14
 * @version 1.0
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/ha/hr")
@Tag(name = "HrApiController", description = "인사·회계 - 인사관리")
public class HrApiController {

    private static final String TAG = "HrApiController";

    private final ResultVoHelper resultVoHelper;
    private final HrService hrService;

    private interface Work {
        void run(Map<String, Object> resultMap) throws Exception;
    }

    private ResultVO handle(Work work) throws Exception {
        Map<String, Object> resultMap = new HashMap<>();
        try {
            work.run(resultMap);
            return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
        } catch (IllegalArgumentException ex) {
            return resultVoHelper.buildFromMap(new HashMap<String, Object>(), ResponseCode.INPUT_CHECK_ERROR, ex.getMessage());
        }
    }

    // 송연 session employee_name (주민번호를 본 사람 · 연차를 넣은 사람)
    private static String employeeName(LoginVO user) {
        return user == null ? null : user.getName();
    }

    @Operation(summary = "사원 목록(인사정보 + 아이디. 주민번호는 가려서만)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/employees")
    public ResultVO employees() throws Exception {
        return handle(map -> map.put("resultList", hrService.listEmployees()));
    }

    @Operation(summary = "주민등록번호 전체(누가 언제 봤는지 서버 기록에 남는다) → {residentNo}", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/employees/{id}/resident-no")
    public ResultVO residentNo(@PathVariable("id") String id, @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        return handle(map -> map.put("residentNo", hrService.residentNo(id, employeeName(user))));
    }

    @Operation(summary = "사원 등록(인사정보만) {name, department, position, phone, birthDate, residentNo, hireDate, address, resignDate, memo} → {id}",
            security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PostMapping("/employees")
    public ResultVO createEmployee(@RequestBody Map<String, Object> body) throws Exception {
        return handle(map -> map.put("id", hrService.createEmployee(body)));
    }

    @Operation(summary = "인사정보 고치기(보낸 칸만. 주민번호는 별표가 섞이면 그대로)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PutMapping("/employees/{id}")
    public ResultVO updateEmployee(@PathVariable("id") String id, @RequestBody Map<String, Object> body) throws Exception {
        return handle(map -> hrService.updateEmployee(id, body));
    }

    @Operation(summary = "로그인 아이디 · 비밀번호 정하기 {username, password}(비밀번호는 바꿀 때만)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PutMapping("/employees/{id}/account")
    public ResultVO saveAccount(@PathVariable("id") String id, @RequestBody HrAccountSaveVO request) throws Exception {
        return handle(map -> hrService.saveAccount(id, request.getUsername(), request.getPassword()));
    }

    @Operation(summary = "로그인 거두기(사원 줄은 남는다)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @DeleteMapping("/employees/{id}/account")
    public ResultVO revokeAccount(@PathVariable("id") String id) throws Exception {
        return handle(map -> hrService.revokeAccount(id));
    }

    @Operation(summary = "사원별 연차 갯수 · 사용 · 잔여 ?date=기준일(비우면 오늘) → {date, rows}", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/leave")
    public ResultVO leave(@RequestParam(value = "date", required = false) String date) throws Exception {
        return handle(map -> map.put("item", hrService.listLeave(date)));
    }

    @Operation(summary = "한 사람의 연차 사용 내역(이번 연차연도 · 그 전) ?date", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/leave/{employeeId}")
    public ResultVO leaveDetail(@PathVariable("employeeId") String employeeId, @RequestParam(value = "date", required = false) String date) throws Exception {
        return handle(map -> map.put("item", hrService.leaveDetail(employeeId, date)));
    }

    @Operation(summary = "연차 등록 {employeeId, leaveDate, days: 1 · 0.5, note}", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PostMapping("/leave")
    public ResultVO createLeave(@RequestBody HrLeaveSaveVO request, @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        return handle(map -> hrService.createLeave(request, employeeName(user)));
    }

    @Operation(summary = "연차 기록 지우기", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @DeleteMapping("/leave/records/{id}")
    public ResultVO deleteLeave(@PathVariable("id") long id) throws Exception {
        return handle(map -> hrService.deleteLeave(id));
    }
}
