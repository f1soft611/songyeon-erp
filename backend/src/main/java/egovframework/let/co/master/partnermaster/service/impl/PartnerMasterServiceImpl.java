package egovframework.let.co.master.partnermaster.service.impl;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import egovframework.com.cmm.util.BusinessNo;
import egovframework.let.co.master.partnermaster.domain.model.ClientTypeVO;
import egovframework.let.co.master.partnermaster.domain.model.PartnerMasterVO;
import egovframework.let.co.master.partnermaster.domain.repository.PartnerMasterDAO;
import egovframework.let.co.master.partnermaster.service.PartnerMasterService;

/**
 * 기초정보 - 거래처마스터 서비스 구현 클래스
 * 송연 변환본(CM0001Service 거래처BOM 부분, 기존 create_client·update_client)과 같은 규칙.
 * @author SONGYEON ERP
 * @since 2026.10.02
 * @version 1.0
 */
@Service("partnerMasterService")
public class PartnerMasterServiceImpl extends EgovAbstractServiceImpl implements PartnerMasterService {

    // 분류(2026-10-23): 공통코드 CUSTOMER_CATEGORY 의 코드로 저장한다(예: 001 매입거래처 · 002 매출거래처 · 003 매입+매출 거래처).
    // 엑셀 올리기(2026-10-27)는 화면이 그리드에 올린 뒤 [저장](등록 · 수정과 같은 검사)으로 보낸다
    static final String REQUIRED_MESSAGE = "거래처명은 필수입니다";
    static final String TYPE_MESSAGE = "거래처 분류를 선택해주세요";
    static final String DUPLICATE_MESSAGE = "이미 등록된 거래처입니다";
    static final String NOT_FOUND_MESSAGE = "없는 거래처입니다";
    static final String USE_YN_MESSAGE = "사용여부는 Y 또는 N 이어야 합니다";
    static final String RACE_MESSAGE = "방금 다른 사람이 같은 거래처명으로 먼저 등록했어요. 새로고침 후 확인해주세요.";
    // 거래처코드(2026-10-23): 화면에서 받지 않고 서버가 6자리 숫자로 매긴다(가장 큰 6자리 숫자 코드 + 1, 없으면 000001)
    static final int CLIENT_CODE_WIDTH = 6;

    private static final DateTimeFormatter CREATED_AT = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    private final PartnerMasterDAO partnerMasterDAO;

    public PartnerMasterServiceImpl(PartnerMasterDAO partnerMasterDAO) {
        this.partnerMasterDAO = partnerMasterDAO;
    }

    @Override
    public List<PartnerMasterVO> listClients() throws Exception {
        return partnerMasterDAO.selectClientList();
    }

    @Override
    @Transactional
    public void createClient(PartnerMasterVO payload) throws Exception {
        PartnerMasterVO row = clientRow(payload);
        if (partnerMasterDAO.selectClientByName(row.getName()) != null) {
            throw new IllegalArgumentException(DUPLICATE_MESSAGE);
        }
        // 사용여부(2026-10-27, S_ERP 거래처관리와 같음): 등록 창에서 고른 값을 넣는다. 비어 있으면 사용(Y)
        row.setUseYn(useYnOf(payload == null ? null : payload.getUseYn(), true));
        row.setCreatedAt(now());
        row.setRegUserId(payload == null ? null : payload.getRegUserId()); // 등록자: 컨트롤러가 로그인 사원 사번으로 채운다
        row.setClientCode(nextClientCode());
        try {
            partnerMasterDAO.insertClient(row);
        } catch (DuplicateKeyException ex) {
            throw new IllegalArgumentException(RACE_MESSAGE);
        }
    }

    // 송연: 이름 겹침은 미리 보지 않는다(원래 이름 그대로 저장하는 일이 잦다). 다른 거래처 이름으로 바꾸면 DB 유일 조건이 막는다.
    @Override
    @Transactional
    public void updateClient(Long id, PartnerMasterVO payload) throws Exception {
        if (id == null || partnerMasterDAO.selectClient(id) == null) {
            throw new IllegalArgumentException(NOT_FOUND_MESSAGE);
        }
        PartnerMasterVO row = clientRow(payload);
        row.setId(id);
        // 사용여부(2026-10-27, S_ERP 거래처관리와 같음): 수정 때도 같이 받는다. Y/N 이 아니면 막는다
        row.setUseYn(useYnOf(payload == null ? null : payload.getUseYn(), false));
        row.setUpdUserId(payload == null ? null : payload.getUpdUserId()); // 수정자: 컨트롤러가 로그인 사원 사번으로 채운다
        try {
            partnerMasterDAO.updateClient(row);
        } catch (DuplicateKeyException ex) {
            throw new IllegalArgumentException(DUPLICATE_MESSAGE);
        }
    }

