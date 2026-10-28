package egovframework.let.pu.documents.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import egovframework.let.common.attachment.domain.model.AttachmentVO;
import egovframework.let.common.attachment.service.AttachmentService;
import egovframework.let.pu.documents.domain.model.DocFolderSaveVO;
import egovframework.let.pu.documents.domain.model.DocFolderVO;
import egovframework.let.pu.documents.domain.model.DocLockRequestVO;
import egovframework.let.pu.documents.domain.model.DocShareRequestVO;
import egovframework.let.pu.documents.domain.model.DocShareResultVO;
import egovframework.let.pu.documents.domain.model.DocShareRowVO;
import egovframework.let.pu.documents.domain.model.DocShareVO;
import egovframework.let.pu.documents.domain.model.DocUserVO;
import egovframework.let.pu.documents.domain.repository.DocumentBoxDAO;
import egovframework.let.pu.documents.service.DocumentUnlockStore;
import egovframework.let.uat.uia.service.impl.WerkzeugPasswordVerifier;

class DocumentBoxServiceImplTest {

	private DocumentBoxDAO dao;
	private AttachmentService attachments;
	private DocumentUnlockStore store;
	private WerkzeugPasswordVerifier hasher;
	private DocumentBoxServiceImpl service;
	private final List<DocFolderVO> folders = new ArrayList<>();

	private static DocUserVO user(String id, String name, String dept, boolean admin) {
		DocUserVO u = new DocUserVO();
		u.setId(id);
		u.setName(name);
		u.setDepartment(dept);
		u.setAdmin(admin);
		return u;
	}

	private DocFolderVO folder(long id, Long parent, String name, String kind, String dept, String owner) {
		DocFolderVO f = new DocFolderVO();
		f.setId(id);
		f.setParentId(parent);
		f.setName(name);
		f.setKind(kind);
		f.setDepartment(dept);
		f.setOwnerId(owner);
		f.setFileCount(0);
		f.setChildCount(0);
		folders.add(f);
		return f;
	}

	@BeforeEach
	void setUp() throws Exception {
		dao = mock(DocumentBoxDAO.class);
		attachments = mock(AttachmentService.class);
		store = new DocumentUnlockStore();
		hasher = mock(WerkzeugPasswordVerifier.class);
		service = new DocumentBoxServiceImpl(dao, attachments, store, hasher);
		folders.clear();
		// 0001 사원1 생산부, 0002 사원2 영업부, 0009 관리자
		when(dao.selectUser("0001")).thenReturn(user("0001", "사원1", "생산부", false));
		when(dao.selectUser("0002")).thenReturn(user("0002", "사원2", "영업부", false));
		when(dao.selectUser("0009")).thenReturn(user("0009", "사원9", "관리", true));
		when(dao.selectFolders()).thenAnswer(inv -> folders);
		when(dao.selectFolderShareExpiry(anyString())).thenReturn(Collections.<Map<String, Object>>emptyList());
		when(dao.selectFileShareExpiry(anyLong(), anyString())).thenReturn(Collections.<String>emptyList());
	}

	private List<String> visible(String me) throws Exception {
		return service.listFolders(me).stream().map(DocFolderVO::getName).collect(Collectors.toList());
	}

	@DisplayName("볼 수 있는 폴더: 전사 공용·내 부서·내 개인함만. 하위폴더는 최상위를 따르고, 관리자는 모두")
	@Test
	void visibility() throws Exception {
		folder(1, null, "전사", "공용", null, null);
		folder(2, null, "생산", "공용", "생산부", null);
		folder(3, null, "영업", "공용", "영업부", null);
		folder(4, null, "내것", "개인", null, "0001");
		folder(5, null, "남의것", "개인", null, "0002");
		folder(6, 2L, "생산-위생", null, null, null);
		folder(7, 5L, "남의것-안", null, null, null);
		assertEquals(Arrays.asList("전사", "생산", "내것", "생산-위생"), visible("0001"));
		assertEquals(7, visible("0009").size());
		DocFolderVO sub = service.listFolders("0001").get(3);
		assertEquals("공용", sub.getRootKind());
		assertTrue(sub.isMine());
	}

