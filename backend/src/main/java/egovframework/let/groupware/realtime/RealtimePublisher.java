package egovframework.let.groupware.realtime;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Service
public class RealtimePublisher {

    private static final Logger LOGGER = LoggerFactory.getLogger(RealtimePublisher.class);
    private final RealtimeStreamService streams;

    public RealtimePublisher(RealtimeStreamService streams) {
        this.streams = streams;
    }

    // 송연: 사람은 사번 문자열이다(20261103_003)
    public void publish(Long tenantId, String userId, RealtimeArea area) {
        if (tenantId == null || tenantId <= 0 || userId == null || userId.trim().isEmpty() || area == null
                || !TransactionSynchronizationManager.isActualTransactionActive()
                || !TransactionSynchronizationManager.isSynchronizationActive()
                || TransactionSynchronizationManager.isCurrentTransactionReadOnly()) {
            return;
        }
        try {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    try {
                        streams.publish(tenantId, userId.trim(), area);
                    } catch (RuntimeException exception) {
                        LOGGER.warn("Realtime delivery failed; clients will resynchronize.");
                    }
                }
            });
        } catch (RuntimeException exception) {
            LOGGER.warn("Realtime signal could not be scheduled; clients will resynchronize.");
        }
    }
}
