package egovframework.let.system.roles.domain.model;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 역할별 사용자 매핑 목록 응답 VO
 * @author S-ERP
 * @since 2026.09.03
 * @version 1.0
 */
@Schema(description = "역할 사용자 매핑 목록 응답 모델")
@Getter
@Setter
public class SystemRoleUserMapListVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "현재 역할에 연결된 사용자 목록")
    private List<SystemRoleUserVO> assignedUsers = new ArrayList<>();

    @Schema(description = "현재 역할에 미연결된 사용자 목록")
    private List<SystemRoleUserVO> unassignedUsers = new ArrayList<>();

    public SystemRoleUserMapListVO() {
    }

    public SystemRoleUserMapListVO(List<SystemRoleUserVO> assignedUsers, List<SystemRoleUserVO> unassignedUsers) {
        this.assignedUsers = assignedUsers == null ? new ArrayList<>() : assignedUsers;
        this.unassignedUsers = unassignedUsers == null ? new ArrayList<>() : unassignedUsers;
    }
}
