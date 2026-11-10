package egovframework.let.system.screenreview.service.impl;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import egovframework.let.system.screenreview.domain.model.ScreenReviewDetailVO;
import egovframework.let.system.screenreview.domain.model.ScreenReviewDraftVO;
import egovframework.let.system.screenreview.domain.model.ScreenReviewFileVO;
import egovframework.let.system.screenreview.domain.model.ScreenReviewHistoryVO;
import egovframework.let.system.screenreview.domain.model.ScreenReviewSaveVO;
import egovframework.let.system.screenreview.domain.model.ScreenReviewSummaryVO;
import egovframework.let.system.screenreview.domain.model.ScreenReviewVO;
import egovframework.let.system.screenreview.domain.repository.ScreenReviewDAO;
import egovframework.let.system.screenreview.service.ScreenReviewService;

/**
 * 화면검수 서비스 구현 클래스
 * @author SONGYEON ERP
 * @since 2026.11.02
 * @version 1.0
 */
@Service("screenReviewService")
public class ScreenReviewServiceImpl extends EgovAbstractServiceImpl implements ScreenReviewService {

    static final String NOT_STARTED = "NOT_STARTED";
    static final String IN_PROGRESS = "IN_PROGRESS";
    static final String CHANGE_REQUESTED = "CHANGE_REQUESTED";
    static final String COMPLETED = "COMPLETED";
    static final int COMMENT_MAX = 500;
    static final String OWNER_HISTORY = "SCREEN_REVIEW";
    static final String OWNER_DRAFT = "SCREEN_REVIEW_DRAFT";

    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    // 지금 상태에서 고를 수 있는 다음 상태(지금 상태 그대로 의견만 남기는 것도 된다). 화면 screenReview.ts NEXT_STATUSES 와 같다
    private static final Map<String, List<String>> NEXT_STATUSES = new HashMap<>();
    static {
        NEXT_STATUSES.put(NOT_STARTED, Arrays.asList(CHANGE_REQUESTED, COMPLETED));
        NEXT_STATUSES.put(CHANGE_REQUESTED, Collections.singletonList(IN_PROGRESS));
        NEXT_STATUSES.put(IN_PROGRESS, Arrays.asList(CHANGE_REQUESTED, COMPLETED));
        NEXT_STATUSES.put(COMPLETED, Collections.singletonList(CHANGE_REQUESTED));
    }

    private static final Map<String, String> STATUS_LABELS = new HashMap<>();
    static {
        STATUS_LABELS.put(NOT_STARTED, "미검수");
        STATUS_LABELS.put(IN_PROGRESS, "검수진행중");
        STATUS_LABELS.put(CHANGE_REQUESTED, "수정요청");
        STATUS_LABELS.put(COMPLETED, "검수완료");
    }

    private final ScreenReviewDAO screenReviewDAO;

    public ScreenReviewServiceImpl(ScreenReviewDAO screenReviewDAO) {
        this.screenReviewDAO = screenReviewDAO;
    }

    static boolean canChoose(String current, String next) {
        return next.equals(current) || NEXT_STATUSES.getOrDefault(current, Collections.emptyList()).contains(next);
    }

    LocalDate today() {
        return LocalDate.now(SEOUL);
    }

    // 표시 상태: 수정요청 · 검수진행중은 현황 그대로. 검수완료로 한 바퀴가 끝나면 현황은 미검수로 돌아가므로(2026-11-03)
    // 마지막 이력이 검수완료면 검수완료로 본다. 그 밖(이력 없음 · 현황 없음)은 미진행
    static String displayStatus(String reviewStatus, String lastToStatus) {
        if (CHANGE_REQUESTED.equals(reviewStatus) || IN_PROGRESS.equals(reviewStatus)) {
            return reviewStatus;
        }
        return COMPLETED.equals(lastToStatus) ? COMPLETED : NOT_STARTED;
    }

