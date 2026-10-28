package egovframework.let.pd.label.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import egovframework.let.pd.label.domain.repository.LabelPrintDAO;

class LabelPrintServiceImplTest {

	@DisplayName("날짜가 비면 막고(DB 안 읽음), 앞뒤 공백을 떼고 읽는다")
	@Test
	void rules() throws Exception {
		LabelPrintDAO dao = mock(LabelPrintDAO.class);
		LabelPrintServiceImpl service = new LabelPrintServiceImpl(dao);
		assertEquals("날짜를 선택해주세요", assertThrows(IllegalArgumentException.class, () -> service.listByDate(" ")).getMessage());
		verify(dao, never()).selectByDate(any());
		service.listByDate(" 2026-10-06 ");
		verify(dao).selectByDate("2026-10-06");
	}
}
