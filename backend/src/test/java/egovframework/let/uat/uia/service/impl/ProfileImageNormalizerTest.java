package egovframework.let.uat.uia.service.impl;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class ProfileImageNormalizerTest {

    @Test
    void normalizesAValidPngDataUrl() {
        String image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

        String normalized = ProfileImageNormalizer.normalize(image);

        assertTrue(normalized.startsWith("data:image/png;base64,"));
    }

    @Test
    void rejectsInvalidImageData() {
        assertThrows(IllegalArgumentException.class, () ->
                ProfileImageNormalizer.normalize("data:image/png;base64,not-an-image"));
    }
}
