package egovframework.let.co.master.partnermaster.domain.model;

import java.io.Serializable;

import com.fasterxml.jackson.annotation.JsonIgnore;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 기초정보 - 거래처마스터 VO 클래스 (송연 clients)
 * 거래처명은 수주→생산→출하→매출을 잇는 이름이라, 여기 등록된 이름만 다른 화면에서 고를 수 있다.
 * 등록·수정 요청 값으로도 쓴다.
 * @author SONGYEON ERP
 * @since 2026.10.02
 * @version 1.0
 */
@Schema(description = "거래처(거래처BOM) 모델")
@Getter
@Setter
public class PartnerMasterVO implements Serializable {

    private static final long serialVersionUID = 1L;

    @Schema(description = "거래처 ID")
    private Long id;

    @Schema(description = "거래처명(상호)")
    private String name;

    @Schema(description = "거래처코드(6자리 숫자, 서버 자동번호 2026-10-23). 화면에서 보낸 값은 쓰지 않는다")
    private String clientCode;

    @Schema(description = "사용여부 Y/N(2026-10-23). 등록 · 수정 · 엑셀 올리기는 바꾸지 않고 사용여부 API 로만 바꾼다")
    private String useYn;

    @Schema(description = "분류 코드(공통코드 CUSTOMER_CATEGORY, 2026-10-23 부터 코드로 저장. 예: 001 매입거래처)")
    private String clientType;

    @Schema(description = "분류 이름(공통코드 CUSTOMER_CATEGORY 와 이어 읽는다)")
    private String clientTypeNm;

    @Schema(description = "사업자등록번호(XXX-XX-XXXXX)")
    private String businessNo;

    @Schema(description = "대표자명")
    private String ceoName;

    @Schema(description = "업태")
    private String businessType;

    @Schema(description = "종목")
    private String businessItem;

    @Schema(description = "전화")
    private String phone;

    @Schema(description = "팩스")
    private String fax;

    @Schema(description = "모바일")
    private String mobile;

    @Schema(description = "Email")
    private String email;

    @Schema(description = "우편번호")
    private String zipcode;

    @Schema(description = "주소")
    private String address;

    @Schema(description = "상세주소")
    private String addressDetail;

    @Schema(description = "메모(담당자, 계좌번호, 특이사항 등)")
    private String memo;

    @JsonIgnore
    private String createdAt;

    // 등록자 · 수정자 사번(2026-10-23): 화면에서 받지 않고 서버가 로그인 사원으로 채운다
    @JsonIgnore
    private String regUserId;

    @JsonIgnore
    private String updUserId;

    @Schema(description = "등록자 이름(사원 이름, 없으면 사번)")
    private String regUserNm;

    @Schema(description = "등록일시(created_at, YYYY-MM-DD HH:MM:SS)")
    private String regDt;

    @Schema(description = "수정자 이름(사원 이름, 없으면 사번)")
    private String updUserNm;

    @Schema(description = "수정일시(YYYY-MM-DD HH24:MI:SS)")
    private String updDt;
}
