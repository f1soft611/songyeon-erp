package egovframework.let.qm.temperature.service;

import java.util.List;

import egovframework.let.qm.temperature.domain.model.TempChannelVO;
import egovframework.let.qm.temperature.domain.model.TempGroupVO;
import egovframework.let.qm.temperature.domain.model.TempReadingVO;
import egovframework.let.qm.temperature.domain.model.TempSensorVO;
import egovframework.let.qm.temperature.domain.model.TempSettingsVO;

/**
 * 품질관리 - 실시간 온도 서비스 인터페이스 (송연 temperature.py)
 * 창고·냉장고에 붙인 온도센서 값을 타파쿨로365 에서 받아와 보여준다. 센서를 그룹(예: 1번 냉장고)으로 묶고, 그룹마다 조회 주기를 정한다.
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
public interface TemperatureService {

    TempSettingsVO settings() throws Exception;

    List<TempSensorVO> listSensors() throws Exception;

    /** 전체 채널 목록에서 여러 개를 골라 한 번에 등록. 등록한 수 */
    int createSensors(List<TempSensorVO> items) throws Exception;

    void updateSensor(long id, TempSensorVO sensor) throws Exception;

    /** 끌어다 놓아 그룹을 옮긴다(빈 이름 = 미분류) */
    void moveSensor(long id, String groupName) throws Exception;

    void deleteSensor(long id) throws Exception;

    /** 그룹 전부(센서가 있는 그룹 + 미리 만들어둔 빈 그룹)와 새로고침 주기 */
    List<TempGroupVO> listGroups() throws Exception;

    void createGroup(String name) throws Exception;

    void setRefreshInterval(String name, Integer seconds) throws Exception;

    /** 그룹을 지운다. 그 안의 센서는 미분류로 */
    void deleteGroup(String name) throws Exception;

    void renameGroup(String name, String newName) throws Exception;

    /** 등록 창에서 고를 타파쿨로365 장치·채널 */
    List<TempChannelVO> listChannels() throws Exception;

    /** 등록된 센서마다 지금 값 · 기준 벗어남 */
    List<TempReadingVO> readings(boolean forceRefresh) throws Exception;
}
