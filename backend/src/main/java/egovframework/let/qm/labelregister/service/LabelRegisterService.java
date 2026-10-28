package egovframework.let.qm.labelregister.service;

import java.util.List;
import java.util.Map;

import egovframework.let.qm.label.domain.model.LabelVO;
import egovframework.let.qm.labelregister.domain.model.LabelContentVO;
import egovframework.let.qm.labelregister.domain.model.LabelFieldVO;
import egovframework.let.qm.labelregister.domain.model.LabelMarkSaveVO;
import egovframework.let.qm.labelregister.domain.model.LabelProductRowVO;
import egovframework.let.qm.labelregister.domain.model.LabelRequestVO;
import egovframework.let.qm.labelregister.domain.model.LabelSourceProductVO;
import egovframework.let.qm.labelregister.domain.model.LabelTemplateSaveVO;
import egovframework.let.qm.labelregister.domain.model.LabelVersionRequestVO;

/**
 * 품질관리 - 라벨등록 서비스 인터페이스 (송연 label.py 의 저장 · 버전 · 양식 · 마크 · 항목 · 회사 고정정보 · 표시사항 요청)
 * 버전 목록 · 버전 한 개 · 양식 · 마크 · 회사정보 · 배합표 '조회' 는 라벨출력과 함께 쓰는 공용 라벨 API(LabelService)가 맡는다.
 *
 * ■ 라벨 정보는 두 군데에 있다
 *   products 표       = 지금 인쇄되는 내용('사용중' 버전의 사본. 라벨출력처럼 products 를 읽는 곳이 있어서 둔다)
 *   버전 표           = 지나간 내용까지 포함한 전체
 *   새 버전은 '새 버전' 을 눌렀을 때만 생기고, '이 버전 사용' 을 눌러야 인쇄에 반영된다.
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
public interface LabelRegisterService {

    /** 라벨등록 목록(사용안함 제품 빼고, 이름·코드로 찾기). labelState: 네 칸이 다 차면 done */
    List<LabelProductRowVO> listProducts(String q) throws Exception;

    /** 라벨 내용 저장 → {versionId, isCurrent}. 고른 버전(없으면 사용중)에 저장하고, 사용중이면 products 에도 */
    Map<String, Object> saveLabel(String code, LabelContentVO content, String who) throws Exception;

    /** 라벨 모양(크기 · 양식 · 분리배출마크) 저장. 내용과 같이 버전에 */
    void saveLayout(String code, Map<String, Object> body, String who) throws Exception;

    /** 새 버전 → {id, versionLabel}. 고른 버전을 베껴 시작하고, 사용중은 아니다 */
    Map<String, Object> newVersion(String code, LabelVersionRequestVO request, String who) throws Exception;

    void renameVersion(long id, LabelVersionRequestVO request) throws Exception;

    /** 이 버전을 사용중으로 → 이때부터 이 내용으로 인쇄된다 */
    void useVersion(long id) throws Exception;

    /** 사용중 버전과 마지막 남은 버전은 못 지운다 */
    void deleteVersion(long id) throws Exception;

    List<LabelSourceProductVO> sourceProducts(String exclude, String q) throws Exception;

    /** 양식 만들기(id 가 없으면) · 고치기 → 양식 번호 */
    long saveTemplate(Long id, LabelTemplateSaveVO request) throws Exception;

    void deleteTemplate(long id) throws Exception;

    /** 이 양식을 쓰는 제품 {count, products} */
    Map<String, Object> templateUsage(long id) throws Exception;

    long addMark(LabelMarkSaveVO request) throws Exception;

    /** 쓰고 있는 마크는 못 지운다 */
    void deleteMark(long id) throws Exception;

    List<LabelFieldVO> listFields() throws Exception;

    LabelFieldVO addField(String name) throws Exception;

    /** 양식에서 쓰고 있는 항목은 못 지운다 */
    void deleteField(long id) throws Exception;

    void updateCompanyInfo(LabelVO info) throws Exception;

    /** 표시사항 요청 목록(status 로 거르기, 최근 위) */
    List<LabelRequestVO> listRequests(String status) throws Exception;

    /** 요청 한 건(배합표 포함). 제품명이 없으면 레시피명 */
    LabelRequestVO getRequest(long id) throws Exception;

    /** 미리 적어두는 표시사항 저장 → 상태(done · requested) */
    String saveRequest(long id, LabelContentVO content, String who) throws Exception;

    /** 제품으로 옮기기 → {productCode, copiedFields}. 비어있는 칸은 제품 값을 덮어쓰지 않는다 */
    Map<String, Object> moveRequest(long id, String productCode, String who) throws Exception;
}
