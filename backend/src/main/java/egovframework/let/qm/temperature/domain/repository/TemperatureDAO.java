package egovframework.let.qm.temperature.domain.repository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.qm.temperature.domain.model.TempGroupVO;
import egovframework.let.qm.temperature.domain.model.TempSensorVO;

/**
 * 품질관리 - 실시간 온도 데이터 접근 클래스 (송연 temp_sensors · temp_groups)
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@Repository("temperatureDAO")
public class TemperatureDAO extends EgovAbstractMapper {

    public List<TempSensorVO> selectSensors() throws Exception {
        return selectList("TemperatureDAO.selectSensors");
    }

    public int insertSensor(TempSensorVO sensor) throws Exception {
        return insert("TemperatureDAO.insertSensor", sensor);
    }

    public int updateSensor(TempSensorVO sensor) throws Exception {
        return update("TemperatureDAO.updateSensor", sensor);
    }

    public int updateSensorGroup(long id, String groupName) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("id", id);
        params.put("groupName", groupName);
        return update("TemperatureDAO.updateSensorGroup", params);
    }

    public int deleteSensor(long id) throws Exception {
        return delete("TemperatureDAO.deleteSensor", id);
    }

    public int ensureGroup(String name) throws Exception {
        return insert("TemperatureDAO.ensureGroup", name);
    }

    public List<String> selectUsedGroupNames() throws Exception {
        return selectList("TemperatureDAO.selectUsedGroupNames");
    }

    public List<TempGroupVO> selectGroups() throws Exception {
        return selectList("TemperatureDAO.selectGroups");
    }

    /** 그룹의 새로고침 주기. 그룹이 없으면 null */
    public Integer selectGroupInterval(String name) throws Exception {
        return selectOne("TemperatureDAO.selectGroupInterval", name);
    }

    public int updateGroupInterval(String name, int seconds) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("name", name);
        params.put("seconds", seconds);
        return update("TemperatureDAO.updateGroupInterval", params);
    }

    public int ungroupSensors(String name) throws Exception {
        return update("TemperatureDAO.ungroupSensors", name);
    }

    public int deleteGroup(String name) throws Exception {
        return delete("TemperatureDAO.deleteGroup", name);
    }

    public int insertGroup(String name, int seconds) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("name", name);
        params.put("seconds", seconds);
        return insert("TemperatureDAO.insertGroup", params);
    }

    public int renameSensorsGroup(String name, String newName) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("name", name);
        params.put("newName", newName);
        return update("TemperatureDAO.renameSensorsGroup", params);
    }
}
