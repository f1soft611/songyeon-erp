package egovframework.let.common.idsequence.domain.repository;

import java.util.HashMap;
import java.util.Map;

import org.egovframe.rte.psl.dataaccess.EgovAbstractMapper;
import org.springframework.stereotype.Repository;

@Repository("idSequenceDAO")
public class IdSequenceDAO extends EgovAbstractMapper {

    public Long nextValue(String generatorKey, String scopeKey1, String scopeKey2) throws Exception {
        return selectOne("IdSequenceDAO.nextValue", createParams(generatorKey, scopeKey1, scopeKey2));
    }

    public void advanceToAtLeast(String generatorKey, String scopeKey1, String scopeKey2, Long minimumValue)
            throws Exception {
        Map<String, Object> params = createParams(generatorKey, scopeKey1, scopeKey2);
        params.put("minimumValue", minimumValue);
        update("IdSequenceDAO.advanceToAtLeast", params);
    }

    private Map<String, Object> createParams(String generatorKey, String scopeKey1, String scopeKey2) {
        Map<String, Object> params = new HashMap<>();
        params.put("generatorKey", generatorKey);
        params.put("scopeKey1", scopeKey1);
        params.put("scopeKey2", scopeKey2);
        return params;
    }
}