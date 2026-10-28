package egovframework.let.uat.uia.service.impl;

import java.awt.Graphics2D;
import java.awt.Image;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.Base64;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import javax.imageio.ImageIO;

final class ProfileImageNormalizer {

    private static final int MAX_BYTES = 1024 * 1024;
    private static final int MAX_PIXELS = 512;
    private static final Pattern DATA_URL = Pattern.compile(
            "^data:image/(png|jpeg);base64,([A-Za-z0-9+/=]+)$");

    private ProfileImageNormalizer() {
    }

    static String normalize(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }

        Matcher matcher = DATA_URL.matcher(value.trim());
        if (!matcher.matches()) {
            throw new IllegalArgumentException("PNG 또는 JPEG 이미지만 등록할 수 있습니다.");
        }

        String format = matcher.group(1);
        byte[] input;
        try {
            input = Base64.getDecoder().decode(matcher.group(2));
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("이미지 데이터를 읽을 수 없습니다.");
        }
        if (input.length > MAX_BYTES) {
            throw new IllegalArgumentException("이미지는 1MB 이하만 등록할 수 있습니다.");
        }

        try {
            BufferedImage source = ImageIO.read(new ByteArrayInputStream(input));
            if (source == null || source.getWidth() <= 0 || source.getHeight() <= 0) {
                throw new IllegalArgumentException("이미지 데이터를 읽을 수 없습니다.");
            }
            double scale = Math.min(1D,
                    Math.min((double) MAX_PIXELS / source.getWidth(),
                            (double) MAX_PIXELS / source.getHeight()));
            int width = Math.max(1, (int) Math.round(source.getWidth() * scale));
            int height = Math.max(1, (int) Math.round(source.getHeight() * scale));
            BufferedImage normalized = new BufferedImage(width, height,
                    "png".equals(format) ? BufferedImage.TYPE_INT_ARGB : BufferedImage.TYPE_INT_RGB);
            Graphics2D graphics = normalized.createGraphics();
            try {
                graphics.drawImage(source.getScaledInstance(width, height, Image.SCALE_SMOOTH), 0, 0, null);
            } finally {
                graphics.dispose();
            }

            ByteArrayOutputStream output = new ByteArrayOutputStream();
            if (!ImageIO.write(normalized, format, output)) {
                throw new IllegalArgumentException("이미지를 저장할 수 없습니다.");
            }
            byte[] normalizedBytes = output.toByteArray();
            if (normalizedBytes.length > MAX_BYTES) {
                throw new IllegalArgumentException("정규화된 이미지가 1MB를 초과합니다.");
            }
            return "data:image/" + format + ";base64,"
                    + Base64.getEncoder().encodeToString(normalizedBytes);
        } catch (IllegalArgumentException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new IllegalArgumentException("이미지를 처리하지 못했습니다.");
        }
    }
}
