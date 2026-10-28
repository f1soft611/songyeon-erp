package egovframework.let.pu.documents.domain.model;

import java.io.Serializable;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 구매관리 - 문서함 폴더 만들기·이름 바꾸기 요청 VO 클래스
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@Schema(description = "폴더 만들기·이름 바꾸기 요청 VO 클래스")
@Getter
@Setter
public class DocFolderSaveVO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String name;
    private Long parentId;
    private String kind;
    private String department;
}