    @Override
    public List<ClientTypeVO> listClientTypes() throws Exception {
        return partnerMasterDAO.selectClientTypes();
    }

    // 등록·수정이 함께 쓰는 검사(송연 clientRow). 분류는 공통코드 CUSTOMER_CATEGORY 의 사용 중 코드여야 한다(2026-10-23)
    private PartnerMasterVO clientRow(PartnerMasterVO payload) throws Exception {
        PartnerMasterVO request = payload == null ? new PartnerMasterVO() : payload;
        PartnerMasterVO row = new PartnerMasterVO();
        String name = trim(request.getName());
        if (name.isEmpty()) {
            throw new IllegalArgumentException(REQUIRED_MESSAGE);
        }
        row.setName(name);
        String type = trim(request.getClientType());
        boolean known = false;
        for (ClientTypeVO option : partnerMasterDAO.selectClientTypes()) {
            known |= option.getCode() != null && option.getCode().equals(type);
        }
        if (!known) {
            throw new IllegalArgumentException(TYPE_MESSAGE);
        }
        row.setClientType(type);
        BusinessNo.Result businessNo = BusinessNo.normalize(request.getBusinessNo());
        if (businessNo.getError() != null) {
            throw new IllegalArgumentException(businessNo.getError());
        }
        row.setBusinessNo(businessNo.getValue());
        row.setCeoName(memo(request.getCeoName()));
        row.setBusinessType(memo(request.getBusinessType()));
        row.setBusinessItem(memo(request.getBusinessItem()));
        row.setPhone(memo(request.getPhone()));
        row.setFax(memo(request.getFax()));
        row.setMobile(memo(request.getMobile()));
        row.setEmail(memo(request.getEmail()));
        row.setZipcode(memo(request.getZipcode()));
        row.setAddress(memo(request.getAddress()));
        row.setAddressDetail(memo(request.getAddressDetail()));
        row.setMemo(memo(request.getMemo()));
        return row;
    }

    // 사용여부 Y/N(대소문자 · 앞뒤 빈칸 무시). 비어 있으면 allowDefault 일 때만 Y, 그 밖은 막는다(S_ERP normalizeUseAt 와 같음)
    static String useYnOf(String useYn, boolean allowDefault) {
        String value = useYn == null ? "" : useYn.trim().toUpperCase();
        if (value.isEmpty() && allowDefault) {
            return "Y";
        }
        if (!"Y".equals(value) && !"N".equals(value)) {
            throw new IllegalArgumentException(USE_YN_MESSAGE);
        }
        return value;
    }

    private static String trim(String raw) {
        return raw == null ? "" : raw.trim();
    }

    private static String memo(String raw) {
        String value = trim(raw);
        return value.isEmpty() ? null : value;
    }

    // 표에 있는 6자리 숫자 코드 가운데 가장 큰 번호 + 1. 없으면 000001. 이미 있는 코드면 다음 번호로 넘어간다(포장유형과 같음)
    private String nextClientCode() throws Exception {
        Integer max = partnerMasterDAO.selectMaxClientCodeNo();
        long n = max == null ? 0 : max;
        for (int tries = 0; tries < 1000; tries++) {
            String code = formatClientCode(++n);
            if (partnerMasterDAO.countClientCode(code) == 0) {
                return code;
            }
        }
        throw new IllegalStateException("거래처코드를 만들지 못했습니다");
    }

    static String formatClientCode(long value) {
        StringBuilder digits = new StringBuilder(String.valueOf(value));
        while (digits.length() < CLIENT_CODE_WIDTH) {
            digits.insert(0, '0');
        }
        return digits.toString();
    }

    private static String now() {
        return LocalDateTime.now(SEOUL).format(CREATED_AT);
    }
}
