package egovframework.let.co.master.warehouse.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Map;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;

import egovframework.let.co.master.warehouse.domain.model.WarehouseSaveRequestVO;
import egovframework.let.co.master.warehouse.domain.model.WarehouseVO;
import egovframework.let.co.master.warehouse.domain.repository.WarehouseDAO;

class WarehouseServiceImplTest {

	private static WarehouseVO warehouse(long id, String name, String type, String defaultYn) {
		WarehouseVO row = new WarehouseVO();
		row.setWarehouseId(id);
		row.setWarehouseNm(name);
		row.setWarehouseCd("C-" + name); // 2026-10-26 쓰는 곳은 코드로 센다
		row.setWarehouseType(type);
		row.setDefaultYn(defaultYn);
		return row;
	}

	private static WarehouseSaveRequestVO request(String name, String type, Boolean defaultYn, String remark) {
		WarehouseSaveRequestVO request = new WarehouseSaveRequestVO();
		request.setWarehouseNm(name);
		request.setWarehouseType(type);
		request.setDefaultYn(defaultYn);
		request.setRemark(remark);
		return request;
	}

	@SuppressWarnings({ "unchecked", "rawtypes" })
	private static ArgumentCaptor<Map<String, Object>> mapCaptor() {
		return (ArgumentCaptor) ArgumentCaptor.forClass(Map.class);
	}

	@DisplayName("등록: 이름 · 유형 필수, 같은 이름 불가, 코드는 표의 가장 큰 자동 번호 + 1, 정렬은 맨 뒤 +10, 등록자 사번, 사업장 F001/P001")
	@Test
	void createWarehouse_rules() throws Exception {
		WarehouseDAO dao = mock(WarehouseDAO.class);
		WarehouseServiceImpl service = new WarehouseServiceImpl(dao);

		assertEquals("창고 이름은 필수입니다",
				assertThrows(IllegalArgumentException.class, () -> service.createWarehouse(request(" ", "원자재", null, null), "0000")).getMessage());
		assertEquals("창고유형을 골라주세요",
				assertThrows(IllegalArgumentException.class, () -> service.createWarehouse(request("냉동창고", "창고", null, null), "0000")).getMessage());

		when(dao.countActiveName(anyMap())).thenReturn(1L);
		assertEquals("이미 등록된 창고입니다",
				assertThrows(IllegalArgumentException.class, () -> service.createWarehouse(request("자재창고", "원자재", null, null), "0000")).getMessage());

		when(dao.countActiveName(anyMap())).thenReturn(0L);
		when(dao.selectMaxSortSeq(anyMap())).thenReturn(95);
		when(dao.selectMaxAutoCodeNo()).thenReturn(null); // 6자리 숫자 코드가 하나도 없음 → 000001 부터
		when(dao.countCode("000001")).thenReturn(1L); // 이미 있는 코드는 넘어간다
		when(dao.countCode("000002")).thenReturn(0L);
		service.createWarehouse(request(" 냉동창고 ", "원자재", null, "  "), "0000");

		ArgumentCaptor<Map<String, Object>> saved = mapCaptor();
		verify(dao).insertWarehouse(saved.capture());
		Map<String, Object> p = saved.getValue();
		assertEquals("F001", p.get("factoryCode"));
		assertEquals("P001", p.get("plantCode"));
		assertEquals("000002", p.get("warehouseCd"));
		assertEquals("Y", p.get("useYn")); // 상태를 보내지 않으면 사용
		assertEquals("냉동창고", p.get("warehouseNm"));
		assertEquals("원자재", p.get("warehouseType"));
		assertEquals("N", p.get("defaultYn"));
		assertEquals(null, p.get("remark"));
		assertEquals(105, p.get("sortSeq"));
		assertEquals("0000", p.get("userId"));
		verify(dao, never()).clearDefaultWarehouse(anyMap());
	}

