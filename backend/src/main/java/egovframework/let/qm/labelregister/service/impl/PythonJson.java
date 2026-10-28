package egovframework.let.qm.labelregister.service.impl;

import java.util.Iterator;
import java.util.List;
import java.util.Map;

/**
 * 송연 json.dumps(값, ensure_ascii=False) 와 같은 모양으로 JSON 글자를 만든다.
 *
 * ■ 왜 따로 만드는가
 * 라벨 양식(layout)은 DB 에 JSON 글자로 들어가고, 송연 원본은 그 글자를 LIKE '%"mark_id": 3%' 처럼 찾아
 * '이 마크·양식을 쓰는 라벨이 있는가' 를 본다. 이 프로그램이 콜론 뒤 띄어쓰기 없이 적으면(일반 JSON 도구의 기본)
 * 같은 DB 를 쓰는 송연 원본이 그 라벨을 못 찾아, 쓰고 있는 마크를 지워버릴 수 있다.
 * 그래서 송연과 똑같이 ', ' 와 ': ' 로 잇고, 한글은 그대로 둔다.
 * @author SONGYEON ERP
 * @since 2026.10.13
 * @version 1.0
 */
final class PythonJson {

    private PythonJson() {
    }

    static String dumps(Object value) {
        StringBuilder out = new StringBuilder();
        write(out, value);
        return out.toString();
    }

    private static void write(StringBuilder out, Object value) {
        if (value == null) {
            out.append("null");
        } else if (value instanceof String) {
            writeString(out, (String) value);
        } else if (value instanceof Boolean) {
            out.append(((Boolean) value) ? "true" : "false");
        } else if (value instanceof Double || value instanceof Float) {
            double d = ((Number) value).doubleValue();
            // 파이썬 float 의 글자: 9.0 은 '9.0', 그 밖은 가장 짧게
            out.append(d == Math.rint(d) && Math.abs(d) < 1e16 ? String.valueOf((long) d) + ".0" : String.valueOf(d));
        } else if (value instanceof Number) {
            out.append(value.toString());
        } else if (value instanceof Map) {
            out.append('{');
            Iterator<? extends Map.Entry<?, ?>> it = ((Map<?, ?>) value).entrySet().iterator();
            while (it.hasNext()) {
                Map.Entry<?, ?> e = it.next();
                writeString(out, String.valueOf(e.getKey()));
                out.append(": ");
                write(out, e.getValue());
                if (it.hasNext()) {
                    out.append(", ");
                }
            }
            out.append('}');
        } else if (value instanceof List) {
            out.append('[');
            List<?> list = (List<?>) value;
            for (int i = 0; i < list.size(); i++) {
                if (i > 0) {
                    out.append(", ");
                }
                write(out, list.get(i));
            }
            out.append(']');
        } else {
            writeString(out, value.toString());
        }
    }

    private static void writeString(StringBuilder out, String s) {
        out.append('"');
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"':
                    out.append("\\\"");
                    break;
                case '\\':
                    out.append("\\\\");
                    break;
                case '\n':
                    out.append("\\n");
                    break;
                case '\r':
                    out.append("\\r");
                    break;
                case '\t':
                    out.append("\\t");
                    break;
                case '\b':
                    out.append("\\b");
                    break;
                case '\f':
                    out.append("\\f");
                    break;
                default:
                    if (c < 0x20) {
                        out.append(String.format("\\u%04x", (int) c));
                    } else {
                        out.append(c);
                    }
            }
        }
        out.append('"');
    }
}
