/**
 * 合同状态机属性测试
 * Property 4: Contract Status State Machine
 * Validates: Requirements 5.1-5.8
 * 
 * Feature: tencent-esign-system, Property 4: Contract Status State Machine
 */

import * as fc from 'fast-check';
import {
  ContractStatus,
  isValidTransition,
  getNextValidStatuses,
  isTerminalStatus,
  getAllStatuses,
  getStatusLabel,
} from '@/lib/contract-status';

// Arbitrary for ContractStatus
const contractStatusArb = fc.constantFrom(...getAllStatuses());

describe('Contract Status State Machine Properties', () => {
  /**
   * Property 4.1: Terminal states have no valid transitions
   * For any terminal status, getNextValidStatuses should return empty array
   */
  it('terminal states should have no valid transitions', () => {
    fc.assert(
      fc.property(contractStatusArb, (status) => {
        if (isTerminalStatus(status)) {
          const nextStatuses = getNextValidStatuses(status);
          return nextStatuses.length === 0;
        }
        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4.2: Non-terminal states have at least one valid transition
   */
  it('non-terminal states should have at least one valid transition', () => {
    fc.assert(
      fc.property(contractStatusArb, (status) => {
        if (!isTerminalStatus(status)) {
          const nextStatuses = getNextValidStatuses(status);
          return nextStatuses.length > 0;
        }
        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4.3: isValidTransition is consistent with getNextValidStatuses
   */
  it('isValidTransition should be consistent with getNextValidStatuses', () => {
    fc.assert(
      fc.property(contractStatusArb, contractStatusArb, (from, to) => {
        const validStatuses = getNextValidStatuses(from);
        const isValid = isValidTransition(from, to);
        return isValid === validStatuses.includes(to);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4.4: Self-transitions are not allowed
   */
  it('self-transitions should not be allowed', () => {
    fc.assert(
      fc.property(contractStatusArb, (status) => {
        return !isValidTransition(status, status);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4.5: All statuses have labels
   */
  it('all statuses should have non-empty labels', () => {
    fc.assert(
      fc.property(contractStatusArb, (status) => {
        const label = getStatusLabel(status);
        return typeof label === 'string' && label.length > 0;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4.6: DRAFT can only transition to PENDING_PARTY_B or CANCELLED
   */
  it('DRAFT should only transition to PENDING_PARTY_B or CANCELLED', () => {
    const validFromDraft = getNextValidStatuses(ContractStatus.DRAFT);
    expect(validFromDraft).toContain(ContractStatus.PENDING_PARTY_B);
    expect(validFromDraft).toContain(ContractStatus.CANCELLED);
    expect(validFromDraft.length).toBe(2);
  });

  /**
   * Property 4.7: COMPLETED, REJECTED, EXPIRED, CANCELLED are terminal states
   */
  it('COMPLETED, REJECTED, EXPIRED, CANCELLED should be terminal states', () => {
    expect(isTerminalStatus(ContractStatus.COMPLETED)).toBe(true);
    expect(isTerminalStatus(ContractStatus.REJECTED)).toBe(true);
    expect(isTerminalStatus(ContractStatus.EXPIRED)).toBe(true);
    expect(isTerminalStatus(ContractStatus.CANCELLED)).toBe(true);
  });

  /**
   * Property 4.8: Valid workflow path exists from DRAFT to COMPLETED
   */
  it('valid workflow path should exist from DRAFT to COMPLETED', () => {
    // DRAFT -> PENDING_PARTY_B -> PENDING_PARTY_A -> COMPLETED
    expect(isValidTransition(ContractStatus.DRAFT, ContractStatus.PENDING_PARTY_B)).toBe(true);
    expect(isValidTransition(ContractStatus.PENDING_PARTY_B, ContractStatus.PENDING_PARTY_A)).toBe(true);
    expect(isValidTransition(ContractStatus.PENDING_PARTY_A, ContractStatus.COMPLETED)).toBe(true);
  });
});
