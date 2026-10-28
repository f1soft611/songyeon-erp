package egovframework.let.common.idsequence.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import egovframework.let.common.idsequence.domain.repository.IdSequenceDAO;

class IdSequenceServiceImplTest {

    @Mock
    private IdSequenceDAO idSequenceDAO;

    private IdSequenceServiceImpl service;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        service = new IdSequenceServiceImpl(idSequenceDAO);
    }

    @Test
    void returnsTheNextValueFromTheAtomicDaoOperation() throws Exception {
        when(idSequenceDAO.nextValue("COMMON_CODE_ITEM_CODE", "24", "")).thenReturn(1000L);

        Long nextValue = service.nextValue("COMMON_CODE_ITEM_CODE", "24", "");

        assertThat(nextValue).isEqualTo(1000L);
    }

    @Test
    void rejectsBlankGeneratorKey() {
        assertThatThrownBy(() -> service.nextValue(" ", "24", ""))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void advancesTheCounterWithoutMovingItBackwards() throws Exception {
        service.advanceToAtLeast("COMMON_CODE_ITEM_CODE", "24", "", 1000L);

        verify(idSequenceDAO).advanceToAtLeast("COMMON_CODE_ITEM_CODE", "24", "", 1000L);
    }
}