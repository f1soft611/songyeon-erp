package egovframework.let.co.master.submaterialmaster.service.impl;

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Arrays;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;

import egovframework.let.co.master.materialmaster.domain.model.MaterialMasterVO;
import egovframework.let.co.master.materialmaster.service.MaterialMasterService;
import egovframework.let.co.master.submaterialmaster.domain.repository.SubMaterialMasterDAO;

class SubMaterialMasterServiceImplTest {

	@DisplayName("부자재 목록: 예약 단가를 먼저 반영하고, 분류(앞뒤 공백 정리)로 읽은 뒤 납품업체를 붙인다(원재료와 같은 규칙)")
	@Test
	void listSubMaterials() throws Exception {
		SubMaterialMasterDAO dao = mock(SubMaterialMasterDAO.class);
		MaterialMasterService material = mock(MaterialMasterService.class);
		List<MaterialMasterVO> rows = Arrays.asList(new MaterialMasterVO());
		when(dao.selectSubMaterialList("박스")).thenReturn(rows);

		assertSame(rows, new SubMaterialMasterServiceImpl(dao, material).listSubMaterials(" 박스 "));

		InOrder order = inOrder(material, dao);
		order.verify(material).applyDuePriceSchedules();
		order.verify(dao).selectSubMaterialList("박스");
		order.verify(material).attachSuppliers(rows);
	}

	@DisplayName("분류를 주지 않으면 빈 값으로 읽는다(분류가 있는 원재료 전부)")
	@Test
	void listAllSubMaterials() throws Exception {
		SubMaterialMasterDAO dao = mock(SubMaterialMasterDAO.class);
		new SubMaterialMasterServiceImpl(dao, mock(MaterialMasterService.class)).listSubMaterials(null);
		org.mockito.Mockito.verify(dao).selectSubMaterialList("");
	}
}
