package egovframework.let.co.master.commoncode.domain.model;

import java.io.Serializable;

public class CommonCodeGroupSearchCondition implements Serializable {

    private static final long serialVersionUID = 1L;

    private String keyword;
    private String groupCode;
    private String groupNm;
    private String groupDc;

    public String getKeyword() {
        return keyword;
    }

    public void setKeyword(String keyword) {
        this.keyword = keyword;
    }

    public String getGroupCode() {
        return groupCode;
    }

    public void setGroupCode(String groupCode) {
        this.groupCode = groupCode;
    }

    public String getGroupNm() {
        return groupNm;
    }

    public void setGroupNm(String groupNm) {
        this.groupNm = groupNm;
    }

    public String getGroupDc() {
        return groupDc;
    }

    public void setGroupDc(String groupDc) {
        this.groupDc = groupDc;
    }
}
