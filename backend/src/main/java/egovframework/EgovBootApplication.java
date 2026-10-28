package egovframework;

import org.springframework.boot.Banner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.web.servlet.ServletComponentScan;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.web.servlet.support.SpringBootServletInitializer;

@Slf4j
@ServletComponentScan
@SpringBootApplication
public class EgovBootApplication extends SpringBootServletInitializer {

	@Override
	protected SpringApplicationBuilder configure(SpringApplicationBuilder builder) {
		return builder.sources(EgovBootApplication.class);
	}

	public static void main(String[] args) {
		log.debug("##### EgovBootApplication Start #####");

		SpringApplication springApplication = new SpringApplication(EgovBootApplication.class);
		springApplication.setBannerMode(Banner.Mode.OFF);
		//springApplication.setLogStartupInfo(false);
		springApplication.run(EgovBootApplication.class, args);

		log.debug("##### EgovBootApplication End ######");
	}

}
