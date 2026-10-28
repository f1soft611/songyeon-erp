package egovframework.let.co.master.partneritem.service.impl;

import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.let.co.master.itemmaster.domain.model.ProductBomVO;
import egovframework.let.co.master.partneritem.domain.repository.PartnerItemDAO;
import egovframework.let.co.master.partneritem.service.PartnerItemService;

/**
 * 공통관리 > 기초정보 > 거래처별 제품조회 서비스 구현 클래스
 * @author SONGYEON ERP
 * @since 2026.10.20
 * @version 1.0
 */
@Service("partnerItemService")
public class PartnerItemServiceImpl extends EgovAbstractServiceImpl implements PartnerItemService {

    private final PartnerItemDAO partnerItemDAO;

    public PartnerItemServiceImpl(PartnerItemDAO partnerItemDAO) {
        this.partnerItemDAO = partnerItemDAO;
    }

    @Override
    public List<ProductBomVO> listPartnerItems() throws Exception {
        return partnerItemDAO.selectPartnerItemList();
    }
}
