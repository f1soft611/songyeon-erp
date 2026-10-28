package egovframework.let.common.idsequence.service;

public interface IdSequenceService {

    Long nextValue(String generatorKey, String scopeKey1, String scopeKey2) throws Exception;

    void advanceToAtLeast(String generatorKey, String scopeKey1, String scopeKey2, Long minimumValue)
            throws Exception;
}