	@DisplayName("등록: 기본창고로 켜면 다른 기본창고를 먼저 끈다(전체에서 한 곳)")
	@Test
	void createWarehouse_default() throws Exception {
		WarehouseDAO dao = mock(WarehouseDAO.class);
		WarehouseServiceImpl service = new WarehouseServiceImpl(dao);
		when(dao.selectMaxAutoCodeNo()).thenReturn(10); // 가장 큰 6자리 번호 10 → 000011

		service.createWarehouse(request("외부창고", "외부", true, null), null);

		InOrder order = inOrder(dao);
		ArgumentCaptor<Map<String, Object>> cleared = mapCaptor();
		order.verify(dao).clearDefaultWarehouse(cleared.capture());
		ArgumentCaptor<Map<String, Object>> saved = mapCaptor();
		order.verify(dao).insertWarehouse(saved.capture());
		assertEquals(null, cleared.getValue().get("warehouseId"));
		assertEquals("Y", saved.getValue().get("defaultYn"));
		assertEquals("000011", saved.getValue().get("warehouseCd"));
		assertEquals(null, saved.getValue().get("userId"));
	}

	@DisplayName("수정: 이름을 바꿔도 쓰는 곳은 창고코드로 이어져 따라 바꿀 것이 없다(2026-10-26, 옮긴 원재료 수 0)")
	@Test
	void updateWarehouse_rename() throws Exception {
		WarehouseDAO dao = mock(WarehouseDAO.class);
		WarehouseServiceImpl service = new WarehouseServiceImpl(dao);
		when(dao.selectWarehouse(anyMap())).thenReturn(warehouse(3, "냉장창고", "원자재", "N"));
		when(dao.updateWarehouse(anyMap())).thenReturn(1);

		assertEquals(0, service.updateWarehouse(3L, request("냉장1창고", "원자재", null, "메모"), "0007"));
		ArgumentCaptor<Map<String, Object>> saved = mapCaptor();
		verify(dao).updateWarehouse(saved.capture());
		assertEquals(3L, saved.getValue().get("warehouseId"));
		assertEquals("N", saved.getValue().get("defaultYn")); // 보내지 않으면 그대로
		assertEquals("메모", saved.getValue().get("remark"));
		assertEquals("0007", saved.getValue().get("userId"));
	}

	@DisplayName("수정: 이름을 그대로 두면 쓰던 곳은 건드리지 않고, 다른 창고와 같은 이름은 막는다")
	@Test
	void updateWarehouse_sameNameAndDuplicate() throws Exception {
		WarehouseDAO dao = mock(WarehouseDAO.class);
		WarehouseServiceImpl service = new WarehouseServiceImpl(dao);
		when(dao.selectWarehouse(anyMap())).thenReturn(warehouse(3, "냉장창고", "완제품", "N"));
		when(dao.updateWarehouse(anyMap())).thenReturn(1);

		assertEquals(0, service.updateWarehouse(3L, request("냉장창고", "완제품", null, null), null));
		verify(dao, never()).countActiveName(anyMap());

		when(dao.countActiveName(anyMap())).thenReturn(1L);
		assertEquals("이미 등록된 창고입니다",
				assertThrows(IllegalArgumentException.class, () -> service.updateWarehouse(3L, request("자재창고", "완제품", null, null), null)).getMessage());

		when(dao.selectWarehouse(anyMap())).thenReturn(null);
		assertEquals("없는 창고입니다",
				assertThrows(IllegalArgumentException.class, () -> service.updateWarehouse(9L, request("냉장창고", "완제품", null, null), null)).getMessage());
	}

	@DisplayName("수정: 기본창고로 켜면 다른 기본창고를 먼저 끈다(전체에서 한 곳)")
	@Test
	void updateWarehouse_turnDefaultOn() throws Exception {
		WarehouseDAO dao = mock(WarehouseDAO.class);
		WarehouseServiceImpl service = new WarehouseServiceImpl(dao);
		when(dao.selectWarehouse(anyMap())).thenReturn(warehouse(3, "냉장창고", "원자재", "N"));
		when(dao.updateWarehouse(anyMap())).thenReturn(1);

		service.updateWarehouse(3L, request("냉장창고", "원자재", true, null), null);
		InOrder order = inOrder(dao);
		ArgumentCaptor<Map<String, Object>> cleared = mapCaptor();
		order.verify(dao).clearDefaultWarehouse(cleared.capture());
		ArgumentCaptor<Map<String, Object>> saved = mapCaptor();
		order.verify(dao).updateWarehouse(saved.capture());
		assertEquals(3L, cleared.getValue().get("warehouseId"));
		assertEquals("Y", saved.getValue().get("defaultYn"));
	}

