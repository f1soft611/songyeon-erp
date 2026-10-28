package egovframework.let.common.attachment.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.Collections;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockMultipartFile;

import egovframework.let.common.attachment.domain.model.AttachmentUploadResultVO;
import egovframework.let.common.attachment.domain.model.AttachmentVO;
import egovframework.let.common.attachment.domain.repository.AttachmentDAO;
import egovframework.let.common.attachment.service.AttachmentStorage;

class AttachmentServiceImplTest {

	@TempDir
	Path temp;

	@DisplayName("올리기: 송연과 같은 자리({scope}/{refId}/{ms}_{안전한이름})에 쓰고 표에 남긴다, 빈 파일은 까닭만, 하나도 못 올리면 막는다")
	@Test
	void upload() throws Exception {
		AttachmentDAO dao = mock(AttachmentDAO.class);
		AttachmentStorage storage = new AttachmentStorage(temp.toString());
		AttachmentServiceImpl service = new AttachmentServiceImpl(dao, storage);
		assertEquals("알 수 없는 첨부 대상입니다", assertThrows(IllegalArgumentException.class,
				() -> service.upload("document", "1", Collections.singletonList(new MockMultipartFile("files", "a.pdf", null, new byte[] { 1 })), "관리자")).getMessage());
		assertEquals("첨부할 대상이 필요합니다", assertThrows(IllegalArgumentException.class,
				() -> service.upload("receiving", " ", Collections.singletonList(new MockMultipartFile("files", "a.pdf", null, new byte[] { 1 })), "관리자")).getMessage());
		assertEquals("빈파일.pdf: 빈 파일입니다", assertThrows(IllegalArgumentException.class,
				() -> service.upload("receiving", "12", Collections.singletonList(new MockMultipartFile("files", "빈파일.pdf", null, new byte[0])), "관리자")).getMessage());

		AttachmentUploadResultVO result = service.upload("receiving", "12", Arrays.asList(
				new MockMultipartFile("files", "거래명세서 10월.pdf", null, "내용".getBytes(StandardCharsets.UTF_8)),
				new MockMultipartFile("files", "빈.txt", null, new byte[0])), "관리자");
		assertEquals(1, result.getSaved());
		assertEquals(Collections.singletonList("빈.txt: 빈 파일입니다"), result.getErrors());
		ArgumentCaptor<AttachmentVO> row = ArgumentCaptor.forClass(AttachmentVO.class);
		verify(dao).insertAttachment(row.capture());
		AttachmentVO saved = row.getValue();
		assertEquals("receiving", saved.getScope());
		assertEquals("12", saved.getRefId());
		assertEquals("거래명세서 10월.pdf", saved.getOrigName());
		assertTrue(saved.getStoredName().matches("\\d{13}_거래명세서 10월\\.pdf"), saved.getStoredName());
		assertEquals(Long.valueOf(6), saved.getSizeBytes());
		assertEquals("관리자", saved.getUploadedBy());
		Path written = temp.resolve("receiving").resolve("12").resolve(saved.getStoredName());
		assertEquals("내용", new String(Files.readAllBytes(written), StandardCharsets.UTF_8));
	}

	@DisplayName("표에 못 남기면 써둔 파일도 치운다")
	@Test
	void uploadRollsBackFile() throws Exception {
		AttachmentDAO dao = mock(AttachmentDAO.class);
		doAnswer(inv -> { throw new IllegalStateException("db"); }).when(dao).insertAttachment(any());
		AttachmentServiceImpl service = new AttachmentServiceImpl(dao, new AttachmentStorage(temp.toString()));
		assertThrows(IllegalStateException.class, () -> service.upload("receiving", "5",
				Collections.singletonList(new MockMultipartFile("files", "a.pdf", null, new byte[] { 1, 2 })), "관리자"));
		try (java.util.stream.Stream<Path> files = Files.list(temp.resolve("receiving").resolve("5"))) {
			assertEquals(0, files.count());
		}
	}

