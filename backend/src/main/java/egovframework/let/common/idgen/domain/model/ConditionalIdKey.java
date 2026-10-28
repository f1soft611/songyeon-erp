package egovframework.let.common.idgen.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 조건부 채번(ConditionalId) 키 모델
 *
 * <p>MSSQL {@code IDS2} 테이블을 대상으로 테이블명 + 조건값 조합별로
 * 다음 순번을 채번할 때 사용하는 파라미터 객체이다.</p>
 *
 * @author S-ERP
 * @since 2026.09.09
 * @version 1.0
 */
@Schema(description = "조건부 채번 키 모델")
@Getter
@Setter
public class ConditionalIdKey implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "채번 대상 테이블명")
    private String tableName;

    @Schema(description = "채번 조건값 1")
    private String condition1;

    @Schema(description = "채번 조건값 2")
    private String condition2;

    public ConditionalIdKey() {
    }

    public ConditionalIdKey(String tableName, String condition1, String condition2) {
        this.tableName = tableName;
        this.condition1 = condition1;
        this.condition2 = condition2;
    }
}
