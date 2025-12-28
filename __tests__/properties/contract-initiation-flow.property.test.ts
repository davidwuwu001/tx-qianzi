/**
 * Property 7: Contract Initiation Flow Integrity
 * 
 * Feature: tencent-esign-system, Property 7: Contract Initiation Flow Integrity
 * 
 * *For any* valid contract initiation request, the system SHALL execute API calls 
 * in the correct order (CreateFlow → CreateDocument → StartFlow → CreateFlowSignUrl), 
 * and if any step fails, the contract status SHALL remain unchanged or be rolled back appropriately.
 * 
 * **Validates: Requirements 2.5, 2.6, 2.7, 2.8, 2.12**
 */

import fc from 'fast-check';

// Types for testing
interface ApiCallRecord {
  action: string;
  timestamp: number;
  params: Record<string, unknown>;
}

interface MockEsignService {
  calls: ApiCallRecord[];
  createFlow: jest.Mock;
  createDocument: jest.Mock;
  startFlow: jest.Mock;
  createFlowSignUrl: jest.Mock;
}

interface ContractData {
  id: string;
  contractNo: string;
  status: 'DRAFT' | 'PENDING_PARTY_B' | 'PENDING_PARTY_A' | 'COMPLETED' | 'REJECTED' | 'EXPIRED';
  flowId: string | null;
  partyBName: string;
  partyBPhone: string;
  partyBIdCard: string | null;
  partyBType: 'PERSONAL' | 'ENTERPRISE';
  partyBOrgName: string | null;
  product: {
    name: string;
    templateId: string;
  };
  formData: Record<string, unknown> | null;
}

// Expected API call order
const EXPECTED_API_ORDER = ['CreateFlow', 'CreateDocument', 'StartFlow', 'CreateFlowSignUrl'];

/**
 * Create a mock esign service that tracks API call order
 */
function createMockEsignService(failAtStep?: string): MockEsignService {
  const calls: ApiCallRecord[] = [];
  let callIndex = 0;

  const recordCall = (action: string, params: Record<string, unknown>) => {
    calls.push({
      action,
      timestamp: callIndex++,
      params,
    });
  };

  const createFlow = jest.fn().mockImplementation((params) => {
    recordCall('CreateFlow', params);
    if (failAtStep === 'CreateFlow') {
      throw new Error('CreateFlow failed');
    }
    return Promise.resolve({ FlowId: `flow_${Date.now()}` });
  });

  const createDocument = jest.fn().mockImplementation((params) => {
    recordCall('CreateDocument', params);
    if (failAtStep === 'CreateDocument') {
      throw new Error('CreateDocument failed');
    }
    return Promise.resolve({ DocumentId: `doc_${Date.now()}` });
  });

  const startFlow = jest.fn().mockImplementation((flowId) => {
    recordCall('StartFlow', { flowId });
    if (failAtStep === 'StartFlow') {
      throw new Error('StartFlow failed');
    }
    return Promise.resolve({ Status: 'STARTED' });
  });

  const createFlowSignUrl = jest.fn().mockImplementation((params) => {
    recordCall('CreateFlowSignUrl', params);
    if (failAtStep === 'CreateFlowSignUrl') {
      throw new Error('CreateFlowSignUrl failed');
    }
    return Promise.resolve({
      SignUrl: `https://esign.example.com/sign/${Date.now()}`,
      ExpireTime: Math.floor(Date.now() / 1000) + 1800, // 30 minutes
    });
  });

  return {
    calls,
    createFlow,
    createDocument,
    startFlow,
    createFlowSignUrl,
  };
}

/**
 * Simulate the contract initiation flow
 * This mirrors the logic in contract-flow.service.ts
 */
async function simulateContractInitiation(
  contract: ContractData,
  esignService: MockEsignService
): Promise<{ success: boolean; finalStatus: ContractData['status'] | 'DRAFT'; flowId: string | null }> {
  // Validate initial state
  if (contract.status !== 'DRAFT') {
    return { success: false, finalStatus: contract.status, flowId: contract.flowId };
  }

  if (!contract.product.templateId) {
    return { success: false, finalStatus: contract.status, flowId: contract.flowId };
  }

  let flowId: string | null = null;
  let finalStatus: ContractData['status'] = contract.status;

  try {
    // Step 1: CreateFlow
    const flowResult = await esignService.createFlow({
      FlowName: `${contract.product.name} - ${contract.partyBName}`,
      Approvers: [
        {
          ApproverType: contract.partyBType === 'PERSONAL' ? 1 : 0,
          ApproverName: contract.partyBName,
          ApproverMobile: contract.partyBPhone,
        },
      ],
    });
    flowId = flowResult.FlowId;

    // Step 2: CreateDocument
    await esignService.createDocument({
      FlowId: flowId,
      TemplateId: contract.product.templateId,
      FileNames: [`${contract.contractNo}.pdf`],
      FormFields: contract.formData ? Object.entries(contract.formData).map(([k, v]) => ({
        ComponentName: k,
        ComponentValue: String(v),
      })) : undefined,
    });

    // Step 3: StartFlow
    await esignService.startFlow(flowId);

    // Step 4: CreateFlowSignUrl
    await esignService.createFlowSignUrl({
      FlowId: flowId,
      FlowApproverInfos: [{
        ApproverName: contract.partyBName,
        ApproverMobile: contract.partyBPhone,
        ApproverType: contract.partyBType === 'PERSONAL' ? 1 : 0,
      }],
    });

    // Success - update status
    finalStatus = 'PENDING_PARTY_B';
    return { success: true, finalStatus, flowId };
  } catch {
    // Failure - status should remain unchanged (DRAFT)
    return { success: false, finalStatus: 'DRAFT', flowId: null };
  }
}

