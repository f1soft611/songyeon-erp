package egovframework.com.security;

import egovframework.com.cmm.filter.HTMLTagFilter;
import egovframework.com.jwt.JwtAuthenticationEntryPoint;
import egovframework.com.jwt.JwtAuthenticationFilter;

import org.springframework.boot.web.servlet.MultipartConfigFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.channel.ChannelProcessingFilter;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.csrf.CsrfFilter;
import org.springframework.util.unit.DataSize;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CharacterEncodingFilter;
import org.springframework.web.multipart.support.MultipartFilter;

import java.util.Arrays;

import javax.servlet.MultipartConfigElement;

/**
 * fileName : SecurityConfig
 * author : crlee
 * date : 2023/06/10
 * description :
 * ===========================================================
 * DATE AUTHOR NOTE
 * -----------------------------------------------------------
 * 2023/06/10 crlee 최초 생성
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private static final String CONTENT_SECURITY_POLICY =
        "default-src 'self'; "
            + "base-uri 'self'; "
            + "frame-ancestors 'none'; "
            + "object-src 'none'; "
            + "img-src 'self' https: data:; "
            + "script-src 'self' 'unsafe-inline'; "
            + "style-src 'self' 'unsafe-inline'; "
            + "font-src 'self' https: data:; "
            + "connect-src 'self' https: http:;";

    // Http Method : public GET endpoints for the minimal login-only backend
        private String[] AUTH_GET_WHITELIST = {
            "/api/v1/groupware/boards/notice/posts/*/embedded-images",
            // 송연 현장 TV 화면(작업장 TV 에는 로그인할 사람이 없다). 거래처·품목명·수량·비고만 내려준다
            "/api/v1/tv/production",
            "/api/v1/tv/logistics"
        };

    // 인증 예외 List
    private String[] AUTH_WHITELIST = {
            "/",
            "/auth/login",
            "/auth/login-jwt",
            "/auth/refresh",
            "/auth/logout",
            "/v3/api-docs/**",
            "/swagger-resources",
            "/swagger-resources/**",
            "/swagger-ui.html",
            "/swagger-ui/**"
    };
        private static final String[] ORIGIN_PATTERNS_WHITELIST = {
            "http://localhost:*",
            "http://127.0.0.1:*",
            "https://s-erp.vercel.app",
            "https://s-erp-chi.vercel.app",
        };

    @Bean
    public JwtAuthenticationFilter authenticationTokenFilterBean() throws Exception {
        return new JwtAuthenticationFilter();
    }

    @Bean
    protected CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        configuration.setAllowedOriginPatterns(Arrays.asList(ORIGIN_PATTERNS_WHITELIST));
        configuration.setAllowedMethods(Arrays.asList("HEAD", "POST", "GET", "DELETE", "PUT", "PATCH", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public CharacterEncodingFilter characterEncodingFilter() {
        CharacterEncodingFilter characterEncodingFilter = new CharacterEncodingFilter();
        characterEncodingFilter.setEncoding("UTF-8");
        characterEncodingFilter.setForceEncoding(true);
        return characterEncodingFilter;
    }

    @Bean
    public HTMLTagFilter htmlTagFilter() {
        return new HTMLTagFilter();
    }

    // 멀티파트 필터 빈
    @Bean
    public MultipartFilter multipartFilter() {
        return new MultipartFilter();
    }

    // 서블릿 컨테이너에 멀티파트 구성을 제공하기 위한 설정
    @Bean
    public MultipartConfigElement multipartConfigElement() {
        MultipartConfigFactory factory = new MultipartConfigFactory();
        factory.setMaxRequestSize(DataSize.ofMegabytes(100L));
        factory.setMaxFileSize(DataSize.ofMegabytes(100L));
        return factory.createMultipartConfig();
    }

    @Bean
    protected SecurityFilterChain filterChain(HttpSecurity http) throws Exception {

        return http
                .csrf(AbstractHttpConfigurer::disable)
            .headers(headers -> headers
                .contentSecurityPolicy(csp -> csp.policyDirectives(CONTENT_SECURITY_POLICY)))
                .authorizeHttpRequests(authorize -> authorize
                    .antMatchers(HttpMethod.OPTIONS, "/**").permitAll() // CORS preflight 요청 허용
                        .antMatchers(AUTH_WHITELIST).permitAll()
                        .antMatchers(HttpMethod.GET, AUTH_GET_WHITELIST).permitAll()
                        .antMatchers("/api/v1/**").authenticated()
                        .anyRequest().denyAll())
                .sessionManagement(
                        (sessionManagement) -> sessionManagement.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .cors().and()
                .addFilterBefore(characterEncodingFilter(), ChannelProcessingFilter.class)
                .addFilterBefore(authenticationTokenFilterBean(), UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(multipartFilter(), CsrfFilter.class)
                .exceptionHandling(exceptionHandlingConfigurer -> exceptionHandlingConfigurer
                        .authenticationEntryPoint(new JwtAuthenticationEntryPoint()))
                .build();
    }

}