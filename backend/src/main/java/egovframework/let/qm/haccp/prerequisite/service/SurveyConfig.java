package egovframework.let.qm.haccp.prerequisite.service;

import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

import egovframework.let.qm.haccp.prerequisite.domain.model.SurveyChoiceVO;

/**
 * 판에 적힌 설문 설정(qdoc_version.survey_json): 고를 답과 점수, 세부내역 · 부적합내역 칸을 쓸지 (송연 qsurvey._survey_of · scoring · full_mark).
 * 보기를 판에 매다는 까닭: 보기를 바꾸면 새 판을 뜨므로, 지난 점검표는 그때 보기 그대로 열린다('해당없음' 을 나중에 0점으로 바꿔도 작년 점수가 깎이지 않는다)
 * @author SONGYEON ERP
 * @since 2026.11.09
 * @version 1.0
 */
public final class SurveyConfig {

    private final List<SurveyChoiceVO> choices = new ArrayList<>();
    private boolean hasNote = true;
    private boolean hasDefect = true;

    public List<SurveyChoiceVO> getChoices() {
        return choices;
    }

    public boolean isHasNote() {
        return hasNote;
    }

    public boolean isHasDefect() {
        return hasDefect;
    }

    /** 보기 하나라도 점수가 있으면 점수를 매기는 양식(O/X 만 고르는 점검표는 점수가 없다) */
    public boolean scoring() {
        return choices.stream().anyMatch(c -> c.getScore() != null);
    }

    /** 한 질문에 받을 수 있는 제일 높은 점수 */
    public int fullMark() {
        return choices.stream().filter(c -> c.getScore() != null).mapToInt(SurveyChoiceVO::getScore).max().orElse(0);
    }

    public static SurveyChoiceVO choice(String label, String mark, Integer score) {
        SurveyChoiceVO c = new SurveyChoiceVO();
        c.setLabel(label);
        c.setMark(mark);
        c.setScore(score);
        return c;
    }

    /** 새 양식에 처음 들어가는 보기(품질 점검표가 거의 이 넷이다) */
    public static List<SurveyChoiceVO> defaultChoices() {
        List<SurveyChoiceVO> out = new ArrayList<>();
        out.add(choice("적합", "O", 2));
        out.add(choice("미흡", "△", 1));
        out.add(choice("부적합", "X", 0));
        out.add(choice("해당없음", "N/A", 2));
        return out;
    }

    public static SurveyConfig of(List<SurveyChoiceVO> choices, boolean hasNote, boolean hasDefect) {
        SurveyConfig s = new SurveyConfig();
        s.choices.addAll(choices);
        s.hasNote = hasNote;
        s.hasDefect = hasDefect;
        return s;
    }

    /** 판의 설정을 읽는다. 없거나 깨졌으면 기본 보기 */
    public static SurveyConfig parse(ObjectMapper objectMapper, String raw) {
        SurveyConfig s = new SurveyConfig();
        JsonNode root;
        try {
            root = raw == null || raw.trim().isEmpty() ? null : objectMapper.readTree(raw);
        } catch (Exception ex) {
            root = null;
        }
        if (root != null && root.path("choices").isArray()) {
            for (JsonNode c : root.path("choices")) {
                String label = c.path("label").asText("").trim();
                if (!label.isEmpty()) {
                    s.choices.add(choice(label, c.path("mark").asText("").trim(), score(c.get("score"))));
                }
            }
        }
        if (s.choices.isEmpty()) {
            s.choices.addAll(defaultChoices());
        }
        if (root != null) {
            s.hasNote = !root.has("has_note") || root.path("has_note").asInt(1) != 0;
            s.hasDefect = !root.has("has_defect") || root.path("has_defect").asInt(1) != 0;
        }
        return s;
    }

    /** 원본과 같은 모양으로 적는다: {"choices":[{"label","mark","score"}],"has_note":0/1,"has_defect":0/1} */
    public String toJson(ObjectMapper objectMapper) {
        ObjectNode root = objectMapper.createObjectNode();
        ArrayNode list = root.putArray("choices");
        for (SurveyChoiceVO c : choices) {
            ObjectNode n = list.addObject();
            n.put("label", c.getLabel());
            n.put("mark", c.getMark() == null ? "" : c.getMark());
            if (c.getScore() == null) {
                n.putNull("score");
            } else {
                n.put("score", c.getScore());
            }
        }
        root.put("has_note", hasNote ? 1 : 0);
        root.put("has_defect", hasDefect ? 1 : 0);
        try {
            return objectMapper.writeValueAsString(root);
        } catch (Exception ex) {
            throw new IllegalStateException("보기를 적지 못했습니다", ex);
        }
    }

    /** 보기 점수. 비워두면 null. 숫자가 아니면 null */
    public static Integer score(JsonNode v) {
        if (v == null || v.isNull()) {
            return null;
        }
        if (v.isNumber()) {
            return (int) v.asDouble();
        }
        return score(v.asText(""));
    }

    public static Integer score(String text) {
        String t = text == null ? "" : text.trim();
        if (t.isEmpty()) {
            return null;
        }
        try {
            return (int) Double.parseDouble(t);
        } catch (NumberFormatException ex) {
            return null;
        }
    }
}
