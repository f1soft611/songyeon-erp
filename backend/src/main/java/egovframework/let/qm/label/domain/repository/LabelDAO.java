package egovframework.let.qm.label.domain.repository;

import java.util.List;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

import egovframework.let.qm.label.domain.model.LabelVO;

/**
 * 제품 라벨 데이터 접근 클래스 (송연 product_label_versions · label_templates · label_marks · label_company_info · bom)
 * @author SONGYEON ERP
 * @since 2026.10.06
 * @version 1.0
 */
@Repository("labelDAO")
public class LabelDAO extends EgovAbstractMapper {

    public int countProduct(String code) throws Exception {
        return selectOne("LabelDAO.countProduct", code);
    }

    public LabelVO selectProductLabel(String code) throws Exception {
        return selectOne("LabelDAO.selectProductLabel", code);
    }

    public int countVersions(String code) throws Exception {
        return selectOne("LabelDAO.countVersions", code);
    }

    public int insertVersion(LabelVO version) throws Exception {
        return insert("LabelDAO.insertVersion", version);
    }

    public Long selectCurrentVersionId(String code) throws Exception {
        return selectOne("LabelDAO.selectCurrentVersionId", code);
    }

    public Long selectLatestVersionId(String code) throws Exception {
        return selectOne("LabelDAO.selectLatestVersionId", code);
    }

    public int updateVersionCurrent(long id) throws Exception {
        return update("LabelDAO.updateVersionCurrent", id);
    }

    public List<LabelVO> selectVersions(String code) throws Exception {
        return selectList("LabelDAO.selectVersions", code);
    }

    public LabelVO selectVersion(long id) throws Exception {
        return selectOne("LabelDAO.selectVersion", id);
    }

    public List<LabelVO> selectTemplates() throws Exception {
        return selectList("LabelDAO.selectTemplates");
    }

    public LabelVO selectTemplate(long id) throws Exception {
        return selectOne("LabelDAO.selectTemplate", id);
    }

    public List<LabelVO> selectMarks() throws Exception {
        return selectList("LabelDAO.selectMarks");
    }

    public LabelVO selectCompanyInfo() throws Exception {
        return selectOne("LabelDAO.selectCompanyInfo");
    }

    public List<LabelVO> selectProductBom(String code) throws Exception {
        return selectList("LabelDAO.selectProductBom", code);
    }

    public List<LabelVO> selectBomAllergens(String code) throws Exception {
        return selectList("LabelDAO.selectBomAllergens", code);
    }
}
