package egovframework.let.qm.temperature.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 품질관리 - 실시간 온도 그룹 요청 VO 클래스 (만들기 name · 이름 바꾸기 name→newName · 주기 name·seconds · 센서 옮기기 groupName)
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@Schema(description = "그룹 요청 VO 클래스 (만들기 name · 이름 바꾸기 name→newName · 주기 name·seconds · 센서 옮기기 groupName)")
@Getter
@Setter
public class TempGroupRequestVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String name;
    private String newName;
    private Integer seconds;
    private String groupName;
}