    @Override
    public List<ScreenReviewSummaryVO> getSummaryList(Long tenantId) throws Exception {
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        List<ScreenReviewSummaryVO> list = screenReviewDAO.selectSummaryList(params);
        for (ScreenReviewSummaryVO row : list) {
            row.setDisplayStatus(displayStatus(row.getReviewStatus(), row.getLastToStatus()));
        }
        return list;
    }

    @Override
    public ScreenReviewDetailVO getDetail(Long tenantId, String menuCode, String empId) throws Exception {
        Long menuId = requireMenuId(tenantId, menuCode);
        ScreenReviewDetailVO detail = new ScreenReviewDetailVO();
        ScreenReviewVO review = screenReviewDAO.selectReview(params(tenantId, menuId, empId));
        detail.setReview(review);
        if (review != null) {
            Map<String, Object> query = new HashMap<>();
            query.put("tenantId", tenantId);
            query.put("reviewId", review.getReviewId());
            List<ScreenReviewHistoryVO> history = screenReviewDAO.selectHistoryList(query);
            List<Long> ids = new ArrayList<>();
            history.forEach((item) -> ids.add(item.getHistoryId()));
            Map<Long, List<ScreenReviewFileVO>> files = filesByOwner(tenantId, OWNER_HISTORY, ids);
            history.forEach((item) -> item.setFiles(files.getOrDefault(item.getHistoryId(), new ArrayList<>())));
            detail.setHistory(history);
        }
        ScreenReviewDraftVO draft = screenReviewDAO.selectDraft(params(tenantId, menuId, empId));
        if (draft != null) {
            draft.setFiles(filesByOwner(tenantId, OWNER_DRAFT, Collections.singletonList(draft.getDraftId()))
                    .getOrDefault(draft.getDraftId(), new ArrayList<>()));
        }
        detail.setDraft(draft);
        return detail;
    }

    @Override
    @Transactional
    public Long saveDraft(Long tenantId, String menuCode, String empId, ScreenReviewSaveVO payload) throws Exception {
        requireUser(empId);
        String comment = comment(payload);
        Long menuId = requireMenuId(tenantId, menuCode);
        Map<String, Object> params = params(tenantId, menuId, empId);
        params.put("reviewComment", comment);
        return screenReviewDAO.upsertDraft(params);
    }

