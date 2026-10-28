package egovframework.let.common.idsequence.service.impl;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import egovframework.let.common.idsequence.domain.repository.IdSequenceDAO;
import egovframework.let.common.idsequence.service.IdSequenceService;

@Service("idSequenceService")
public class IdSequenceServiceImpl extends EgovAbstractServiceImpl implements IdSequenceService {

    private final IdSequenceDAO idSequenceDAO;

    public IdSequenceServiceImpl(IdSequenceDAO idSequenceDAO) {
        this.idSequenceDAO = idSequenceDAO;
    }

    @Override
    public Long nextValue(String generatorKey, String scopeKey1, String scopeKey2) throws Exception {
        validateKey(generatorKey, scopeKey1, scopeKey2);
        Long value = idSequenceDAO.nextValue(generatorKey, scopeKey1, scopeKey2);
        if (value == null || value < 1L) {
            throw new IllegalStateException("Failed to generate sequence value");
        }
        return value;
    }

    @Override
    public void advanceToAtLeast(String generatorKey, String scopeKey1, String scopeKey2, Long minimumValue)
            throws Exception {
        validateKey(generatorKey, scopeKey1, scopeKey2);
        if (minimumValue == null || minimumValue < 0L) {
            throw new IllegalArgumentException("minimumValue must be greater than or equal to zero");
        }
        idSequenceDAO.advanceToAtLeast(generatorKey, scopeKey1, scopeKey2, minimumValue);
    }

    private void validateKey(String generatorKey, String scopeKey1, String scopeKey2) {
        if (!StringUtils.hasText(generatorKey) || scopeKey1 == null || scopeKey2 == null) {
            throw new IllegalArgumentException("Sequence key values must not be null or empty");
        }
    }
}