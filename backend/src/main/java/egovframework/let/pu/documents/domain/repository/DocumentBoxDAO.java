package egovframework.let.pu.documents.domain.repository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.pu.documents.domain.model.DocFolderVO;
import egovframework.let.pu.documents.domain.model.DocPersonVO;
import egovframework.let.pu.documents.domain.model.DocShareRowVO;
import egovframework.let.pu.documents.domain.model.DocShareVO;
import egovframework.let.pu.documents.domain.model.DocUserVO;

/**
 * 구매관리 - 문서함 데이터 접근 클래스 (송연 document_folder · document_share · chat_rooms · chat_room_members · chat_messages)
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@Repository("documentBoxDAO")
public class DocumentBoxDAO extends EgovAbstractMapper {

    public DocUserVO selectUser(String id) throws Exception {
        return selectOne("DocumentBoxDAO.selectUser", id);
    }

    public List<DocFolderVO> selectFolders() throws Exception {
        return selectList("DocumentBoxDAO.selectFolders");
    }

    /** 나에게 온 폴더 공유 [{folderId, expiresAt}] */
    public List<Map<String, Object>> selectFolderShareExpiry(String toId) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("toId", toId);
        return selectList("DocumentBoxDAO.selectFolderShareExpiry", params);
    }

    /** 이 문서가 나에게 공유된 기한(빈 글자 = 기한 없음). 공유가 없으면 빈 목록 */
    public List<String> selectFileShareExpiry(long attachmentId, String toId) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("attachmentId", attachmentId);
        params.put("toId", toId);
        return selectList("DocumentBoxDAO.selectFileShareExpiry", params);
    }

    public int countDuplicateName(String name, Long parentId, Long excludeId) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("name", name);
        params.put("parentId", parentId);
        params.put("excludeId", excludeId);
        Integer count = selectOne("DocumentBoxDAO.countDuplicateName", params);
        return count == null ? 0 : count;
    }

    /** 폴더를 넣고 새 번호를 돌려준다 */
    public long insertFolder(Long parentId, String name, String kind, String department, String ownerId, String createdBy, String createdAt) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("parentId", parentId);
        params.put("name", name);
        params.put("kind", kind);
        params.put("department", department);
        params.put("ownerId", ownerId);
        params.put("createdBy", createdBy);
        params.put("createdAt", createdAt);
        insert("DocumentBoxDAO.insertFolder", params);
        return ((Number) params.get("id")).longValue();
    }

    public int updateFolderName(long id, String name) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("id", id);
        params.put("name", name);
        return update("DocumentBoxDAO.updateFolderName", params);
    }

    public int deleteFolder(long id) throws Exception {
        return delete("DocumentBoxDAO.deleteFolder", id);
    }

    /** 비밀번호 걸기·바꾸기(셋 다 값) 또는 없애기(셋 다 null) */
    public int updateLock(long id, String lockHash, String lockBy, String lockAt) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("id", id);
        params.put("lockHash", lockHash);
        params.put("lockBy", lockBy);
        params.put("lockAt", lockAt);
        return update("DocumentBoxDAO.updateLock", params);
    }

    /** 이 폴더 파일마다 공유된 사람 수 {attachmentId: 수} */
    public Map<Long, Integer> selectShareCounts(long folderId) throws Exception {
        Map<Long, Integer> out = new HashMap<>();
        List<Map<String, Object>> rows = selectList("DocumentBoxDAO.selectShareCounts", String.valueOf(folderId));
        for (Map<String, Object> row : rows) {
            out.put(((Number) row.get("attachmentId")).longValue(), ((Number) row.get("cnt")).intValue());
        }
        return out;
    }

    public String selectEmployeeName(String id) throws Exception {
        return selectOne("DocumentBoxDAO.selectEmployeeName", id);
    }

    /** 공유 한 줄. 이미 보낸 사람이면 0 */
    public int insertShare(DocShareRowVO row) throws Exception {
        return insert("DocumentBoxDAO.insertShare", row);
    }

    public List<DocPersonVO> selectPeople(String me) throws Exception {
        return selectList("DocumentBoxDAO.selectPeople", me);
    }

    public List<String> selectDepartments() throws Exception {
        return selectList("DocumentBoxDAO.selectDepartments");
    }

    public List<DocShareVO> selectSharesToMeFiles(String me) throws Exception {
        return selectList("DocumentBoxDAO.selectSharesToMeFiles", me);
    }

    public List<DocShareVO> selectSharesToMeFolders(String me) throws Exception {
        return selectList("DocumentBoxDAO.selectSharesToMeFolders", me);
    }

    public List<DocShareVO> selectSharesByMe(String me) throws Exception {
        return selectList("DocumentBoxDAO.selectSharesByMe", me);
    }

    public String selectShareOwner(long id) throws Exception {
        return selectOne("DocumentBoxDAO.selectShareOwner", id);
    }

    public int deleteShare(long id) throws Exception {
        return delete("DocumentBoxDAO.deleteShare", id);
    }

    public Long selectDmRoom(String dmKey) throws Exception {
        return selectOne("DocumentBoxDAO.selectDmRoom", dmKey);
    }

    public int insertDmRoom(String dmKey, String createdBy, String createdAt) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("dmKey", dmKey);
        params.put("createdBy", createdBy);
        params.put("createdAt", createdAt);
        return insert("DocumentBoxDAO.insertDmRoom", params);
    }

    public int insertRoomMember(long roomId, String employeeId, String employeeName, String joinedAt) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("roomId", roomId);
        params.put("employeeId", employeeId);
        params.put("employeeName", employeeName);
        params.put("joinedAt", joinedAt);
        return insert("DocumentBoxDAO.insertRoomMember", params);
    }

    /** 메신저 글 한 줄을 넣고 번호를 돌려준다 */
    public long insertChatMessage(long roomId, String senderId, String senderName, String content, String createdAt) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("roomId", roomId);
        params.put("senderId", senderId);
        params.put("senderName", senderName);
        params.put("content", content);
        params.put("createdAt", createdAt);
        insert("DocumentBoxDAO.insertChatMessage", params);
        return ((Number) params.get("id")).longValue();
    }

    public int updateLastRead(long roomId, String employeeId, long messageId) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("roomId", roomId);
        params.put("employeeId", employeeId);
        params.put("messageId", messageId);
        return update("DocumentBoxDAO.updateLastRead", params);
    }
}
