package egovframework.let.pu.documents.domain.model;

import java.io.Serializable;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 구매관리 - 문서함 공유 보내기 결과 VO 클래스
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@Schema(description = "공유 보내기 결과 VO 클래스")
@Getter
@Setter
public class DocShareResultVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private int sent;
    private int already;
    private List<String> noChat;
}
