package egovframework.let.co.master.partneritem.service.impl;

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Arrays;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import egovframework.let.co.master.itemmaster.domain.model.ProductBomVO;
import egovframework.let.co.master.partneritem.domain.repository.PartnerItemDAO;

class PartnerItemServiceImplTest {

	@DisplayName("거래처별 제품조회: 사용 중인 제품 목록을 그대로 준다(거래처명으로 거르는 것은 화면)")
	@Test
	void listPartnerItems() throws Exception {
		PartnerItemDAO dao = mock(PartnerItemDAO.class);
		List<ProductBomVO> rows = Arrays.asList(new ProductBomVO());
		when(dao.selectPartnerItemList()).thenReturn(rows);
		assertSame(rows, new PartnerItemServiceImpl(dao).listPartnerItems());
	}
}
