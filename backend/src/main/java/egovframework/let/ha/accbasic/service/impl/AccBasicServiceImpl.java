package egovframework.let.ha.accbasic.service.impl;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.let.ha.accbasic.domain.model.AccBankAccountVO;
import egovframework.let.ha.accbasic.domain.model.AccCardVO;
import egovframework.let.ha.accbasic.domain.model.AccSubjectVO;
import egovframework.let.ha.accbasic.domain.repository.AccBasicDAO;
import egovframework.let.ha.accbasic.service.AccBasicService;

/**
 * 인사·회계 - 기초회계정보 서비스 구현 클래스 (송연 accounting.py 와 같은 규칙)
 * @author SONGYEON ERP
 * @since 2026.10.14
 * @version 1.0
 */
@Service("accBasicService")
public class AccBasicServiceImpl extends EgovAbstractServiceImpl implements AccBasicService {

    static final List<String> SUBJECT_CATEGORIES = Arrays.asList("자산", "부채", "자본", "수익", "비용");
    private static final DateTimeFormatter ISO_SECONDS = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");

    private final AccBasicDAO accBasicDAO;

    public AccBasicServiceImpl(AccBasicDAO accBasicDAO) {
        this.accBasicDAO = accBasicDAO;
    }

    // ===== 계정과목 =====

    @Override
    public List<AccSubjectVO> listSubjects() throws Exception {
        // 화면에서 '사용안함' 도 볼 수 있어야 되살릴 수 있으므로 다 준다
        return accBasicDAO.selectSubjects();
    }

    @Override
    public void saveSubject(AccSubjectVO r) throws Exception {
        String code = trim(r.getCode());
        String name = trim(r.getName());
        String category = trim(r.getCategory());
        if (code.isEmpty() || name.isEmpty()) {
            throw new IllegalArgumentException("계정코드와 계정과목명을 적어주세요");
        }
        if (!SUBJECT_CATEGORIES.contains(category)) {
            throw new IllegalArgumentException("구분은 자산·부채·자본·수익·비용 중에서 골라주세요");
        }
        if (accBasicDAO.countSubjectCode(code, r.getId()) > 0) {
            throw new IllegalArgumentException("계정코드 " + code + " 은(는) 이미 쓰고 있어요");
        }
        Map<String, Object> v = base(r.getId(), r.getActive(), r.getNote());
        v.put("code", code);
        v.put("name", name);
        v.put("category", category);
        v.put("direction", directionOf(category));
        if (r.getId() == null) {
            accBasicDAO.insertSubject(v);
        } else {
            accBasicDAO.updateSubject(v);
        }
    }

    /** 자산과 비용은 늘어날 때 차변, 부채 · 자본 · 수익은 대변이다. 사람이 고를 일이 아니라 구분에서 따라 나온다 */
    static String directionOf(String category) {
        return "자산".equals(category) || "비용".equals(category) ? "차변" : "대변";
    }

    @Override
    public void deleteSubject(long id) throws Exception {
        accBasicDAO.deleteSubject(id);
    }

    // ===== 계좌 =====

    @Override
    public List<AccBankAccountVO> listBankAccounts() throws Exception {
        return accBasicDAO.selectBankAccounts();
    }

    @Override
    public void saveBankAccount(AccBankAccountVO r) throws Exception {
        String bank = trim(r.getBankName());
        String no = trim(r.getAccountNo());
        if (bank.isEmpty() || no.isEmpty()) {
            throw new IllegalArgumentException("은행과 계좌번호를 적어주세요");
        }
        Map<String, Object> v = base(r.getId(), r.getActive(), r.getNote());
        v.put("bankName", bank);
        v.put("accountNo", no);
        v.put("holder", blankToNull(r.getHolder()));
        v.put("purpose", blankToNull(r.getPurpose()));
        if (r.getId() == null) {
            accBasicDAO.insertBankAccount(v);
        } else {
            accBasicDAO.updateBankAccount(v);
        }
    }

    @Override
    public void deleteBankAccount(long id) throws Exception {
        int used = accBasicDAO.countCardsOfBank(id);
        if (used > 0) {
            throw new IllegalArgumentException("이 계좌를 결제계좌로 쓰는 카드가 " + used + "개 있어요. 그 카드를 먼저 바꿔주세요");
        }
        accBasicDAO.deleteBankAccount(id);
    }

    // ===== 카드 =====

    @Override
    public List<AccCardVO> listCards() throws Exception {
        return accBasicDAO.selectCards();
    }

    /**
     * 카드는 뒤 4자리만 받는다. 카드 매입명세를 맞춰볼 때 쓰는 것이 뒤 4자리라,
     * 앞자리까지 적어두면 쓰지도 않을 것을 위험만 안고 보관하게 된다.
     */
    @Override
    public void saveCard(AccCardVO r) throws Exception {
        String issuer = trim(r.getIssuer());
        String last4 = r.getLast4() == null ? "" : r.getLast4().replaceAll("\\D", "");
        if (issuer.isEmpty()) {
            throw new IllegalArgumentException("카드사를 적어주세요");
        }
        if (last4.length() != 4) {
            throw new IllegalArgumentException("카드번호는 뒤 4자리만 적어주세요 (앞자리는 보관하지 않아요)");
        }
        Map<String, Object> v = base(r.getId(), r.getActive(), r.getNote());
        v.put("issuer", issuer);
        v.put("last4", last4);
        v.put("nickname", blankToNull(r.getNickname()));
        v.put("holder", blankToNull(r.getHolder()));
        v.put("bankAccountId", toLong(r.getBankAccountId()));
        if (r.getId() == null) {
            accBasicDAO.insertCard(v);
        } else {
            accBasicDAO.updateCard(v);
        }
    }

    @Override
    public void deleteCard(long id) throws Exception {
        accBasicDAO.deleteCard(id);
    }

    // ===== 공통 =====

    private static Map<String, Object> base(Long id, Object active, String note) {
        Map<String, Object> v = new HashMap<>();
        v.put("id", id);
        v.put("active", activeOf(active));
        v.put("note", blankToNull(note));
        v.put("now", LocalDateTime.now(ZoneId.of("Asia/Seoul")).format(ISO_SECONDS));
        return v;
    }

    /** 송연 1 if body.get("active", 1) else 0: 안 보내면 사용, 0 · false · 빈 값이면 사용안함 */
    static int activeOf(Object active) {
        if (active == null) {
            return 1;
        }
        if (active instanceof Boolean) {
            return ((Boolean) active) ? 1 : 0;
        }
        if (active instanceof Number) {
            return ((Number) active).doubleValue() != 0 ? 1 : 0;
        }
        String s = String.valueOf(active).trim();
        return s.isEmpty() || "0".equals(s) || "false".equalsIgnoreCase(s) ? 0 : 1;
    }

    /** 송연 _acc_num: 정수로 읽히면 그 값, 아니면 null */
    static Long toLong(Object value) {
        if (value instanceof Number) {
            return ((Number) value).longValue();
        }
        String s = value == null ? "" : String.valueOf(value).trim();
        return s.matches("-?\\d+") ? Long.valueOf(s) : null;
    }

    private static String blankToNull(String value) {
        String s = trim(value);
        return s.isEmpty() ? null : s;
    }

    private static String trim(String value) {
        return value == null ? "" : value.trim();
    }
}
