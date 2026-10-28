package egovframework.com.cmm.util;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Arrays;
import java.util.Base64;

import javax.crypto.Cipher;
import javax.crypto.Mac;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;

/**
 * 송연 secrets_store.py 가 쓰는 Fernet 과 같은 방식(송연 변환본 kr.co.songyeon.mes.common.util.Fernet 과 같음).
 * 같은 DB 를 보는 동안 송연 쪽과 서로 잠근 값을 읽을 수 있어야 해서 그대로 맞췄다.
 * 열쇠: sha256(프로그램 비밀키) 32바이트 — 앞 16바이트는 위조검사(HMAC)용, 뒤 16바이트는 암호화용.
 * 토큰: 0x80 | 시각(8바이트) | IV(16바이트) | 암호문 | HMAC-SHA256(32바이트) 을 base64url 로 적는다.
 * @author SONGYEON ERP
 * @since 2026.10.02
 * @version 1.0
 */
public final class Fernet {

    private static final byte VERSION = (byte) 0x80;
    private static final SecureRandom RANDOM = new SecureRandom();

    private Fernet() {
    }

    public static String encrypt(String secretKey, String plain) {
        try {
            byte[] key = keyOf(secretKey);
            byte[] signing = Arrays.copyOfRange(key, 0, 16);
            byte[] encryption = Arrays.copyOfRange(key, 16, 32);
            byte[] iv = new byte[16];
            RANDOM.nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/CBC/PKCS5Padding");
            cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(encryption, "AES"), new IvParameterSpec(iv));
            byte[] cipherText = cipher.doFinal(plain.getBytes(StandardCharsets.UTF_8));

            ByteBuffer body = ByteBuffer.allocate(1 + 8 + iv.length + cipherText.length);
            body.put(VERSION).putLong(Instant.now().getEpochSecond()).put(iv).put(cipherText);
            byte[] signed = body.array();
            byte[] mac = hmac(signing, signed);

            byte[] token = Arrays.copyOf(signed, signed.length + mac.length);
            System.arraycopy(mac, 0, token, signed.length, mac.length);
            return Base64.getUrlEncoder().encodeToString(token);
        } catch (Exception ex) {
            throw new IllegalStateException("값을 잠그지 못했습니다", ex);
        }
    }

    /** 풀지 못하면 null(열쇠가 바뀌었거나 위조된 값). 깨진 글자를 그대로 흘려보내지 않는다. */
    public static String decrypt(String secretKey, String token) {
        try {
            byte[] raw = Base64.getUrlDecoder().decode(token);
            if (raw.length < 1 + 8 + 16 + 32 || raw[0] != VERSION) {
                return null;
            }
            byte[] key = keyOf(secretKey);
            byte[] signing = Arrays.copyOfRange(key, 0, 16);
            byte[] encryption = Arrays.copyOfRange(key, 16, 32);
            byte[] signed = Arrays.copyOfRange(raw, 0, raw.length - 32);
            byte[] mac = Arrays.copyOfRange(raw, raw.length - 32, raw.length);
            if (!MessageDigest.isEqual(mac, hmac(signing, signed))) {
                return null;
            }
            byte[] iv = Arrays.copyOfRange(signed, 9, 25);
            byte[] cipherText = Arrays.copyOfRange(signed, 25, signed.length);
            Cipher cipher = Cipher.getInstance("AES/CBC/PKCS5Padding");
            cipher.init(Cipher.DECRYPT_MODE, new SecretKeySpec(encryption, "AES"), new IvParameterSpec(iv));
            return new String(cipher.doFinal(cipherText), StandardCharsets.UTF_8);
        } catch (Exception ex) {
            return null;
        }
    }

    private static byte[] keyOf(String secretKey) throws Exception {
        return MessageDigest.getInstance("SHA-256").digest(secretKey.getBytes(StandardCharsets.UTF_8));
    }

    private static byte[] hmac(byte[] signingKey, byte[] data) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(signingKey, "HmacSHA256"));
        return mac.doFinal(data);
    }
}