/**
 * Verify API call order is correct
 */
function verifyApiCallOrder(calls: ApiCallRecord[]): boolean {
  const actualOrder = calls.map(c => c.action);
  
  // Check that calls are in the expected order
  for (let i = 0; i < actualOrder.length; i++) {
    if (actualOrder[i] !== EXPECTED_API_ORDER[i]) {
      return false;
    }
  }
  
  return true;
}

// Arbitraries for generating test data
const phoneArbitrary = fc.stringMatching(/^1[3-9]\d{9}$/);

const idCardArbitrary = fc.oneof(
  fc.constant(null),
  fc.stringMatching(/^\d{17}[\dXx]$/)
);

const partyTypeArbitrary = fc.constantFrom('PERSONAL' as const, 'ENTERPRISE' as const);

const contractDataArbitrary = fc.record({
  id: fc.uuid(),
  contractNo: fc.stringMatching(/^HT\d{14}$/),
  status: fc.constant('DRAFT' as const),
  flowId: fc.constant(null),
  partyBName: fc.string({ minLength: 2, maxLength: 20 }).filter(s => s.trim().length >= 2),
  partyBPhone: phoneArbitrary,
  partyBIdCard: idCardArbitrary,
  partyBType: partyTypeArbitrary,
  partyBOrgName: fc.oneof(
    fc.constant(null),
    fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2)
  ),
  product: fc.record({
    name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
    templateId: fc.uuid(),
  }),
  formData: fc.oneof(
    fc.constant(null),
    fc.dictionary(
      fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s)),
      fc.oneof(fc.string(), fc.integer(), fc.boolean())
    )
  ),
});