	@DisplayName("수정: 입고창고(기본창고)를 꺼서 하나도 안 남으면 막는다. 유형만 바꾸는 것은 된다. 다른 곳이 먼저 켜졌으면 된다")
	@Test
	void updateWarehouse_lastReceiving() throws Exception {
		WarehouseDAO dao = mock(WarehouseDAO.class);
		WarehouseServiceImpl service = new WarehouseServiceImpl(dao);
		when(dao.selectWarehouse(anyMap())).thenReturn(warehouse(2, "자재창고", "원자재", "Y"));
		when(dao.updateWarehouse(anyMap())).thenReturn(1);

		when(dao.countActiveDefault(anyMap())).thenReturn(0L);
		assertEquals("입고가 들어오는 창고는 한 곳은 있어야 해요. 다른 창고를 먼저 지정해주세요",
				assertThrows(IllegalArgumentException.class, () -> service.updateWarehouse(2L, request("자재창고", "원자재", false, null), null)).getMessage());
		when(dao.countActiveDefault(anyMap())).thenReturn(1L);
		service.updateWarehouse(2L, request("자재창고", "부자재", null, null), null); // 기본창고는 그대로 켜져 있다

		// 다른 줄이 먼저 기본창고가 되어 있으면(화면은 켜는 줄을 먼저 보낸다) 끌 수 있다
		service.updateWarehouse(2L, request("자재창고", "원자재", false, null), null);
	}

	@DisplayName("코드 모양: 6자리 숫자(2026-10-22)")
	@Test
	void formatCode() {
		assertEquals("000001", WarehouseServiceImpl.formatCode(1L));
		assertEquals("001000", WarehouseServiceImpl.formatCode(1000L));
	}

	@DisplayName("등록: 보낸 창고코드는 쓰지 않고 6자리 자동 번호, 상태 N 으로 등록할 수 있다(2026-10-22)")
	@Test
	void createWarehouse_code() throws Exception {
		WarehouseDAO dao = mock(WarehouseDAO.class);
		WarehouseServiceImpl service = new WarehouseServiceImpl(dao);
		when(dao.selectMaxAutoCodeNo()).thenReturn(41);
		WarehouseSaveRequestVO r = request("냉동창고", "원자재", null, null);
		r.setWarehouseCd("WH-FZ");
		r.setUseYn("n");
		service.createWarehouse(r, "0000");
		ArgumentCaptor<Map<String, Object>> saved = mapCaptor();
		verify(dao).insertWarehouse(saved.capture());
		assertEquals("000042", saved.getValue().get("warehouseCd"));
		assertEquals("N", saved.getValue().get("useYn"));
	}

	@DisplayName("수정: 상태 체크박스 — useYn 저장, 사용안함 줄을 다시 켤 때 같은 이름 사용 중 창고가 있으면 막는다(2026-10-22)")
	@Test
	void updateWarehouse_useYn() throws Exception {
		WarehouseDAO dao = mock(WarehouseDAO.class);
		WarehouseServiceImpl service = new WarehouseServiceImpl(dao);
		WarehouseVO off = warehouse(5, "옛창고", "보류", "N");
		off.setUseYn("N");
		when(dao.selectWarehouse(anyMap())).thenReturn(off);
		when(dao.updateWarehouse(anyMap())).thenReturn(1);

		WarehouseSaveRequestVO on = request("옛창고", "보류", null, null);
		on.setUseYn("Y");
		when(dao.countActiveName(anyMap())).thenReturn(1L);
		assertEquals("이미 등록된 창고입니다",
				assertThrows(IllegalArgumentException.class, () -> service.updateWarehouse(5L, on, null)).getMessage());
		verify(dao, never()).updateWarehouse(anyMap());

		when(dao.countActiveName(anyMap())).thenReturn(0L);
		service.updateWarehouse(5L, on, null);
		ArgumentCaptor<Map<String, Object>> saved = mapCaptor();
		verify(dao).updateWarehouse(saved.capture());
		assertEquals("Y", saved.getValue().get("useYn"));

		// 사용 중인 줄을 끄면 이름 검사 없이 N
		WarehouseVO active = warehouse(6, "자재2창고", "원자재", "N");
		active.setUseYn("Y");
		when(dao.selectWarehouse(anyMap())).thenReturn(active);
		WarehouseSaveRequestVO offReq = request("자재2창고", "원자재", null, null);
		offReq.setUseYn("N");
		service.updateWarehouse(6L, offReq, null);
		verify(dao, org.mockito.Mockito.times(2)).updateWarehouse(saved.capture());
		assertEquals("N", saved.getValue().get("useYn"));
	}
}
