package egovframework.com.common.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import egovframework.com.cmm.LoginVO;
import egovframework.com.cmm.ResponseCode;
import egovframework.com.cmm.service.ResultVO;
import egovframework.com.cmm.util.ResultVoHelper;

class CommonSystemDateApiControllerTest {

    @Test
    void returnsSystemDateAsIsoDate() {
        CommonSystemDateApiController controller =
                new CommonSystemDateApiController(new ResultVoHelper());
        LoginVO user = new LoginVO();
        user.setTenantId(1L);

        ResultVO response = controller.getSystemDate(user);

        assertThat(response.getResultCode()).isEqualTo(ResponseCode.SUCCESS.getCode());
        Object today = response.getResult().get("today");
        assertThat(today).isInstanceOf(String.class);
        assertThat(LocalDate.parse((String) today).toString()).isEqualTo(today);
    }

    @Test
    void rejectsUnauthenticatedUser() {
        CommonSystemDateApiController controller =
                new CommonSystemDateApiController(new ResultVoHelper());

        assertThatThrownBy(() -> controller.getSystemDate(null))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        exception -> assertThat(exception.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED));
    }
}
