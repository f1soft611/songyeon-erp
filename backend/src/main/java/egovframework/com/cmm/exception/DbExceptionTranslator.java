package egovframework.com.cmm.exception;

import com.microsoft.sqlserver.jdbc.SQLServerException;
import org.springframework.dao.DataAccessException;

public class DbExceptionTranslator {

    private DbExceptionTranslator() {}

    public static BizException translate(DataAccessException e) {

        Throwable root = e.getMostSpecificCause();

        if (root instanceof SQLServerException) {
            SQLServerException sqlEx = (SQLServerException) root;

            switch (sqlEx.getErrorCode()) {
                case 8152:
                    return new BizException("입력값 길이가 초과되었습니다.");
                case 2627:
                    return new BizException("이미 존재하는 데이터입니다.");
                case 547:
                    return new BizException("참조 무결성 오류가 발생했습니다.");
                default:
                    return new BizException("DB 오류가 발생했습니다.");
            }
        }

        return new BizException("저장 중 시스템 오류가 발생했습니다.");
    }
}
