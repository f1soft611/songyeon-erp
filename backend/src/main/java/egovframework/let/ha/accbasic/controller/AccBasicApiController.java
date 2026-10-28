package egovframework.let.ha.accbasic.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.ha.accbasic.domain.model.AccBankAccountVO;
import egovframework.let.ha.accbasic.domain.model.AccCardVO;
import egovframework.let.ha.accbasic.domain.model.AccSubjectVO;
import egovframework.let.ha.accbasic.service.AccBasicService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 인사·회계 > 기초회계정보 컨트롤러 클래스 (송연 /api/accounting/subjects · bank-accounts · cards 를 S_ERP 규칙으로 옮김)
 * 새로 만들기는 POST, 고치기(사용 켜고 끄기 포함)는 PUT /{id}, 지우기는 DELETE /{id}.
 * @author SONGYEON ERP
 * @since 2026.10.14
 * @version 1.0
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/ha/acc-basic")
@Tag(name = "AccBasicApiController", description = "인사·회계 - 기초회계정보")
public class AccBasicApiController {

    private static final String TAG = "AccBasicApiController";

    private final ResultVoHelper resultVoHelper;
    private final AccBasicService accBasicService;

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

    @Operation(summary = "계정과목 목록(사용안함 포함)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/subjects")
    public ResultVO subjects() throws Exception {
        return handle(map -> map.put("resultList", accBasicService.listSubjects()));
    }

    @Operation(summary = "계정과목 추가 {code, name, category, note, active}", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PostMapping("/subjects")
    public ResultVO createSubject(@RequestBody AccSubjectVO request) throws Exception {
        request.setId(null);
        return handle(map -> accBasicService.saveSubject(request));
    }

    @Operation(summary = "계정과목 고치기 · 사용 켜고 끄기", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PutMapping("/subjects/{id}")
    public ResultVO updateSubject(@PathVariable("id") long id, @RequestBody AccSubjectVO request) throws Exception {
        request.setId(id);
        return handle(map -> accBasicService.saveSubject(request));
    }

    @Operation(summary = "계정과목 지우기", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @DeleteMapping("/subjects/{id}")
    public ResultVO deleteSubject(@PathVariable("id") long id) throws Exception {
        return handle(map -> accBasicService.deleteSubject(id));
    }

    @Operation(summary = "계좌 목록", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/bank-accounts")
    public ResultVO bankAccounts() throws Exception {
        return handle(map -> map.put("resultList", accBasicService.listBankAccounts()));
    }

    @Operation(summary = "계좌 추가 {bankName, accountNo, holder, purpose, note, active}", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PostMapping("/bank-accounts")
    public ResultVO createBankAccount(@RequestBody AccBankAccountVO request) throws Exception {
        request.setId(null);
        return handle(map -> accBasicService.saveBankAccount(request));
    }

    @Operation(summary = "계좌 고치기 · 사용 켜고 끄기", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PutMapping("/bank-accounts/{id}")
    public ResultVO updateBankAccount(@PathVariable("id") long id, @RequestBody AccBankAccountVO request) throws Exception {
        request.setId(id);
        return handle(map -> accBasicService.saveBankAccount(request));
    }

    @Operation(summary = "계좌 지우기(결제계좌로 쓰는 카드가 있으면 막는다)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @DeleteMapping("/bank-accounts/{id}")
    public ResultVO deleteBankAccount(@PathVariable("id") long id) throws Exception {
        return handle(map -> accBasicService.deleteBankAccount(id));
    }

    @Operation(summary = "카드 목록(결제계좌 이름 포함)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/cards")
    public ResultVO cards() throws Exception {
        return handle(map -> map.put("resultList", accBasicService.listCards()));
    }

    @Operation(summary = "카드 추가 {issuer, last4(뒤 4자리만), nickname, holder, bankAccountId, note, active}", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PostMapping("/cards")
    public ResultVO createCard(@RequestBody AccCardVO request) throws Exception {
        request.setId(null);
        return handle(map -> accBasicService.saveCard(request));
    }

    @Operation(summary = "카드 고치기 · 사용 켜고 끄기", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PutMapping("/cards/{id}")
    public ResultVO updateCard(@PathVariable("id") long id, @RequestBody AccCardVO request) throws Exception {
        request.setId(id);
        return handle(map -> accBasicService.saveCard(request));
    }

    @Operation(summary = "카드 지우기", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @DeleteMapping("/cards/{id}")
    public ResultVO deleteCard(@PathVariable("id") long id) throws Exception {
        return handle(map -> accBasicService.deleteCard(id));
    }
}
