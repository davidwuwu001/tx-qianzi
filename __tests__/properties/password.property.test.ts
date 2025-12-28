/**
 * 密码加密属性测试
 * Property 14: Password Encryption Round-Trip
 * Validates: Requirements 12.1
 * 
 * Feature: tencent-esign-system, Property 14: Password Encryption Round-Trip
 */

import * as fc from 'fast-check';
import { hashPassword, verifyPassword } from '@/lib/password';

describe('Password Encryption Properties', () => {
  /**
   * Property 14: Password Encryption Round-Trip
   * For any valid password, hashing then verifying should return true
   */
  it('should verify correctly after hashing (round-trip)', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate non-empty passwords (1-72 chars, bcrypt limit)
        fc.string({ minLength: 1, maxLength: 72 }),
        async (password) => {
          const hash = await hashPassword(password);
          const isValid = await verifyPassword(password, hash);
          return isValid === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Different passwords should produce different hashes
   */
  it('should produce different hashes for different passwords', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 72 }),
        fc.string({ minLength: 1, maxLength: 72 }),
        async (password1, password2) => {
          fc.pre(password1 !== password2);
          const hash1 = await hashPassword(password1);
          const hash2 = await hashPassword(password2);
          // Hashes should be different (with extremely high probability due to salt)
          return hash1 !== hash2;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Wrong password should not verify
   */
  it('should not verify with wrong password', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 72 }),
        fc.string({ minLength: 1, maxLength: 72 }),
        async (correctPassword, wrongPassword) => {
          fc.pre(correctPassword !== wrongPassword);
          const hash = await hashPassword(correctPassword);
          const isValid = await verifyPassword(wrongPassword, hash);
          return isValid === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Same password hashed twice should produce different hashes (due to salt)
   */
  it('should produce different hashes for same password (salt uniqueness)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 72 }),
        async (password) => {
          const hash1 = await hashPassword(password);
          const hash2 = await hashPassword(password);
          // Both should verify correctly
          const verify1 = await verifyPassword(password, hash1);
          const verify2 = await verifyPassword(password, hash2);
          // Hashes should be different but both verify
          return hash1 !== hash2 && verify1 && verify2;
        }
      ),
      { numRuns: 100 }
    );
  });
});
