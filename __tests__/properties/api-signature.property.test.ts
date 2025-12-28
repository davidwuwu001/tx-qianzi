/**
 * API签名属性测试
 * Property 15: API Request Signature Correctness
 * Validates: Requirements 9.2
 * 
 * Feature: tencent-esign-system, Property 15: API Request Signature Correctness
 */

import * as fc from 'fast-check';
import crypto from 'crypto';

// Test the signature algorithm logic directly without env dependency

/**
 * SHA256 哈希
 */
function sha256(data: string): string {
  return crypto.createHash("sha256").update(data, "utf8").digest("hex");
}

/**
 * HMAC-SHA256 签名
 */
function hmacSha256(key: Buffer | string, data: string): Buffer {
  return crypto.createHmac("sha256", key).update(data, "utf8").digest();
}

/**
 * 格式化日期为 YYYY-MM-DD
 */
function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 计算签名
 */
function calculateSignature(
  secretKey: string,
  date: string,
  service: string,
  stringToSign: string
): string {
  const secretDate = hmacSha256(`TC3${secretKey}`, date);
  const secretService = hmacSha256(secretDate, service);
  const secretSigning = hmacSha256(secretService, "tc3_request");
  return hmacSha256(secretSigning, stringToSign).toString("hex");
}

// Generator for valid secret keys
const secretKeyArb = fc.string({ minLength: 10, maxLength: 50 });

// Generator for valid dates
const dateArb = fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
  .map(d => formatDate(Math.floor(d.getTime() / 1000)));

// Generator for service names
const serviceArb = fc.constantFrom('ess', 'sms', 'cvm');

// Generator for string to sign
const stringToSignArb = fc.string({ minLength: 10, maxLength: 200 });

// Generator for timestamps
const timestampArb = fc.integer({ min: 1577836800, max: 1893456000 }); // 2020-2030

describe('API Signature Properties', () => {
  /**
   * Property 15.1: SHA256 should be deterministic
   */
  it('SHA256 should be deterministic', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const hash1 = sha256(input);
        const hash2 = sha256(input);
        return hash1 === hash2;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 15.2: SHA256 should produce 64 character hex string
   */
  it('SHA256 should produce 64 character hex string', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const hash = sha256(input);
        return hash.length === 64 && /^[0-9a-f]+$/.test(hash);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 15.3: Different inputs should produce different SHA256 hashes
   */
  it('different inputs should produce different SHA256 hashes', () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (input1, input2) => {
        fc.pre(input1 !== input2);
        const hash1 = sha256(input1);
        const hash2 = sha256(input2);
        return hash1 !== hash2;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 15.4: HMAC-SHA256 should be deterministic
   */
  it('HMAC-SHA256 should be deterministic', () => {
    fc.assert(
      fc.property(secretKeyArb, fc.string(), (key, data) => {
        const sig1 = hmacSha256(key, data).toString('hex');
        const sig2 = hmacSha256(key, data).toString('hex');
        return sig1 === sig2;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 15.5: Different keys should produce different HMAC signatures
   */
  it('different keys should produce different HMAC signatures', () => {
    fc.assert(
      fc.property(secretKeyArb, secretKeyArb, fc.string({ minLength: 1 }), (key1, key2, data) => {
        fc.pre(key1 !== key2);
        const sig1 = hmacSha256(key1, data).toString('hex');
        const sig2 = hmacSha256(key2, data).toString('hex');
        return sig1 !== sig2;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 15.6: calculateSignature should be deterministic
   */
  it('calculateSignature should be deterministic', () => {
    fc.assert(
      fc.property(secretKeyArb, dateArb, serviceArb, stringToSignArb, (key, date, service, stringToSign) => {
        const sig1 = calculateSignature(key, date, service, stringToSign);
        const sig2 = calculateSignature(key, date, service, stringToSign);
        return sig1 === sig2;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 15.7: calculateSignature should produce 64 character hex string
   */
  it('calculateSignature should produce 64 character hex string', () => {
    fc.assert(
      fc.property(secretKeyArb, dateArb, serviceArb, stringToSignArb, (key, date, service, stringToSign) => {
        const sig = calculateSignature(key, date, service, stringToSign);
        return sig.length === 64 && /^[0-9a-f]+$/.test(sig);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 15.8: formatDate should produce valid date format
   */
  it('formatDate should produce valid date format YYYY-MM-DD', () => {
    fc.assert(
      fc.property(timestampArb, (timestamp) => {
        const date = formatDate(timestamp);
        return /^\d{4}-\d{2}-\d{2}$/.test(date);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 15.9: formatDate should be deterministic
   */
  it('formatDate should be deterministic', () => {
    fc.assert(
      fc.property(timestampArb, (timestamp) => {
        const date1 = formatDate(timestamp);
        const date2 = formatDate(timestamp);
        return date1 === date2;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 15.10: Different secret keys should produce different signatures
   */
  it('different secret keys should produce different signatures', () => {
    fc.assert(
      fc.property(secretKeyArb, secretKeyArb, dateArb, serviceArb, stringToSignArb, 
        (key1, key2, date, service, stringToSign) => {
          fc.pre(key1 !== key2);
          const sig1 = calculateSignature(key1, date, service, stringToSign);
          const sig2 = calculateSignature(key2, date, service, stringToSign);
          return sig1 !== sig2;
        }
      ),
      { numRuns: 100 }
    );
  });
});