    @Override
    @Transactional
    public Long save(Long tenantId, String menuCode, String empId, ScreenReviewSaveVO payload) throws Exception {
        requireUser(empId);
        String status = payload == null ? null : payload.getStatus();
        if (!StringUtils.hasText(status) || !STATUS_LABELS.containsKey(status)) {
            throw new IllegalArgumentException("검수 상태를 골라주세요");
        }
        String comment = comment(payload);
        Long menuId = requireMenuId(tenantId, menuCode);
        Map<String, Object> key = params(tenantId, menuId, empId);

        // 처음 저장하는 화면이면 미검수 줄을 만들고, 줄을 잠근 뒤 지금 상태를 읽는다
        screenReviewDAO.insertReviewIfAbsent(key);
        ScreenReviewVO current = screenReviewDAO.selectReviewForUpdate(key);
        String from = current.getReviewStatus();
        String expected = payload.getExpectedStatus();
        if (StringUtils.hasText(expected) && !expected.equals(from)) {
            throw new IllegalArgumentException("그사이 다른 사람이 상태를 " + STATUS_LABELS.get(from) + "(으)로 바꿨어요. 패널을 다시 열어주세요");
        }
        if (!canChoose(from, status)) {
            throw new IllegalArgumentException(STATUS_LABELS.get(from) + "에서 " + STATUS_LABELS.get(status) + "(으)로 바꿀 수 없어요");
        }

        String reviewDate = today().toString();
        // 수정요청으로 바꾼 날이 요청일이다. 수정요청 상태에서 의견만 남기면 요청일은 그대로
        String requestDate = CHANGE_REQUESTED.equals(status) && !CHANGE_REQUESTED.equals(from) ? reviewDate : current.getRequestDate();

        // 검수완료로 한 바퀴가 끝나면 현황은 미검수로 돌아가고 요청일 · 개발담당 · 개발완료일은 비운다(2026-11-03). 이력에는 검수완료로 남는다
        boolean cycleDone = COMPLETED.equals(status);
        Map<String, Object> update = new HashMap<>();
        update.put("reviewId", current.getReviewId());
        update.put("status", cycleDone ? NOT_STARTED : status);
        update.put("empId", empId);
        update.put("reviewDate", reviewDate);
        update.put("requestDate", cycleDone ? null : requestDate);
        update.put("resetCycle", cycleDone);
        screenReviewDAO.updateReview(update);

        Map<String, Object> history = new HashMap<>();
        history.put("tenantId", tenantId);
        history.put("reviewId", current.getReviewId());
        history.put("fromStatus", from);
        history.put("toStatus", status);
        history.put("reviewComment", comment);
        history.put("empId", empId);
        history.put("reviewDate", reviewDate);
        // 수정요청 줄에만 화면별 요청 번호를 매긴다(수정요청 추가 포함, 검수완료 뒤에도 이어서). 줄을 잠근 뒤라 겹치지 않는다
        if (CHANGE_REQUESTED.equals(status)) {
            Map<String, Object> no = new HashMap<>();
            no.put("reviewId", current.getReviewId());
            history.put("requestNo", screenReviewDAO.selectNextRequestNo(no));
        }
        Long historyId = screenReviewDAO.insertHistory(history);

        // 내 임시저장의 첨부는 이 이력으로 옮기고 임시저장은 지운다
        ScreenReviewDraftVO draft = screenReviewDAO.selectDraft(key);
        if (draft != null) {
            Map<String, Object> move = new HashMap<>();
            move.put("tenantId", tenantId);
            move.put("draftId", draft.getDraftId());
            move.put("historyId", historyId);
            screenReviewDAO.moveDraftFiles(move);
            screenReviewDAO.deleteDraft(move);
        }
        return historyId;
    }

    private Map<String, Object> params(Long tenantId, Long menuId, String empId) {
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("menuId", menuId);
        params.put("empId", empId);
        return params;
    }

    private Long requireMenuId(Long tenantId, String menuCode) throws Exception {
        if (!StringUtils.hasText(menuCode)) {
            throw new IllegalArgumentException("화면ID 가 없습니다");
        }
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("menuCode", menuCode.trim());
        Long menuId = screenReviewDAO.selectMenuId(params);
        if (menuId == null) {
            throw new IllegalArgumentException("없는 화면입니다: " + menuCode);
        }
        return menuId;
    }

    private void requireUser(String empId) {
        if (!StringUtils.hasText(empId)) {
            throw new IllegalArgumentException("로그인 사원을 확인할 수 없어요. 다시 로그인해주세요");
        }
    }

    private String comment(ScreenReviewSaveVO payload) {
        String comment = payload == null || payload.getReviewComment() == null ? "" : payload.getReviewComment().trim();
        if (comment.length() > COMMENT_MAX) {
            throw new IllegalArgumentException("검수 의견은 " + COMMENT_MAX + "자까지 쓸 수 있어요");
        }
        return comment.isEmpty() ? null : comment;
    }

    private Map<Long, List<ScreenReviewFileVO>> filesByOwner(Long tenantId, String ownerType, List<Long> ownerIds) throws Exception {
        Map<Long, List<ScreenReviewFileVO>> result = new HashMap<>();
        if (ownerIds.isEmpty()) {
            return result;
        }
        Map<String, Object> params = new HashMap<>();
        params.put("tenantId", tenantId);
        params.put("ownerType", ownerType);
        params.put("ownerIds", ownerIds);
        for (ScreenReviewFileVO file : screenReviewDAO.selectFileList(params)) {
            result.computeIfAbsent(file.getOwnerId(), (id) -> new ArrayList<>()).add(file);
        }
        return result;
    }
}
