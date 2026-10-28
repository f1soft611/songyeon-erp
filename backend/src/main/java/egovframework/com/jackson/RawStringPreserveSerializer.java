package egovframework.com.jackson;

import java.io.IOException;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.core.io.JsonStringEncoder;
import com.fasterxml.jackson.databind.JsonSerializer;
import com.fasterxml.jackson.databind.SerializerProvider;

/**
 * Global HTML character escaping is enabled for API responses.
 * This serializer keeps selected string fields as raw JSON string literals
 * (JSON-safe escaping only), so values like template JSON/HTML are not
 * converted to HTML entities such as &quot; or &lt;.
 */
public class RawStringPreserveSerializer extends JsonSerializer<String> {

    @Override
    public void serialize(String value, JsonGenerator gen, SerializerProvider serializers) throws IOException {
        if (value == null) {
            gen.writeNull();
            return;
        }

        char[] escaped = JsonStringEncoder.getInstance().quoteAsString(value);
        gen.writeRawValue("\"" + new String(escaped) + "\"");
    }
}
