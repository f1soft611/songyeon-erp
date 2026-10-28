package egovframework.let.qm.temperature.service.impl;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.let.system.serversettings.domain.model.ServerSettingVO;
import egovframework.let.qm.temperature.domain.model.TempChannelVO;
import egovframework.let.qm.temperature.domain.model.TempGroupVO;
import egovframework.let.qm.temperature.domain.model.TempReadingVO;
import egovframework.let.qm.temperature.domain.model.TempSensorVO;
import egovframework.let.qm.temperature.domain.model.TempSettingsVO;
import egovframework.let.qm.temperature.domain.repository.TemperatureDAO;
import egovframework.let.qm.temperature.service.RadionodeClient;
import egovframework.let.qm.temperature.service.TemperatureService;

/**
 * 품질관리 - 실시간 온도 서비스 구현 클래스 (송연 temperature.py 와 같은 규칙)
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@Service("temperatureService")
public class TemperatureServiceImpl extends EgovAbstractServiceImpl implements TemperatureService {

    private static final DateTimeFormatter ISO_SECONDS = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");

    private final TemperatureDAO temperatureDAO;
    private final RadionodeClient radionodeClient;

    public TemperatureServiceImpl(TemperatureDAO temperatureDAO, RadionodeClient radionodeClient) {
        this.temperatureDAO = temperatureDAO;
        this.radionodeClient = radionodeClient;
    }

    @Override
    public TempSettingsVO settings() throws Exception {
        ServerSettingVO s = radionodeClient.credential();
        String key = s.getApiKey() == null ? "" : s.getApiKey();
        TempSettingsVO out = new TempSettingsVO();
        out.setConfigured(!key.isEmpty() && s.getApiSecret() != null && !s.getApiSecret().isEmpty());
        // 키 앞 3글자 ... 뒤 2글자만(송연과 같음)
        out.setKeyPreview(key.isEmpty() ? "" : key.substring(0, Math.min(3, key.length())) + "..." + key.substring(Math.max(0, key.length() - 2)));
        return out;
    }

    @Override
    public List<TempSensorVO> listSensors() throws Exception {
        return temperatureDAO.selectSensors();
    }

    @Override
    public int createSensors(List<TempSensorVO> items) throws Exception {
        if (items == null || items.isEmpty()) {
            throw new IllegalArgumentException("등록할 채널을 선택해주세요");
        }
        String now = now();
        int created = 0;
        for (TempSensorVO it : items) {
            String name = trim(it.getName());
            String sensorId = trim(it.getSensorId());
            if (name.isEmpty() || sensorId.isEmpty()) {
                continue;
            }
            ensureGroup(it.getGroupName());
            it.setName(name);
            it.setSensorId(sensorId);
            it.setCreatedAt(now);
            temperatureDAO.insertSensor(it);
            created++;
        }
        return created;
    }

    @Override
    public void updateSensor(long id, TempSensorVO sensor) throws Exception {
        String name = trim(sensor.getName());
        String sensorId = trim(sensor.getSensorId());
        if (name.isEmpty() || sensorId.isEmpty()) {
            throw new IllegalArgumentException("센서 이름과 센서 ID는 필수입니다");
        }
        sensor.setId(id);
        sensor.setName(name);
        sensor.setSensorId(sensorId);
        sensor.setGroupName(emptyToNull(trim(sensor.getGroupName())));
        temperatureDAO.updateSensor(sensor);
    }

    @Override
    public void moveSensor(long id, String groupName) throws Exception {
        String g = emptyToNull(trim(groupName));
        ensureGroup(g);
        temperatureDAO.updateSensorGroup(id, g);
    }

    @Override
    public void deleteSensor(long id) throws Exception {
        temperatureDAO.deleteSensor(id);
    }

    // 센서에 쓰이고 있는데 아직 그룹 표에 없는 그룹명도 채워 넣는다(예전 자료 호환)
    @Override
    public List<TempGroupVO> listGroups() throws Exception {
        for (String name : temperatureDAO.selectUsedGroupNames()) {
            ensureGroup(name);
        }
        return temperatureDAO.selectGroups();
    }

    @Override
    public void createGroup(String name) throws Exception {
        String n = trim(name);
        if (n.isEmpty()) {
            throw new IllegalArgumentException("그룹명을 입력해주세요");
        }
        ensureGroup(n);
    }

    // 숫자가 아니면 0(끔)으로 둔다(송연과 같음)
    @Override
    public void setRefreshInterval(String name, Integer seconds) throws Exception {
        ensureGroup(name);
        temperatureDAO.updateGroupInterval(name, seconds == null ? 0 : seconds);
    }

    @Override
    public void deleteGroup(String name) throws Exception {
        temperatureDAO.ungroupSensors(name);
        temperatureDAO.deleteGroup(name);
    }

    @Override
    public void renameGroup(String name, String newName) throws Exception {
        String n = trim(newName);
        if (n.isEmpty()) {
            throw new IllegalArgumentException("새 그룹명을 입력해주세요");
        }
        if (!n.equals(name) && temperatureDAO.selectGroupInterval(n) != null) {
            throw new IllegalArgumentException("이미 있는 그룹명이에요");
        }
        // 주기는 옮겨 간다
        Integer interval = temperatureDAO.selectGroupInterval(name);
        temperatureDAO.deleteGroup(name);
        temperatureDAO.insertGroup(n, interval == null ? 0 : interval);
        temperatureDAO.renameSensorsGroup(name, n);
    }

    @Override
    public List<TempChannelVO> listChannels() throws Exception {
        RadionodeClient.Result data = radionodeClient.channelList(false);
        if (data.getError() != null) {
            throw new IllegalArgumentException(data.getError());
        }
        List<TempChannelVO> out = new ArrayList<>();
        for (Map<String, Object> r : data.getRows()) {
            TempChannelVO c = new TempChannelVO();
            c.setChannelKey(RadionodeClient.channelKey(r));
            c.setDeviceName(text(r.get("device_name")));
            c.setChName(text(r.get("ch_name")));
            c.setChUnit(text(r.get("ch_unit")));
            c.setChValue(r.get("ch_value"));
            out.add(c);
        }
        return out;
    }

    @Override
    public List<TempReadingVO> readings(boolean forceRefresh) throws Exception {
        List<TempSensorVO> sensors = temperatureDAO.selectSensors();
        List<TempReadingVO> out = new ArrayList<>();
        if (sensors.isEmpty()) {
            return out;
        }
        RadionodeClient.Result data = radionodeClient.channelList(forceRefresh);
        Map<String, Map<String, Object>> byKey = new HashMap<>();
        for (Map<String, Object> r : data.getRows()) {
            byKey.put(RadionodeClient.channelKey(r), r);
        }
        for (TempSensorVO s : sensors) {
            TempReadingVO row = new TempReadingVO();
            row.setId(s.getId());
            row.setName(s.getName());
            row.setMinTemp(s.getMinTemp());
            row.setMaxTemp(s.getMaxTemp());
            row.setGroupName(s.getGroupName());
            if (data.getError() != null) {
                // 타파쿨로365 자체를 못 부르면 등록된 센서 전부 같은 오류로 보인다
                row.setOk(false);
                row.setError(data.getError());
                out.add(row);
                continue;
            }
            Map<String, Object> ch = byKey.get(s.getSensorId());
            if (ch == null) {
                row.setOk(false);
                row.setError("이 채널을 타파쿨로365에서 더이상 찾을 수 없어요 (센서가 삭제되었거나 통신 문제일 수 있어요)");
                out.add(row);
                continue;
            }
            row.setOk(true);
            row.setValue(number(ch.get("ch_value")));
            row.setBattery(ch.get("battery"));
            row.setLastUpdate(text(ch.get("last_update")));
            row.setSensorModel(text(ch.get("sensor_model")));
            row.setDeviceName(text(ch.get("device_name")));
            row.setChName(text(ch.get("ch_name")));
            row.setChUnit(text(ch.get("ch_unit")));
            row.setOutOfRange(outOfRange(row.getValue(), s.getMinTemp(), s.getMaxTemp()));
            out.add(row);
        }
        return out;
    }

    /** 기준(최저·최고)을 벗어났는지. 값이나 기준이 비면 그 쪽은 보지 않는다 */
    static boolean outOfRange(Double value, Double min, Double max) {
        if (value == null) {
            return false;
        }
        return (min != null && value < min) || (max != null && value > max);
    }

    private void ensureGroup(String name) throws Exception {
        if (name != null && !name.isEmpty()) {
            temperatureDAO.ensureGroup(name);
        }
    }

    private static Double number(Object value) {
        if (value instanceof Number) {
            return ((Number) value).doubleValue();
        }
        if (value instanceof String) {
            try {
                return Double.valueOf(((String) value).trim());
            } catch (NumberFormatException ex) {
                return null;
            }
        }
        return null;
    }

    private static String now() {
        return LocalDateTime.now(ZoneId.of("Asia/Seoul")).format(ISO_SECONDS);
    }

    private static String text(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private static String trim(String value) {
        return value == null ? "" : value.trim();
    }

    private static String emptyToNull(String value) {
        return value == null || value.isEmpty() ? null : value;
    }
}
