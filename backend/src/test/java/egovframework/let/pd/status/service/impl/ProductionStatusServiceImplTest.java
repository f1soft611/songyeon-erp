package egovframework.let.pd.status.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import egovframework.let.pd.status.domain.repository.ProductionStatusDAO;

class ProductionStatusServiceImplTest {

	@DisplayName("기간이 비면 막고(DB 안 읽음), 조건은 앞뒤 공백을 떼고 빈 조건은 null 로 넘긴다")
	@Test
	void rules() throws Exception {
		ProductionStatusDAO dao = mock(ProductionStatusDAO.class);
		ProductionStatusServiceImpl service = new ProductionStatusServiceImpl(dao);
		assertEquals("조회 기간을 선택해주세요", assertThrows(IllegalArgumentException.class, () -> service.listStatus("2026-10-01", " ", null, null)).getMessage());
		verify(dao, never()).selectStatus(any(), any(), any(), any());
		service.listStatus(" 2026-09-01 ", "2026-10-06", " 소스 ", "  ");
		verify(dao).selectStatus("2026-09-01", "2026-10-06", "소스", null);
	}
}