	@DisplayName("잠긴 폴더: 자기는 보이되 개수는 숨기고 안은 빼며, 열면 보인다. 관리자는 늘 열려 있다")
	@Test
	void lockedFolder() throws Exception {
		DocFolderVO top = folder(1, null, "생산", "공용", "생산부", null);
		top.setLockHash("hash");
		top.setChildCount(1);
		folder(2, 1L, "비밀", null, null, null);
		List<DocFolderVO> list = service.listFolders("0001");
		assertEquals(1, list.size());
		assertTrue(list.get(0).isLocked());
		assertFalse(list.get(0).isUnlocked());
		assertNull(list.get(0).getChildCount());
		IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> service.listFiles("0001", 2));
		assertEquals("'생산' 폴더는 비밀번호가 걸려 있어요", ex.getMessage());

		when(hasher.matches("틀림", "hash")).thenReturn(false);
		assertEquals("비밀번호가 맞지 않아요", assertThrows(IllegalArgumentException.class, () -> service.unlock("0001", 1, "틀림")).getMessage());
		when(hasher.matches("1234", "hash")).thenReturn(true);
		service.unlock("0001", 1, " 1234 ");
		assertEquals(2, service.listFolders("0001").size());
		assertEquals(2, service.listFolders("0009").size());
		// 남의 부서 사람은 비밀번호를 맞춰볼 기회조차 없다
		assertEquals("이 폴더에 대한 권한이 없습니다. 관리자에게 문의해주세요.",
				assertThrows(IllegalArgumentException.class, () -> service.unlock("0002", 1, "1234")).getMessage());
		// 로그아웃하면 다시 잠긴다
		store.forget("0001");
		assertEquals(1, service.listFolders("0001").size());
	}

	@DisplayName("새 폴더: 부서 사람은 자기 부서로만, 부서가 없으면 못 만든다. 개인함은 내 것. 같은 이름은 막는다")
	@Test
	void createFolder() throws Exception {
		when(dao.insertFolder(any(), anyString(), any(), any(), any(), anyString(), anyString())).thenReturn(10L);
		DocFolderSaveVO req = new DocFolderSaveVO();
		req.setName("  ");
		assertEquals("폴더명을 입력해주세요", assertThrows(IllegalArgumentException.class, () -> service.createFolder("0001", req)).getMessage());
		req.setName("2026년 공문");
		assertEquals("공용문서함인지 개인문서함인지 골라주세요", assertThrows(IllegalArgumentException.class, () -> service.createFolder("0001", req)).getMessage());
		req.setKind("공용");
		req.setDepartment("영업부");
		assertEquals("생산부 것만 만들 수 있습니다. 다른 부서 문서함은 관리자에게 요청해주세요",
				assertThrows(IllegalArgumentException.class, () -> service.createFolder("0001", req)).getMessage());
		req.setDepartment("");
		assertEquals(10L, service.createFolder("0001", req));
		verify(dao).insertFolder(isNull(), eq("2026년 공문"), eq("공용"), eq("생산부"), isNull(), eq("0001"), anyString()); // 2026-10-26 만든 사람 사번
		// 관리자는 전사 공용(부서 비움)도
		service.createFolder("0009", req);
		verify(dao).insertFolder(isNull(), eq("2026년 공문"), eq("공용"), isNull(), isNull(), eq("0009"), anyString());
		// 부서 없는 사람
		when(dao.selectUser("0003")).thenReturn(user("0003", "사원3", " ", false));
		assertTrue(assertThrows(IllegalArgumentException.class, () -> service.createFolder("0003", req)).getMessage().startsWith("부서가 정해져 있지 않아"));
		// 개인함
		req.setKind("개인");
		service.createFolder("0002", req);
		verify(dao).insertFolder(isNull(), eq("2026년 공문"), eq("개인"), isNull(), eq("0002"), eq("0002"), anyString());
		// 하위폴더: 남의 부서 폴더 안에는 못 만들고, 같은 이름은 막는다
		folder(1, null, "생산", "공용", "생산부", null);
		DocFolderSaveVO sub = new DocFolderSaveVO();
		sub.setName("위생");
		sub.setParentId(1L);
		assertEquals("이 폴더에 대한 권한이 없습니다. 관리자에게 문의해주세요.", assertThrows(IllegalArgumentException.class, () -> service.createFolder("0002", sub)).getMessage());
		when(dao.countDuplicateName("위생", 1L, null)).thenReturn(1);
		assertEquals("같은 위치에 같은 이름의 폴더가 이미 있습니다", assertThrows(IllegalArgumentException.class, () -> service.createFolder("0001", sub)).getMessage());
		sub.setParentId(99L);
		assertEquals("상위 폴더를 찾을 수 없습니다", assertThrows(IllegalArgumentException.class, () -> service.createFolder("0001", sub)).getMessage());
	}

	@DisplayName("폴더 지우기: 비어있을 때만. 무엇 때문에 못 지우는지 알려준다")
	@Test
	void deleteFolder() throws Exception {
		DocFolderVO f = folder(1, null, "생산", "공용", "생산부", null);
		f.setChildCount(2);
		f.setFileCount(3);
		assertEquals("안에 하위폴더 2개 · 파일 3개가 들어있어 지울 수 없습니다",
				assertThrows(IllegalArgumentException.class, () -> service.deleteFolder("0001", 1)).getMessage());
		f.setChildCount(0);
		f.setFileCount(0);
		service.deleteFolder("0001", 1);
		verify(dao).deleteFolder(1L);
	}

	@DisplayName("비밀번호: 4자 이상, 바꿀 때는 지금 비밀번호(관리자는 없이), 정한 사람은 바로 열림. 없애기도 지금 비밀번호")
	@Test
	void lockAndClear() throws Exception {
		DocFolderVO f = folder(1, null, "생산", "공용", "생산부", null);
		DocLockRequestVO req = new DocLockRequestVO();
		req.setPassword("123");
		assertEquals("비밀번호는 4자 이상으로 정해주세요", assertThrows(IllegalArgumentException.class, () -> service.setLock("0001", 1, req)).getMessage());
		req.setPassword("1234");
		when(hasher.encode("1234")).thenReturn("h1");
		service.setLock("0001", 1, req);
		verify(dao).updateLock(eq(1L), eq("h1"), eq("0001"), anyString()); // 2026-10-26 잠근 사람 사번
		assertTrue(store.openedBy("0001").contains(1L));

		f.setLockHash("h1");
		req.setPassword("5678");
		req.setCurrent("0000");
		when(hasher.matches("0000", "h1")).thenReturn(false);
		assertEquals("지금 비밀번호가 맞지 않아요", assertThrows(IllegalArgumentException.class, () -> service.setLock("0001", 1, req)).getMessage());
		// 관리자는 지금 비밀번호 없이 새로 정해준다
		when(hasher.encode("5678")).thenReturn("h2");
		service.setLock("0009", 1, req);
		verify(dao).updateLock(eq(1L), eq("h2"), eq("0009"), anyString());

		assertEquals("지금 비밀번호가 맞지 않아요", assertThrows(IllegalArgumentException.class, () -> service.clearLock("0001", 1, "0000")).getMessage());
		when(hasher.matches("1234", "h1")).thenReturn(true);
		service.clearLock("0001", 1, "1234");
		verify(dao).updateLock(1L, null, null, null);
		f.setLockHash(null);
		assertEquals("이 폴더에는 비밀번호가 없어요", assertThrows(IllegalArgumentException.class, () -> service.clearLock("0001", 1, "1234")).getMessage());
	}

	@DisplayName("공유받은 폴더: 그 아래까지 보이고 내려받을 수 있지만, 올리기·지우기는 못 한다")
	@Test
	void sharedFolderIsReadOnly() throws Exception {
		folder(5, null, "남의것", "개인", null, "0002");
		folder(6, 5L, "보낸폴더", null, null, null);
		folder(7, 6L, "안쪽", null, null, null);
		Map<String, Object> share = new HashMap<>();
		share.put("folderId", 6);
		share.put("expiresAt", "");
		when(dao.selectFolderShareExpiry("0001")).thenReturn(Collections.singletonList(share));
		List<DocFolderVO> list = service.listFolders("0001");
		assertEquals(Arrays.asList("보낸폴더", "안쪽"), list.stream().map(DocFolderVO::getName).collect(Collectors.toList()));
		assertTrue(list.get(0).isSharedRoot());
		assertEquals(Long.valueOf(6), list.get(1).getSharedRootId());
		assertFalse(list.get(1).isMine());
		when(attachments.listByRefs(eq("document"), any())).thenReturn(new HashMap<String, List<AttachmentVO>>());
		when(dao.selectShareCounts(7L)).thenReturn(new HashMap<Long, Integer>());
		assertEquals(0, service.listFiles("0001", 7).size());
		assertEquals("공유받은 폴더는 볼 수만 있어요", assertThrows(IllegalArgumentException.class, () -> service.upload("0001", 7, null)).getMessage());
		// 기한이 지나면 아무것도 안 보인다
		share.put("expiresAt", "2000-01-01");
		assertEquals(0, service.listFolders("0001").size());
	}

	@DisplayName("내려받기: 나에게 공유된 문서는 폴더 권한 없이도, 아니면 그 폴더를 볼 수 있어야")
	@Test
	void download() throws Exception {
		folder(5, null, "남의것", "개인", null, "0002");
		AttachmentVO file = new AttachmentVO();
		file.setId(30L);
		file.setRefId("5");
		when(attachments.findDocument(30L)).thenReturn(file);
		assertThrows(IllegalArgumentException.class, () -> service.findForDownload("0001", 30));
		when(dao.selectFileShareExpiry(30L, "0001")).thenReturn(Collections.singletonList(""));
		assertSame(file, service.findForDownload("0001", 30));
		assertSame(file, service.findForDownload("0002", 30));
		// 공유받았어도 지우지는 못한다
		assertThrows(IllegalArgumentException.class, () -> service.deleteFile("0001", 30));
		verify(attachments, never()).deleteDocument(30L);
		service.deleteFile("0002", 30);
		verify(attachments).deleteDocument(30L);
	}

	@DisplayName("공유 보내기: 나는 빼고, 이미 보낸 사람은 건너뛰고, 보낸 만큼 메신저 1:1 방에 알림 글")
	@Test
	void share() throws Exception {
		folder(4, null, "내것", "개인", null, "0001");
		AttachmentVO file = new AttachmentVO();
		file.setId(30L);
		file.setRefId("4");
		file.setOrigName("계약서.pdf");
		when(attachments.findDocument(30L)).thenReturn(file);
		when(dao.selectEmployeeName("0002")).thenReturn("사원2");
		when(dao.selectEmployeeName("0003")).thenReturn("사원3");
		when(dao.insertShare(any())).thenReturn(1, 0);
		when(dao.selectDmRoom("0001_0002")).thenReturn(null, 50L);
		when(dao.insertDmRoom(eq("0001_0002"), eq("0001"), anyString())).thenReturn(1);
		when(dao.insertChatMessage(eq(50L), eq("0001"), eq("사원1"), anyString(), anyString())).thenReturn(700L);

		DocShareRequestVO req = new DocShareRequestVO();
		req.setAttachmentId(30L);
		req.setToEmployeeIds(Arrays.asList("0001"));
		assertEquals("나에게는 보낼 수 없어요", assertThrows(IllegalArgumentException.class, () -> service.share("0001", req)).getMessage());
		req.setToEmployeeIds(Arrays.asList("0003", " 0002 ", "0001", "0002"));
		req.setNote(" 확인 부탁 ");
		req.setExpiresAt("2026-12-31");
		DocShareResultVO result = service.share("0001", req);
		assertEquals(1, result.getSent());
		assertEquals(1, result.getAlready());
		assertTrue(result.getNoChat().isEmpty());
		ArgumentCaptor<DocShareRowVO> rows = ArgumentCaptor.forClass(DocShareRowVO.class);
		verify(dao, org.mockito.Mockito.times(2)).insertShare(rows.capture());
		assertEquals("0002", rows.getAllValues().get(0).getToEmployeeId());
		assertEquals("확인 부탁", rows.getAllValues().get(0).getNote());
		verify(dao).insertRoomMember(eq(50L), eq("0001"), eq("사원1"), anyString());
		verify(dao).insertRoomMember(eq(50L), eq("0002"), eq("사원2"), anyString());
		verify(dao).insertChatMessage(eq(50L), eq("0001"), eq("사원1"),
				eq("[문서 공유] '계약서.pdf' 파일을 보냈어요. (2026-12-31까지 볼 수 있어요)\n문서함의 '공유문서함' 탭에서 볼 수 있어요.\n— 확인 부탁"), anyString());
		verify(dao).updateLastRead(50L, "0001", 700L);

		// 남의 개인함 문서·공용함 문서는 못 보낸다
		assertEquals("내 개인문서함 문서만 공유할 수 있습니다", assertThrows(IllegalArgumentException.class, () -> service.share("0002", req)).getMessage());
		folder(1, null, "전사", "공용", null, null);
		file.setRefId("1");
		assertTrue(assertThrows(IllegalArgumentException.class, () -> service.share("0001", req)).getMessage().startsWith("공용문서함 문서는 공유하지 않아도"));
	}

	@DisplayName("폴더 공유 알림에는 비밀번호 안내가 붙는다. 기한 판단은 그 날까지")
	@Test
	void textAndExpiry() {
		assertEquals("[문서 공유] '위생' 폴더를 보냈어요.\n문서함의 '공유문서함' 탭에서 볼 수 있어요.\n(비밀번호가 걸려 있으면 따로 알려드릴게요)",
				DocumentBoxServiceImpl.shareText("위생", true, null, null));
		assertTrue(DocumentBoxServiceImpl.isLive(null, "2026-10-13"));
		assertTrue(DocumentBoxServiceImpl.isLive("2026-10-13", "2026-10-13"));
		assertFalse(DocumentBoxServiceImpl.isLive("2026-10-12", "2026-10-13"));
	}

	@DisplayName("받은 공유: 기한 지난 것 빼고 최근 위, 폴더는 열어뒀는지. 공유 취소는 보낸 사람(또는 관리자)만")
	@Test
	void sharesToMeAndCancel() throws Exception {
		DocShareVO old = new DocShareVO();
		old.setCreatedAt("2026-10-01T09:00:00");
		DocShareVO expired = new DocShareVO();
		expired.setCreatedAt("2026-10-05T09:00:00");
		expired.setExpiresAt("2000-01-01");
		DocShareVO folderShare = new DocShareVO();
		folderShare.setFolderId(6L);
		folderShare.setCreatedAt("2026-10-10T09:00:00");
		when(dao.selectSharesToMeFiles("0001")).thenReturn(new ArrayList<>(Arrays.asList(old, expired)));
		when(dao.selectSharesToMeFolders("0001")).thenReturn(new ArrayList<>(Arrays.asList(folderShare)));
		store.open("0001", 6);
		List<DocShareVO> list = service.sharesToMe("0001");
		assertEquals(Arrays.asList(folderShare, old), list);
		assertTrue(folderShare.isUnlocked());

		when(dao.selectShareOwner(5L)).thenReturn("0002");
		assertEquals("내가 보낸 공유만 취소할 수 있습니다", assertThrows(IllegalArgumentException.class, () -> service.cancelShare("0001", 5)).getMessage());
		service.cancelShare("0009", 5);
		service.cancelShare("0002", 5);
		verify(dao, org.mockito.Mockito.times(2)).deleteShare(5L);
		when(dao.selectShareOwner(6L)).thenReturn(null);
		assertEquals("공유를 찾을 수 없습니다", assertThrows(IllegalArgumentException.class, () -> service.cancelShare("0001", 6)).getMessage());
	}
}
