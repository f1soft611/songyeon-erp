package egovframework.let.qm.haccp.prerequisite.service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import egovframework.let.qm.haccp.prerequisite.domain.model.SurveyItemVO;

/**
 * 판에 달린 줄을 화면이 그릴 수 있게 다듬는다 (송연 qsurvey._items · _count_q).
 * 깊이(묶음 > 작은 묶음 > 질문)와 묶음 아래 질문 수 — 작은 묶음의 질문도 큰 묶음에 센다(엑셀 '평가 점수' 소계가 그렇게 잡혀 있다)
 * @author SONGYEON ERP
 * @since 2026.11.09
 * @version 1.0
 */
public final class SurveyItems {

    private SurveyItems() {
    }

    public static List<SurveyItemVO> decorate(List<SurveyItemVO> rows) {
        if (rows == null) {
            return new ArrayList<>();
        }
        Map<Integer, SurveyItemVO> byId = new HashMap<>();
        Map<Integer, List<SurveyItemVO>> kids = new HashMap<>();
        for (SurveyItemVO r : rows) {
            byId.put(r.getId(), r);
            kids.computeIfAbsent(r.getParentId() == null ? -1 : r.getParentId(), k -> new ArrayList<>()).add(r);
        }
        for (SurveyItemVO r : rows) {
            int depth = 0;
            Integer p = r.getParentId();
            while (p != null && byId.containsKey(p) && depth < 20) {
                depth++;
                p = byId.get(p).getParentId();
            }
            r.setDepth(depth);
            if ("group".equals(r.getRowKind())) {
                r.setQuestions(countQuestions(kids, r.getId()));
            }
            if (r.getTopic() == null) {
                r.setTopic("");
            }
        }
        return rows;
    }

    private static int countQuestions(Map<Integer, List<SurveyItemVO>> kids, int groupId) {
        int n = 0;
        for (SurveyItemVO r : kids.getOrDefault(groupId, Collections.emptyList())) {
            n += "single".equals(r.getRowKind()) ? 1 : countQuestions(kids, r.getId());
        }
        return n;
    }
}
