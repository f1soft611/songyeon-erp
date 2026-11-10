package egovframework.let.groupware.realtime;

import static org.mockito.Mockito.*;

import org.junit.jupiter.api.Test;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.AbstractPlatformTransactionManager;
import org.springframework.transaction.support.DefaultTransactionStatus;
import org.springframework.transaction.support.TransactionTemplate;

// S_ERP RealtimePublisherTest(2026-11-02 알림 · 쪽지 실시간)와 같은 확인. 송연은 사람을 사번 문자열로 가리킨다(20261103_003)
class RealtimePublisherTest {

    private final RealtimeStreamService streams = mock(RealtimeStreamService.class);
    private final RealtimePublisher publisher = new RealtimePublisher(streams);
    private final TransactionTemplate transaction = new TransactionTemplate(new AbstractPlatformTransactionManager() {
        @Override protected Object doGetTransaction() { return new Object(); }
        @Override protected void doBegin(Object tx, TransactionDefinition definition) { }
        @Override protected void doCommit(DefaultTransactionStatus status) { }
        @Override protected void doRollback(DefaultTransactionStatus status) { }
    });

    @Test
    void sendsOnlyAfterSuccessfulCommit() {
        transaction.execute(status -> {
            publisher.publish(4L, "12", RealtimeArea.NOTIFICATION);
            verifyNoInteractions(streams);
            return null;
        });
        verify(streams).publish(4L, "12", RealtimeArea.NOTIFICATION);
    }

    @Test
    void rollbackDoesNotSend() {
        transaction.execute(status -> {
            publisher.publish(4L, "12", RealtimeArea.MESSAGE);
            status.setRollbackOnly();
            return null;
        });
        verifyNoInteractions(streams);
    }

    @Test
    void missingOrReadOnlyTransactionDoesNotSend() {
        publisher.publish(4L, "12", RealtimeArea.MESSAGE);
        transaction.setReadOnly(true);
        transaction.execute(status -> {
            publisher.publish(4L, "12", RealtimeArea.MESSAGE);
            return null;
        });
        verifyNoInteractions(streams);
    }

    @Test
    void deliveryFailureDoesNotFailCommittedBusiness() {
        doThrow(new IllegalStateException("disconnected")).when(streams)
                .publish(4L, "12", RealtimeArea.MESSAGE);
        transaction.execute(status -> {
            publisher.publish(4L, "12", RealtimeArea.MESSAGE);
            return null;
        });
        verify(streams).publish(4L, "12", RealtimeArea.MESSAGE);
    }
}
