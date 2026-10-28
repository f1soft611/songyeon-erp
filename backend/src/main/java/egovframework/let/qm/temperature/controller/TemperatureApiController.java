package egovframework.let.qm.temperature.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;
import egovframework.let.qm.temperature.domain.model.TempBulkRequestVO;
import egovframework.let.qm.temperature.domain.model.TempGroupRequestVO;
import egovframework.let.qm.temperature.domain.model.TempSensorVO;
import egovframework.let.qm.temperature.service.TemperatureService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/**
 * 품질관리 > 실시간 온도 컨트롤러 클래스 (송연 /api/temp/* 를 S_ERP 규칙으로 옮김)
 * 그룹 이름은 주소가 아니라 본문으로 받는다(이름에 '/' 같은 글자가 들어가도 되게).
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/qm/temperature")
@Tag(name = "TemperatureApiController", description = "품질관리 - 실시간 온도")
public class TemperatureApiController {

    private static final String TAG = "TemperatureApiController";

    private final ResultVoHelper resultVoHelper;
    private final TemperatureService temperatureService;

    private interface Work {
        void run(Map<String, Object> resultMap) throws Exception;
    }

    private ResultVO handle(Work work) throws Exception {
        Map<String, Object> resultMap = new HashMap<>();
        try {
            work.run(resultMap);
            return resultVoHelper.buildFromMap(resultMap, ResponseCode.SUCCESS);
        } catch (IllegalArgumentException ex) {
            return resultVoHelper.buildFromMap(new HashMap<String, Object>(), ResponseCode.INPUT_CHECK_ERROR, ex.getMessage());
        }
    }

    @Operation(summary = "타파쿨로365 연동 여부 {configured, keyPreview}", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/settings")
    public ResultVO settings() throws Exception {
        return handle(map -> map.put("item", temperatureService.settings()));
    }

    @Operation(summary = "등록된 센서", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/sensors")
    public ResultVO sensors() throws Exception {
        return handle(map -> map.put("resultList", temperatureService.listSensors()));
    }

    @Operation(summary = "센서 일괄등록 {items:[{name, sensorId, minTemp, maxTemp, groupName}]} → {created}", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PostMapping("/sensors/bulk")
    public ResultVO createSensors(@RequestBody TempBulkRequestVO request) throws Exception {
        return handle(map -> map.put("created", temperatureService.createSensors(request.getItems())));
    }

    @Operation(summary = "센서 수정 {name, sensorId, minTemp, maxTemp, groupName}", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PutMapping("/sensors/{id}")
    public ResultVO updateSensor(@PathVariable("id") long id, @RequestBody TempSensorVO request) throws Exception {
        return handle(map -> temperatureService.updateSensor(id, request));
    }

    @Operation(summary = "센서를 다른 그룹으로 옮기기 {groupName}(비우면 미분류)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PutMapping("/sensors/{id}/group")
    public ResultVO moveSensor(@PathVariable("id") long id, @RequestBody TempGroupRequestVO request) throws Exception {
        return handle(map -> temperatureService.moveSensor(id, request.getGroupName()));
    }

    @Operation(summary = "센서 삭제", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @DeleteMapping("/sensors/{id}")
    public ResultVO deleteSensor(@PathVariable("id") long id) throws Exception {
        return handle(map -> temperatureService.deleteSensor(id));
    }

    @Operation(summary = "그룹 목록과 새로고침 주기", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/groups")
    public ResultVO groups() throws Exception {
        return handle(map -> map.put("resultList", temperatureService.listGroups()));
    }

    @Operation(summary = "빈 그룹 만들기 {name}", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PostMapping("/groups")
    public ResultVO createGroup(@RequestBody TempGroupRequestVO request) throws Exception {
        return handle(map -> temperatureService.createGroup(request.getName()));
    }

    @Operation(summary = "그룹 새로고침 주기 {name, seconds}(0 = 끔)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PutMapping("/groups/refresh-interval")
    public ResultVO setRefreshInterval(@RequestBody TempGroupRequestVO request) throws Exception {
        return handle(map -> temperatureService.setRefreshInterval(request.getName(), request.getSeconds()));
    }

    @Operation(summary = "그룹 이름 바꾸기 {name, newName}", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @PutMapping("/groups/rename")
    public ResultVO renameGroup(@RequestBody TempGroupRequestVO request) throws Exception {
        return handle(map -> temperatureService.renameGroup(request.getName(), request.getNewName()));
    }

    @Operation(summary = "그룹 삭제(?name=). 그 안의 센서는 미분류로", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @DeleteMapping("/groups")
    public ResultVO deleteGroup(@RequestParam("name") String name) throws Exception {
        return handle(map -> temperatureService.deleteGroup(name));
    }

    @Operation(summary = "타파쿨로365 장치·채널 목록", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/channels")
    public ResultVO channels() throws Exception {
        return handle(map -> map.put("resultList", temperatureService.listChannels()));
    }

    @Operation(summary = "센서마다 지금 값(?force=1 이면 20초 담아둔 값을 쓰지 않고 새로)", security = { @SecurityRequirement(name = "Authorization") }, tags = { TAG })
    @GetMapping("/readings")
    public ResultVO readings(@RequestParam(name = "force", required = false) String force) throws Exception {
        return handle(map -> map.put("resultList", temperatureService.readings("1".equals(force))));
    }
}
