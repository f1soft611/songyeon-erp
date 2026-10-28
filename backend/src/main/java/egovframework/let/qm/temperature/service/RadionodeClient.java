package egovframework.let.qm.temperature.service;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import egovframework.let.system.serversettings.domain.model.ServerSettingVO;
import egovframework.let.system.serversettings.service.ServerSettingService;

/**
 * 타파쿨로365(radionode) 채널 목록을 받아오는 곳 (송연 temperature.py _radionode_get_channel_list).
 * Channel-get_lst 를 한 번 불러 전체 채널(장치별 센서) 목록과 지금 값을 한꺼번에 받는다.
 *
 * ■ 왜 값을 잠깐 담아두는가 — 타파쿨로365는 짧은 시간에 너무 자주 부르면 접속을 막는다.
 *   화면을 여러 사람이 동시에 보고 있으면 금세 한도에 걸리므로, 한 번 받아온 값을 20초 동안 다시 쓴다.
 * 접속 정보(키·SECRET·주소)는 공통관리 > 기초정보 > 서버관리의 'radionode' 를 쓴다.
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
@Component("radionodeClient")
public class RadionodeClient {

    static final long CACHE_TTL_MILLIS = 20_000L;
    private static final String DEFAULT_BASE_URL = "https://oa.radionode365.com";
    private static final ObjectMapper JSON = new ObjectMapper();

    /** 받아온 결과. error 가 있으면 실패, 아니면 rows */
    public static final class Result {
        private final String error;
        private final List<Map<String, Object>> rows;

        Result(String error, List<Map<String, Object>> rows) {
            this.error = error;
            this.rows = rows;
        }

        public String getError() {
            return error;
        }

        public List<Map<String, Object>> getRows() {
            return rows;
        }

        static Result fail(String error) {
            return new Result(error, Collections.<Map<String, Object>>emptyList());
        }
    }

    /** 외부 응답(상태 번호 · 본문) */
    protected static final class HttpReply {
        final int status;
        final String body;

        public HttpReply(int status, String body) {
            this.status = status;
            this.body = body;
        }
    }

    private final ServerSettingService serverSettingService;
    private Result cached;
    private long fetchedAt;

    public RadionodeClient(ServerSettingService serverSettingService) {
        this.serverSettingService = serverSettingService;
    }

    /** 키와 SECRET 이 모두 있는지, 키 앞뒤 몇 글자(송연 /api/temp/settings) */
    public ServerSettingVO credential() throws Exception {
        return serverSettingService.credentialOf("radionode");
    }

    public synchronized Result channelList(boolean forceRefresh) throws Exception {
        long now = now();
        if (!forceRefresh && cached != null && now - fetchedAt < CACHE_TTL_MILLIS) {
            return cached;
        }
        ServerSettingVO setting = credential();
        String apiKey = setting.getApiKey();
        String apiSecret = setting.getApiSecret();
        String baseUrl = setting.getBaseUrl() == null || setting.getBaseUrl().isEmpty() ? DEFAULT_BASE_URL : setting.getBaseUrl();
        if (apiKey == null || apiKey.isEmpty() || apiSecret == null || apiSecret.isEmpty()) {
            return Result.fail("타파쿨로365 API 키/시크릿이 설정되지 않았어요");
        }
        String form = "api_key=" + URLEncoder.encode(apiKey, "UTF-8") + "&api_secret=" + URLEncoder.encode(apiSecret, "UTF-8");
        String url = baseUrl.replaceAll("/+$", "") + "/tp365/v1/channel/get_lst";
        HttpReply reply;
        try {
            reply = post(url, form);
        } catch (Exception ex) {
            return Result.fail("타파쿨로365 연결 실패: " + cut(String.valueOf(ex.getMessage()), 200));
        }
        if (reply.status >= 400) {
            Map<String, Object> err = parseQuietly(reply.body);
            if ("common-938".equals(err.get("errcode"))) {
                return Result.fail("타파쿨로365 쪽에서 짧은 시간에 접속이 너무 많다고 일시적으로 막았어요. 1~2분 뒤 다시 시도해주세요.");
            }
            return Result.fail("타파쿨로365 응답 오류(" + reply.status + "): " + cut(reply.body, 200));
        }
        Map<String, Object> data;
        try {
            data = JSON.readValue(reply.body, new TypeReference<Map<String, Object>>() { });
        } catch (Exception ex) {
            return Result.fail("타파쿨로365 연결 실패: " + cut(String.valueOf(ex.getMessage()), 200));
        }
        if (Boolean.FALSE.equals(data.get("status"))) {
            return Result.fail("타파쿨로365 조회 실패 (API 키/시크릿을 확인해주세요)");
        }
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rows = data.get("rows") instanceof List ? (List<Map<String, Object>>) data.get("rows") : Collections.<Map<String, Object>>emptyList();
        cached = new Result(null, rows);
        fetchedAt = now;
        return cached;
    }

    /** 장치+센서+채널번호로 채널 하나를 가리키는 열쇠(송연 _channel_key) */
    public static String channelKey(Map<String, Object> row) {
        return text(row.get("device_mac")) + "|" + text(row.get("sensor_mac")) + "|" + text(row.get("ch_no"));
    }

    protected long now() {
        return System.currentTimeMillis();
    }

    /** 폼 본문으로 POST(제한시간 15초) */
    protected HttpReply post(String url, String form) throws Exception {
        HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
        conn.setRequestMethod("POST");
        conn.setConnectTimeout(15_000);
        conn.setReadTimeout(15_000);
        conn.setDoOutput(true);
        conn.setRequestProperty("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
        try (OutputStream out = conn.getOutputStream()) {
            out.write(form.getBytes(StandardCharsets.UTF_8));
        }
        int status = conn.getResponseCode();
        try (InputStream in = status >= 400 ? conn.getErrorStream() : conn.getInputStream()) {
            return new HttpReply(status, in == null ? "" : readAll(in));
        } finally {
            conn.disconnect();
        }
    }

    private static String readAll(InputStream in) throws Exception {
        ByteArrayOutputStream buf = new ByteArrayOutputStream();
        byte[] chunk = new byte[4096];
        int n;
        while ((n = in.read(chunk)) > 0) {
            buf.write(chunk, 0, n);
        }
        return new String(buf.toByteArray(), StandardCharsets.UTF_8);
    }

    private static Map<String, Object> parseQuietly(String body) {
        try {
            return JSON.readValue(body, new TypeReference<Map<String, Object>>() { });
        } catch (Exception ex) {
            return Collections.emptyMap();
        }
    }

    private static String text(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    private static String cut(String value, int max) {
        String v = value == null ? "" : value;
        return v.length() > max ? v.substring(0, max) : v;
    }
}