	@DisplayName("지우기: 표·공유·디스크를 같이, 대상이 사라지면 붙은 파일 모두, 저장이름에 경로 글자가 있으면 막는다")
	@Test
	void deleteAndSafety() throws Exception {
		AttachmentDAO dao = mock(AttachmentDAO.class);
		AttachmentStorage storage = new AttachmentStorage(temp.toString());
		AttachmentServiceImpl service = new AttachmentServiceImpl(dao, storage);
		String stored = storage.write("receiving", "7", "a.pdf", new byte[] { 1 });
		AttachmentVO row = new AttachmentVO();
		row.setId(3L);
		row.setScope("receiving");
		row.setRefId("7");
		row.setStoredName(stored);
		when(dao.selectOne(3L)).thenReturn(row);
		assertEquals(row, service.find(3L));
		service.delete(3L);
		verify(dao).deleteAttachment(3L);
		verify(dao).deleteShares(3L);
		assertFalse(Files.exists(temp.resolve("receiving").resolve("7").resolve(stored)));
		assertEquals("저장된 파일이 없습니다", assertThrows(IllegalArgumentException.class, () -> service.find(3L)).getMessage());
		assertEquals("파일을 찾을 수 없습니다", assertThrows(IllegalArgumentException.class, () -> service.delete(99L)).getMessage());

		String s1 = storage.write("receiving", "8", "b.pdf", new byte[] { 1 });
		AttachmentVO r1 = new AttachmentVO();
		r1.setStoredName(s1);
		when(dao.selectByRefs("receiving", Collections.singletonList("8"))).thenReturn(Collections.singletonList(r1));
		service.deleteAllFor("receiving", "8");
		verify(dao).deleteByRef("receiving", "8");
		assertFalse(Files.exists(temp.resolve("receiving").resolve("8").resolve(s1)));

		AttachmentVO evil = new AttachmentVO();
		evil.setScope("receiving");
		evil.setRefId("7");
		evil.setStoredName("../../밖.txt");
		when(dao.selectOne(4L)).thenReturn(evil);
		assertEquals("파일을 찾을 수 없습니다", assertThrows(IllegalArgumentException.class, () -> service.find(4L)).getMessage());
		assertThrows(IllegalArgumentException.class, () -> storage.dir("receiving", "../x"));
		verify(dao, never()).deleteAttachment(4L);
	}

	@DisplayName("안전한 이름: 경로·특수문자는 밑줄, 한글·괄호·공백은 남김, 120자까지")
	@Test
	void safeName() {
		assertEquals("passwd", AttachmentStorage.safeName("../../etc/passwd"));
		assertEquals("성적서 (1).pdf", AttachmentStorage.safeName("C:\\docs\\성적서 (1).pdf"));
		assertEquals("a_b_.pdf", AttachmentStorage.safeName("a*b?.pdf"));
		assertEquals("file", AttachmentStorage.safeName(""));
		assertEquals(120, AttachmentStorage.safeName(new String(new char[200]).replace('\0', 'x')).length());
	}

	@DisplayName("문서함 파일: 문서함 API 로만 올리고 찾고 지운다. 범용 find·delete 로는 닿지 않는다")
	@Test
	void documentScope() throws Exception {
		AttachmentDAO dao = mock(AttachmentDAO.class);
		AttachmentServiceImpl service = new AttachmentServiceImpl(dao, new AttachmentStorage(temp.toString()));
		AttachmentUploadResultVO result = service.uploadDocuments(7, Collections.singletonList(
				new MockMultipartFile("files", "공문.hwp", null, new byte[] { 1, 2 })), "관리자");
		assertEquals(1, result.getSaved());
		ArgumentCaptor<AttachmentVO> row = ArgumentCaptor.forClass(AttachmentVO.class);
		verify(dao).insertAttachment(row.capture());
		assertEquals("document", row.getValue().getScope());
		assertEquals("7", row.getValue().getRefId());

		AttachmentVO doc = row.getValue();
		doc.setId(40L);
		when(dao.selectOne(40L)).thenReturn(doc);
		assertEquals("파일을 찾을 수 없습니다", assertThrows(IllegalArgumentException.class, () -> service.find(40L)).getMessage());
		assertEquals("파일을 찾을 수 없습니다", assertThrows(IllegalArgumentException.class, () -> service.delete(40L)).getMessage());
		assertEquals(doc, service.findDocument(40L));
		service.deleteDocument(40L);
		verify(dao).deleteAttachment(40L);
		verify(dao).deleteShares(40L);
		assertFalse(Files.exists(temp.resolve("document").resolve("7").resolve(doc.getStoredName())));

		AttachmentVO recv = new AttachmentVO();
		recv.setScope("receiving");
		when(dao.selectOne(41L)).thenReturn(recv);
		assertEquals("파일을 찾을 수 없습니다", assertThrows(IllegalArgumentException.class, () -> service.findDocument(41L)).getMessage());
	}
}