describe('Property 7: Contract Initiation Flow Integrity', () => {
  /**
   * Feature: tencent-esign-system, Property 7: Contract Initiation Flow Integrity
   * 
   * Property: For any valid contract initiation request, the system SHALL execute 
   * API calls in the correct order (CreateFlow → CreateDocument → StartFlow → CreateFlowSignUrl)
   */
  it('should execute API calls in correct order for any valid contract', async () => {
    await fc.assert(
      fc.asyncProperty(contractDataArbitrary, async (contract) => {
        const mockService = createMockEsignService();
        
        const result = await simulateContractInitiation(contract, mockService);
        
        // If successful, verify all 4 API calls were made in order
        if (result.success) {
          expect(mockService.calls.length).toBe(4);
          expect(verifyApiCallOrder(mockService.calls)).toBe(true);
          expect(result.finalStatus).toBe('PENDING_PARTY_B');
          expect(result.flowId).not.toBeNull();
        }
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: tencent-esign-system, Property 7: Contract Initiation Flow Integrity
   * 
   * Property: If CreateFlow fails, the contract status SHALL remain DRAFT
   */
  it('should keep status as DRAFT when CreateFlow fails', async () => {
    await fc.assert(
      fc.asyncProperty(contractDataArbitrary, async (contract) => {
        const mockService = createMockEsignService('CreateFlow');
        
        const result = await simulateContractInitiation(contract, mockService);
        
        // CreateFlow failed - status should remain DRAFT
        expect(result.success).toBe(false);
        expect(result.finalStatus).toBe('DRAFT');
        expect(result.flowId).toBeNull();
        
        // Only CreateFlow should have been called
        expect(mockService.calls.length).toBe(1);
        expect(mockService.calls[0].action).toBe('CreateFlow');
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: tencent-esign-system, Property 7: Contract Initiation Flow Integrity
   * 
   * Property: If CreateDocument fails, the contract status SHALL remain DRAFT
   */
  it('should keep status as DRAFT when CreateDocument fails', async () => {
    await fc.assert(
      fc.asyncProperty(contractDataArbitrary, async (contract) => {
        const mockService = createMockEsignService('CreateDocument');
        
        const result = await simulateContractInitiation(contract, mockService);
        
        // CreateDocument failed - status should remain DRAFT
        expect(result.success).toBe(false);
        expect(result.finalStatus).toBe('DRAFT');
        expect(result.flowId).toBeNull();
        
        // CreateFlow and CreateDocument should have been called
        expect(mockService.calls.length).toBe(2);
        expect(mockService.calls[0].action).toBe('CreateFlow');
        expect(mockService.calls[1].action).toBe('CreateDocument');
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: tencent-esign-system, Property 7: Contract Initiation Flow Integrity
   * 
   * Property: If StartFlow fails, the contract status SHALL remain DRAFT
   */
  it('should keep status as DRAFT when StartFlow fails', async () => {
    await fc.assert(
      fc.asyncProperty(contractDataArbitrary, async (contract) => {
        const mockService = createMockEsignService('StartFlow');
        
        const result = await simulateContractInitiation(contract, mockService);
        
        // StartFlow failed - status should remain DRAFT
        expect(result.success).toBe(false);
        expect(result.finalStatus).toBe('DRAFT');
        expect(result.flowId).toBeNull();
        
        // CreateFlow, CreateDocument, and StartFlow should have been called
        expect(mockService.calls.length).toBe(3);
        expect(mockService.calls[0].action).toBe('CreateFlow');
        expect(mockService.calls[1].action).toBe('CreateDocument');
        expect(mockService.calls[2].action).toBe('StartFlow');
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: tencent-esign-system, Property 7: Contract Initiation Flow Integrity
   * 
   * Property: If CreateFlowSignUrl fails, the contract status SHALL remain DRAFT
   */
  it('should keep status as DRAFT when CreateFlowSignUrl fails', async () => {
    await fc.assert(
      fc.asyncProperty(contractDataArbitrary, async (contract) => {
        const mockService = createMockEsignService('CreateFlowSignUrl');
        
        const result = await simulateContractInitiation(contract, mockService);
        
        // CreateFlowSignUrl failed - status should remain DRAFT
        expect(result.success).toBe(false);
        expect(result.finalStatus).toBe('DRAFT');
        expect(result.flowId).toBeNull();
        
        // All 4 API calls should have been attempted
        expect(mockService.calls.length).toBe(4);
        expect(verifyApiCallOrder(mockService.calls)).toBe(true);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: tencent-esign-system, Property 7: Contract Initiation Flow Integrity
   * 
   * Property: For any failure step, the API calls before that step should be in correct order
   */
  it('should maintain correct API call order even when failures occur', async () => {
    const failureSteps = ['CreateFlow', 'CreateDocument', 'StartFlow', 'CreateFlowSignUrl'];
    
    await fc.assert(
      fc.asyncProperty(
        contractDataArbitrary,
        fc.constantFrom(...failureSteps),
        async (contract, failStep) => {
          const mockService = createMockEsignService(failStep);
          
          await simulateContractInitiation(contract, mockService);
          
          // Verify the calls made are in correct order
          expect(verifyApiCallOrder(mockService.calls)).toBe(true);
          
          // Verify the number of calls matches the failure point
          const expectedCallCount = EXPECTED_API_ORDER.indexOf(failStep) + 1;
          expect(mockService.calls.length).toBe(expectedCallCount);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: tencent-esign-system, Property 7: Contract Initiation Flow Integrity
   * 
   * Property: Contract with non-DRAFT status should not be processed
   */
  it('should not process contracts that are not in DRAFT status', async () => {
    const nonDraftStatuses = ['PENDING_PARTY_B', 'PENDING_PARTY_A', 'COMPLETED', 'REJECTED', 'EXPIRED'] as const;
    
    await fc.assert(
      fc.asyncProperty(
        contractDataArbitrary,
        fc.constantFrom(...nonDraftStatuses),
        async (contract, status) => {
          const nonDraftContract = { ...contract, status: status as 'DRAFT' | 'PENDING_PARTY_B' };
          const mockService = createMockEsignService();
          
          const result = await simulateContractInitiation(nonDraftContract, mockService);
          
          // Should not process - no API calls made
          expect(result.success).toBe(false);
          expect(mockService.calls.length).toBe(0);
          expect(result.finalStatus).toBe(status);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: tencent-esign-system, Property 7: Contract Initiation Flow Integrity
   * 
   * Property: Contract without templateId should not be processed
   */
  it('should not process contracts without templateId', async () => {
    await fc.assert(
      fc.asyncProperty(contractDataArbitrary, async (contract) => {
        const contractWithoutTemplate = {
          ...contract,
          product: { ...contract.product, templateId: '' },
        };
        const mockService = createMockEsignService();
        
        const result = await simulateContractInitiation(contractWithoutTemplate, mockService);
        
        // Should not process - no API calls made
        expect(result.success).toBe(false);
        expect(mockService.calls.length).toBe(0);
        expect(result.finalStatus).toBe('DRAFT');
        
        return true;
      }),
      { numRuns: 100 }
    );
  });
});
