package egovframework.let.ha.acctx.controller;

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
import egovframework.let.ha.acctx.domain.model.AccTransactionSaveVO;
import egovframework.let.ha.acctx.service.AccTxService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 인사·회계 > 회계거래현황 컨트롤러 클래스 (송연 /api/accounting/transactions 를 S_ERP 규칙으로 옮김)
 * 계정과목 · 계좌 · 카드 고르기는 기초회계정보 API(/api/v1/ha/acc-basic)를 같이 쓴다.
 * 입·출금관리(송연 /api/accounting/cash-report)도 같은 전표를 묶어 볼 뿐이라 여기 둔다(/cash-report).
 * @author SONGYEON ERP
 * @since 2026.10.14
 * @version 1.0
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/ha/acc-tx")
@Tag(name = "AccTxApiController", description = "인사·회계 - 회계거래현황")
public class AccTxApiController {

    private static final String TAG = "AccTxApiController";

    private final ResultVoHelper resultVoHelper;
    private final AccTxService accTxService;

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

    // 송연 session employee_name (적은 사람)
    private static String employeeName(LoginVO user) {
        return user == null ? null : user.getName();
    }

    @Operation(summary = "입금 · 출금 목록 ?start &end(필수) &kind=입금·출금 &clientName=일부 → {rows, inTotal, outTotal}", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/transactions")
    public ResultVO transactions(@RequestParam Map<String, String> filter) throws Exception {
        return handle(map -> map.put("item", accTxService.listTransactions(filter)));
    }

    @Operation(summary = "입금 · 출금 적기 {kind, txDate, clientName, amount, method, subjectId, bankAccountId, cardId, note}", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PostMapping("/transactions")
    public ResultVO create(@RequestBody AccTransactionSaveVO request, @Parameter(hidden = true) @AuthenticationPrincipal LoginVO user) throws Exception {
        return handle(map -> accTxService.saveTransaction(null, request, employeeName(user)));
    }

    @Operation(summary = "입금 · 출금 고치기", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PutMapping("/transactions/{id}")
    public ResultVO update(@PathVariable("id") long id, @RequestBody AccTransactionSaveVO request) throws Exception {
        return handle(map -> accTxService.saveTransaction(id, request, null));
    }

    @Operation(summary = "입·출금관리: 한쪽만 묶어 보기 ?kind=입금·출금 &start &end(필수) &clientName → {kind, start, end, rows, total, bySubject, byClient, byMethod}",
            security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/cash-report")
    public ResultVO cashReport(@RequestParam Map<String, String> filter) throws Exception {
        return handle(map -> map.put("item", accTxService.cashReport(filter)));
    }

    @Operation(summary = "입금 · 출금 지우기", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @DeleteMapping("/transactions/{id}")
    public ResultVO delete(@PathVariable("id") long id) throws Exception {
        return handle(map -> accTxService.deleteTransaction(id));
    }
}
