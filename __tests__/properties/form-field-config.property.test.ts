/**
 * 表单字段配置属性测试
 * Feature: dynamic-contract-form
 * 
 * 测试字段配置的结构完整性、验证逻辑、分类正确性等属性
 */

import * as fc from 'fast-check';
import {
  FieldType,
  FieldFiller,
  FormFieldConfig,
  ProductFormFields,
  SelectOption,
  FILLABLE_COMPONENT_TYPES,
  SIGN_COMPONENT_TYPES,
  COMPONENT_TYPE_MAP,
  FIELD_TYPE_COMPONENT_MAP,
} from '@/types/form-field';

// ============ 生成器定义 ============

// 生成有效的字段名（英文字母和数字组成）
const validFieldNameArb = fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]{0,49}$/);

// 生成有效的显示名称（非空且不是纯空格）
const validLabelArb = fc.string({ minLength: 1, maxLength: 100 })
  .filter(s => s.trim().length > 0);

// 生成字段类型
const fieldTypeArb = fc.constantFrom<FieldType>('text', 'number', 'date', 'select');

// 生成填写方
const fieldFillerArb = fc.constantFrom<FieldFiller>('INITIATOR', 'SIGNER');

// 生成下拉选项（确保 label 和 value 不是纯空格）
const selectOptionArb: fc.Arbitrary<SelectOption> = fc.record({
  label: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  value: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
});

// 生成有效的非 select 类型字段配置
const nonSelectFieldConfigArb: fc.Arbitrary<FormFieldConfig> = fc.record({
  name: validFieldNameArb,
  label: validLabelArb,
  type: fc.constantFrom<FieldType>('text', 'number', 'date'),
  filler: fieldFillerArb,
  required: fc.boolean(),
  defaultValue: fc.option(fc.string(), { nil: undefined }),
  placeholder: fc.option(fc.string(), { nil: undefined }),
});

// 生成有效的 select 类型字段配置（必须有 options）
const selectFieldConfigArb: fc.Arbitrary<FormFieldConfig> = fc.record({
  name: validFieldNameArb,
  label: validLabelArb,
  type: fc.constant<FieldType>('select'),
  filler: fieldFillerArb,
  required: fc.boolean(),
  defaultValue: fc.option(fc.string(), { nil: undefined }),
  placeholder: fc.option(fc.string(), { nil: undefined }),
  options: fc.array(selectOptionArb, { minLength: 1, maxLength: 10 }),
});

// 生成任意有效的字段配置
const validFormFieldConfigArb: fc.Arbitrary<FormFieldConfig> = fc.oneof(
  nonSelectFieldConfigArb,
  selectFieldConfigArb
);

// 生成有效的产品字段配置
const validProductFormFieldsArb: fc.Arbitrary<ProductFormFields> = fc.record({
  initiatorFields: fc.array(validFormFieldConfigArb.filter(f => f.filler === 'INITIATOR' || true).map(f => ({ ...f, filler: 'INITIATOR' as FieldFiller })), { minLength: 0, maxLength: 10 }),
  signerFields: fc.array(validFormFieldConfigArb.filter(f => f.filler === 'SIGNER' || true).map(f => ({ ...f, filler: 'SIGNER' as FieldFiller })), { minLength: 0, maxLength: 10 }),
});

// ============ 辅助函数 ============

/**
 * 验证字段配置结构是否完整
 */
function isValidFormFieldConfig(config: unknown): config is FormFieldConfig {
  if (typeof config !== 'object' || config === null) return false;
  
  const c = config as Record<string, unknown>;
  
  // 必要属性检查
  if (typeof c.name !== 'string' || c.name.length === 0) return false;
  if (typeof c.label !== 'string' || c.label.length === 0) return false;
  if (!['text', 'number', 'date', 'select'].includes(c.type as string)) return false;
  if (!['INITIATOR', 'SIGNER'].includes(c.filler as string)) return false;
  if (typeof c.required !== 'boolean') return false;
  
  // select 类型必须有 options
  if (c.type === 'select') {
    if (!Array.isArray(c.options) || c.options.length === 0) return false;
    // 验证每个选项
    for (const opt of c.options) {
      if (typeof opt !== 'object' || opt === null) return false;
      if (typeof (opt as SelectOption).label !== 'string') return false;
      if (typeof (opt as SelectOption).value !== 'string') return false;
    }
  }
  
  return true;
}

/**
 * 验证产品字段配置结构
 */
function isValidProductFormFields(config: unknown): config is ProductFormFields {
  if (typeof config !== 'object' || config === null) return false;
  
  const c = config as Record<string, unknown>;
  
  if (!Array.isArray(c.initiatorFields)) return false;
  if (!Array.isArray(c.signerFields)) return false;
  
  // 验证每个字段配置
  for (const field of c.initiatorFields) {
    if (!isValidFormFieldConfig(field)) return false;
  }
  for (const field of c.signerFields) {
    if (!isValidFormFieldConfig(field)) return false;
  }
  
  return true;
}

// ============ 属性测试 ============

describe('FormFieldConfig Properties', () => {
  describe('Property 3: 字段配置结构完整性', () => {
    /**
     * Property 3.1: 有效的字段配置必须包含所有必要属性
     * Validates: Requirements 2.4, 2.5
     */
    it('有效的字段配置应该通过结构验证', () => {
      fc.assert(
        fc.property(validFormFieldConfigArb, (config) => {
          return isValidFormFieldConfig(config);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property 3.2: select 类型字段必须有非空的 options 数组
     * Validates: Requirements 2.5
     */
    it('select 类型字段必须有 options', () => {
      fc.assert(
        fc.property(selectFieldConfigArb, (config) => {
          return config.type === 'select' && 
                 Array.isArray(config.options) && 
                 config.options.length > 0;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property 3.3: 非 select 类型字段可以没有 options
     * Validates: Requirements 2.4
     */
    it('非 select 类型字段不需要 options', () => {
      fc.assert(
        fc.property(nonSelectFieldConfigArb, (config) => {
          return ['text', 'number', 'date'].includes(config.type) &&
                 isValidFormFieldConfig(config);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property 3.4: filler 属性只能是 INITIATOR 或 SIGNER
     * Validates: Requirements 2.1
     */
    it('filler 属性只能是 INITIATOR 或 SIGNER', () => {
      fc.assert(
        fc.property(validFormFieldConfigArb, (config) => {
          return config.filler === 'INITIATOR' || config.filler === 'SIGNER';
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property 3.5: type 属性只能是 text/number/date/select
     * Validates: Requirements 2.4
     */
    it('type 属性只能是有效的字段类型', () => {
      fc.assert(
        fc.property(validFormFieldConfigArb, (config) => {
          return ['text', 'number', 'date', 'select'].includes(config.type);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('类型映射常量验证', () => {
    /**
     * 验证填写控件类型常量
     */
    it('FILLABLE_COMPONENT_TYPES 应该包含所有填写控件类型', () => {
      expect(FILLABLE_COMPONENT_TYPES).toContain('TEXT');
      expect(FILLABLE_COMPONENT_TYPES).toContain('MULTI_LINE_TEXT');
      expect(FILLABLE_COMPONENT_TYPES).toContain('NUMBER');
      expect(FILLABLE_COMPONENT_TYPES).toContain('DATE');
      expect(FILLABLE_COMPONENT_TYPES).toContain('SELECT');
    });

    /**
     * 验证签署控件类型常量
     */
    it('SIGN_COMPONENT_TYPES 应该包含所有签署控件类型', () => {
      expect(SIGN_COMPONENT_TYPES).toContain('SIGN');
      expect(SIGN_COMPONENT_TYPES).toContain('SEAL');
      expect(SIGN_COMPONENT_TYPES).toContain('DATE_SIGN');
    });

    /**
     * 验证控件类型映射
     */
    it('COMPONENT_TYPE_MAP 应该正确映射控件类型到字段类型', () => {
      expect(COMPONENT_TYPE_MAP['TEXT']).toBe('text');
      expect(COMPONENT_TYPE_MAP['MULTI_LINE_TEXT']).toBe('text');
      expect(COMPONENT_TYPE_MAP['NUMBER']).toBe('number');
      expect(COMPONENT_TYPE_MAP['DATE']).toBe('date');
      expect(COMPONENT_TYPE_MAP['SELECT']).toBe('select');
    });

    /**
     * 验证字段类型到组件的映射
     */
    it('FIELD_TYPE_COMPONENT_MAP 应该正确映射字段类型到 UI 组件', () => {
      expect(FIELD_TYPE_COMPONENT_MAP['text']).toBe('Input');
      expect(FIELD_TYPE_COMPONENT_MAP['number']).toBe('InputNumber');
      expect(FIELD_TYPE_COMPONENT_MAP['date']).toBe('DatePicker');
      expect(FIELD_TYPE_COMPONENT_MAP['select']).toBe('Select');
    });
  });

  describe('ProductFormFields 结构验证', () => {
    /**
     * 验证产品字段配置结构
     */
    it('有效的产品字段配置应该通过结构验证', () => {
      fc.assert(
        fc.property(validProductFormFieldsArb, (config) => {
          return isValidProductFormFields(config);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * 验证空配置也是有效的
     */
    it('空的字段配置也是有效的', () => {
      const emptyConfig: ProductFormFields = {
        initiatorFields: [],
        signerFields: [],
      };
      expect(isValidProductFormFields(emptyConfig)).toBe(true);
    });
  });
});


// ============ 导入验证函数 ============
import {
  validateFormFieldConfig,
  validateFormFieldsConfig,
  classifyFieldsByFiller,
  getInitiatorFields,
} from '@/services/product.service';

// ============ Property 6: 配置验证正确性 ============

describe('Property 6: 配置验证正确性', () => {
  /**
   * Property 6.1: 有效的字段配置应该通过验证
   * Validates: Requirements 3.4
   */
  it('有效的字段配置应该通过验证', () => {
    fc.assert(
      fc.property(validFormFieldConfigArb, (config) => {
        const result = validateFormFieldConfig(config);
        return result.valid === true && result.errors.length === 0;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6.2: 缺少 name 属性的配置应该验证失败
   * Validates: Requirements 3.4
   */
  it('缺少 name 属性的配置应该验证失败', () => {
    fc.assert(
      fc.property(validFormFieldConfigArb, (config) => {
        const invalidConfig = { ...config, name: '' };
        const result = validateFormFieldConfig(invalidConfig);
        return result.valid === false && result.errors.some(e => e.includes('name'));
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6.3: 缺少 label 属性的配置应该验证失败
   * Validates: Requirements 3.4
   */
  it('缺少 label 属性的配置应该验证失败', () => {
    fc.assert(
      fc.property(validFormFieldConfigArb, (config) => {
        const invalidConfig = { ...config, label: '' };
        const result = validateFormFieldConfig(invalidConfig);
        return result.valid === false && result.errors.some(e => e.includes('label'));
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6.4: 无效的 type 应该验证失败
   * Validates: Requirements 3.4
   */
  it('无效的 type 应该验证失败', () => {
    fc.assert(
      fc.property(validFormFieldConfigArb, (config) => {
        const invalidConfig = { ...config, type: 'invalid_type' };
        const result = validateFormFieldConfig(invalidConfig);
        return result.valid === false && result.errors.some(e => e.includes('type'));
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6.5: 无效的 filler 应该验证失败
   * Validates: Requirements 3.4
   */
  it('无效的 filler 应该验证失败', () => {
    fc.assert(
      fc.property(validFormFieldConfigArb, (config) => {
        const invalidConfig = { ...config, filler: 'INVALID' };
        const result = validateFormFieldConfig(invalidConfig);
        return result.valid === false && result.errors.some(e => e.includes('filler'));
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6.6: select 类型没有 options 应该验证失败
   * Validates: Requirements 3.4
   */
  it('select 类型没有 options 应该验证失败', () => {
    const invalidSelectConfig = {
      name: 'testField',
      label: '测试字段',
      type: 'select' as const,
      filler: 'INITIATOR' as const,
      required: true,
      // 没有 options
    };
    const result = validateFormFieldConfig(invalidSelectConfig);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('options'))).toBe(true);
  });

  /**
   * Property 6.7: select 类型有空 options 数组应该验证失败
   * Validates: Requirements 3.4
   */
  it('select 类型有空 options 数组应该验证失败', () => {
    const invalidSelectConfig = {
      name: 'testField',
      label: '测试字段',
      type: 'select' as const,
      filler: 'INITIATOR' as const,
      required: true,
      options: [],
    };
    const result = validateFormFieldConfig(invalidSelectConfig);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('options'))).toBe(true);
  });

  /**
   * Property 6.8: 有效的产品字段配置应该通过验证
   * Validates: Requirements 3.4
   */
  it('有效的产品字段配置应该通过验证', () => {
    fc.assert(
      fc.property(validProductFormFieldsArb, (config) => {
        const result = validateFormFieldsConfig(config);
        return result.valid === true && result.errors.length === 0;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6.9: 空的产品字段配置也是有效的
   * Validates: Requirements 3.4
   */
  it('空的产品字段配置也是有效的', () => {
    const emptyConfig: ProductFormFields = {
      initiatorFields: [],
      signerFields: [],
    };
    const result = validateFormFieldsConfig(emptyConfig);
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  /**
   * Property 6.10: 非对象配置应该验证失败
   * Validates: Requirements 3.4
   */
  it('非对象配置应该验证失败', () => {
    expect(validateFormFieldsConfig(null).valid).toBe(false);
    expect(validateFormFieldsConfig(undefined).valid).toBe(false);
    expect(validateFormFieldsConfig('string').valid).toBe(false);
    expect(validateFormFieldsConfig(123).valid).toBe(false);
    expect(validateFormFieldsConfig([]).valid).toBe(false);
  });
});


// ============ 导入控件过滤函数 ============
import {
  filterFillableComponents,
  convertComponentsToFormFields,
  mergeFieldConfigs,
  TemplateComponent,
} from '@/services/product.service';

// ============ 控件生成器 ============

// 填写控件类型
const fillableComponentTypes = ['TEXT', 'MULTI_LINE_TEXT', 'NUMBER', 'DATE', 'SELECT'] as const;

// 签署控件类型
const signComponentTypes = ['SIGN', 'SEAL', 'DATE_SIGN', 'SIGN_SEAL', 'SIGN_DATE', 'SIGN_SIGNATURE'] as const;

// 生成填写控件
const fillableComponentArb: fc.Arbitrary<TemplateComponent> = fc.record({
  ComponentId: fc.string({ minLength: 1, maxLength: 50 }),
  ComponentName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  ComponentType: fc.constantFrom(...fillableComponentTypes),
  ComponentRequired: fc.boolean(),
  ComponentValue: fc.option(fc.string(), { nil: undefined }),
  ComponentExtra: fc.option(fc.string(), { nil: undefined }),
});

// 生成签署控件
const signComponentArb: fc.Arbitrary<TemplateComponent> = fc.record({
  ComponentId: fc.string({ minLength: 1, maxLength: 50 }),
  ComponentName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  ComponentType: fc.constantFrom(...signComponentTypes),
  ComponentRequired: fc.boolean(),
  ComponentValue: fc.option(fc.string(), { nil: undefined }),
  ComponentExtra: fc.option(fc.string(), { nil: undefined }),
});

// 生成混合控件列表
const mixedComponentsArb = fc.array(
  fc.oneof(fillableComponentArb, signComponentArb),
  { minLength: 0, maxLength: 20 }
);

// ============ Property 1: 控件过滤正确性 ============

describe('Property 1: 控件过滤正确性', () => {
  /**
   * Property 1.1: 过滤后的结果只包含填写控件
   * Validates: Requirements 1.2
   */
  it('过滤后的结果只包含填写控件', () => {
    fc.assert(
      fc.property(mixedComponentsArb, (components) => {
        const filtered = filterFillableComponents(components);
        
        // 所有过滤后的控件都应该是填写控件类型
        return filtered.every(c => 
          fillableComponentTypes.includes(c.ComponentType as typeof fillableComponentTypes[number])
        );
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 1.2: 过滤后的结果不包含签署控件
   * Validates: Requirements 1.2
   */
  it('过滤后的结果不包含签署控件', () => {
    fc.assert(
      fc.property(mixedComponentsArb, (components) => {
        const filtered = filterFillableComponents(components);
        
        // 所有过滤后的控件都不应该是签署控件类型
        return filtered.every(c => 
          !signComponentTypes.includes(c.ComponentType as typeof signComponentTypes[number])
        );
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 1.3: 纯填写控件列表过滤后数量不变
   * Validates: Requirements 1.2
   */
  it('纯填写控件列表过滤后数量不变', () => {
    fc.assert(
      fc.property(
        fc.array(fillableComponentArb, { minLength: 0, maxLength: 20 }),
        (components) => {
          const filtered = filterFillableComponents(components);
          return filtered.length === components.length;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 1.4: 纯签署控件列表过滤后为空
   * Validates: Requirements 1.2
   */
  it('纯签署控件列表过滤后为空', () => {
    fc.assert(
      fc.property(
        fc.array(signComponentArb, { minLength: 0, maxLength: 20 }),
        (components) => {
          const filtered = filterFillableComponents(components);
          return filtered.length === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 1.5: 空列表过滤后仍为空
   * Validates: Requirements 1.2
   */
  it('空列表过滤后仍为空', () => {
    const filtered = filterFillableComponents([]);
    expect(filtered.length).toBe(0);
  });
});

// ============ 控件转换测试 ============

describe('控件转换测试', () => {
  /**
   * 转换后的字段配置应该保留控件信息
   */
  it('转换后的字段配置应该保留控件信息', () => {
    fc.assert(
      fc.property(
        fc.array(fillableComponentArb, { minLength: 1, maxLength: 10 }),
        (components) => {
          const fields = convertComponentsToFormFields(components);
          
          // 数量应该相同
          if (fields.length !== components.length) return false;
          
          // 每个字段都应该有 componentId 和 componentType
          return fields.every((field, i) => 
            field.componentId === components[i].ComponentId &&
            field.componentType === components[i].ComponentType
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * 转换后的字段类型应该正确映射
   */
  it('转换后的字段类型应该正确映射', () => {
    const typeMap: Record<string, string> = {
      'TEXT': 'text',
      'MULTI_LINE_TEXT': 'text',
      'NUMBER': 'number',
      'DATE': 'date',
      'SELECT': 'select',
    };

    fc.assert(
      fc.property(fillableComponentArb, (component) => {
        const fields = convertComponentsToFormFields([component]);
        const field = fields[0];
        
        const expectedType = typeMap[component.ComponentType] || 'text';
        return field.type === expectedType;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * 转换后的必填属性应该保留
   */
  it('转换后的必填属性应该保留', () => {
    fc.assert(
      fc.property(fillableComponentArb, (component) => {
        const fields = convertComponentsToFormFields([component]);
        const field = fields[0];
        
        return field.required === component.ComponentRequired;
      }),
      { numRuns: 100 }
    );
  });
});

// ============ Property 11: 配置合并正确性 ============

describe('Property 11: 配置合并正确性', () => {
  /**
   * Property 11.1: 合并后应该保留已有配置的自定义属性
   * Validates: Requirements 6.5
   */
  it('合并后应该保留已有配置的自定义属性', () => {
    fc.assert(
      fc.property(
        validFormFieldConfigArb,
        validFormFieldConfigArb,
        (existing, newField) => {
          // 使用相同的 name
          const existingWithName = { ...existing, name: 'testField' };
          const newWithName = { ...newField, name: 'testField' };
          
          const merged = mergeFieldConfigs([existingWithName], [newWithName]);
          
          // 应该只有一个字段
          if (merged.length !== 1) return false;
          
          const result = merged[0];
          
          // 应该保留已有配置的自定义属性
          return (
            result.label === existingWithName.label &&
            result.filler === existingWithName.filler &&
            result.required === existingWithName.required
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11.2: 新字段应该被添加
   * Validates: Requirements 6.5
   */
  it('新字段应该被添加', () => {
    fc.assert(
      fc.property(
        validFormFieldConfigArb,
        validFormFieldConfigArb,
        (existing, newField) => {
          // 使用不同的 name
          const existingWithName = { ...existing, name: 'existingField' };
          const newWithName = { ...newField, name: 'newField' };
          
          const merged = mergeFieldConfigs([existingWithName], [newWithName]);
          
          // 应该只有新字段（因为 mergeFieldConfigs 只返回 newFields 中的字段）
          return merged.length === 1 && merged[0].name === 'newField';
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11.3: 空已有配置时应该返回新字段
   * Validates: Requirements 6.5
   */
  it('空已有配置时应该返回新字段', () => {
    fc.assert(
      fc.property(
        fc.array(validFormFieldConfigArb, { minLength: 1, maxLength: 10 }),
        (newFields) => {
          const merged = mergeFieldConfigs([], newFields);
          
          // 应该返回所有新字段
          return merged.length === newFields.length;
        }
      ),
      { numRuns: 100 }
    );
  });
});


// ============ Property 2 & 5: 字段分类正确性 ============

describe('Property 2 & 5: 字段分类正确性', () => {
  /**
   * Property 2.1: 发起方字段应该出现在 getInitiatorFields 返回结果中
   * Validates: Requirements 2.2
   */
  it('发起方字段应该出现在 getInitiatorFields 返回结果中', () => {
    fc.assert(
      fc.property(
        fc.array(validFormFieldConfigArb.map(f => ({ ...f, filler: 'INITIATOR' as const })), { minLength: 1, maxLength: 10 }),
        fc.array(validFormFieldConfigArb.map(f => ({ ...f, filler: 'SIGNER' as const })), { minLength: 0, maxLength: 10 }),
        (initiatorFields, signerFields) => {
          const product = {
            formFields: {
              initiatorFields,
              signerFields,
            },
          };
          
          const result = getInitiatorFields(product);
          
          // 返回的字段数量应该等于发起方字段数量
          return result.length === initiatorFields.length;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2.2: 签署方字段不应该出现在 getInitiatorFields 返回结果中
   * Validates: Requirements 2.3
   */
  it('签署方字段不应该出现在 getInitiatorFields 返回结果中', () => {
    fc.assert(
      fc.property(
        fc.array(validFormFieldConfigArb.map(f => ({ ...f, filler: 'INITIATOR' as const })), { minLength: 0, maxLength: 10 }),
        fc.array(validFormFieldConfigArb.map(f => ({ ...f, filler: 'SIGNER' as const })), { minLength: 1, maxLength: 10 }),
        (initiatorFields, signerFields) => {
          const product = {
            formFields: {
              initiatorFields,
              signerFields,
            },
          };
          
          const result = getInitiatorFields(product);
          
          // 返回的字段都应该是 INITIATOR
          return result.every(f => f.filler === 'INITIATOR');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5.1: classifyFieldsByFiller 应该正确分类字段
   * Validates: Requirements 3.2
   */
  it('classifyFieldsByFiller 应该正确分类字段', () => {
    fc.assert(
      fc.property(
        fc.array(validFormFieldConfigArb, { minLength: 0, maxLength: 20 }),
        (fields) => {
          const result = classifyFieldsByFiller(fields);
          
          // 发起方字段数量
          const expectedInitiatorCount = fields.filter(f => f.filler === 'INITIATOR').length;
          // 签署方字段数量
          const expectedSignerCount = fields.filter(f => f.filler === 'SIGNER').length;
          
          return (
            result.initiatorFields.length === expectedInitiatorCount &&
            result.signerFields.length === expectedSignerCount
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5.2: 分类后的发起方字段都应该是 INITIATOR
   * Validates: Requirements 3.2
   */
  it('分类后的发起方字段都应该是 INITIATOR', () => {
    fc.assert(
      fc.property(
        fc.array(validFormFieldConfigArb, { minLength: 0, maxLength: 20 }),
        (fields) => {
          const result = classifyFieldsByFiller(fields);
          
          return result.initiatorFields.every(f => f.filler === 'INITIATOR');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5.3: 分类后的签署方字段都应该是 SIGNER
   * Validates: Requirements 3.2
   */
  it('分类后的签署方字段都应该是 SIGNER', () => {
    fc.assert(
      fc.property(
        fc.array(validFormFieldConfigArb, { minLength: 0, maxLength: 20 }),
        (fields) => {
          const result = classifyFieldsByFiller(fields);
          
          return result.signerFields.every(f => f.filler === 'SIGNER');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5.4: 空 formFields 应该返回空数组
   * Validates: Requirements 2.2, 2.3
   */
  it('空 formFields 应该返回空数组', () => {
    expect(getInitiatorFields({ formFields: null })).toEqual([]);
    expect(getInitiatorFields({ formFields: undefined })).toEqual([]);
    expect(getInitiatorFields({})).toEqual([]);
  });
});


// ============ Property 4: 配置序列化 Round-Trip ============

describe('Property 4: 配置序列化 Round-Trip', () => {
  /**
   * Property 4.1: ProductFormFields 序列化后反序列化应该得到相同配置
   * Validates: Requirements 3.1, 3.3
   */
  it('ProductFormFields 序列化后反序列化应该得到相同配置', () => {
    fc.assert(
      fc.property(validProductFormFieldsArb, (config) => {
        // 序列化
        const serialized = JSON.stringify(config);
        // 反序列化
        const deserialized = JSON.parse(serialized) as ProductFormFields;
        // 再次序列化
        const reSerialized = JSON.stringify(deserialized);
        
        // 两次序列化的结果应该相同
        return serialized === reSerialized;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4.2: 单个字段配置序列化后反序列化应该得到相同配置
   * Validates: Requirements 3.1, 3.3
   */
  it('单个字段配置序列化后反序列化应该得到相同配置', () => {
    fc.assert(
      fc.property(validFormFieldConfigArb, (config) => {
        // 序列化
        const serialized = JSON.stringify(config);
        // 反序列化
        const deserialized = JSON.parse(serialized) as FormFieldConfig;
        // 再次序列化
        const reSerialized = JSON.stringify(deserialized);
        
        // 两次序列化的结果应该相同
        return serialized === reSerialized;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4.3: 反序列化后的配置应该通过验证
   * Validates: Requirements 3.1, 3.3
   */
  it('反序列化后的配置应该通过验证', () => {
    fc.assert(
      fc.property(validProductFormFieldsArb, (config) => {
        // 序列化
        const serialized = JSON.stringify(config);
        // 反序列化
        const deserialized = JSON.parse(serialized);
        
        // 验证反序列化后的配置
        const result = validateFormFieldsConfig(deserialized);
        return result.valid === true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4.4: 反序列化后的字段数量应该保持不变
   * Validates: Requirements 3.1, 3.3
   */
  it('反序列化后的字段数量应该保持不变', () => {
    fc.assert(
      fc.property(validProductFormFieldsArb, (config) => {
        // 序列化
        const serialized = JSON.stringify(config);
        // 反序列化
        const deserialized = JSON.parse(serialized) as ProductFormFields;
        
        return (
          deserialized.initiatorFields.length === config.initiatorFields.length &&
          deserialized.signerFields.length === config.signerFields.length
        );
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4.5: 字符串形式的 formFields 也能正确解析
   * Validates: Requirements 3.1, 3.3
   */
  it('字符串形式的 formFields 也能正确解析', () => {
    fc.assert(
      fc.property(validProductFormFieldsArb, (config) => {
        // 模拟数据库存储（JSON 字符串）
        const product = {
          formFields: JSON.stringify(config),
        };
        
        // getInitiatorFields 应该能正确解析字符串形式的 formFields
        const result = getInitiatorFields(product);
        
        // 返回的字段数量应该等于发起方字段数量
        return result.length === config.initiatorFields.length;
      }),
      { numRuns: 100 }
    );
  });
});


// ============ 导入动态表单函数 ============
import {
  validateDynamicFormData,
  buildFormFieldsForDocument,
} from '@/components/contract/DynamicForm';

// ============ Property 7: 类型映射正确性 ============

describe('Property 7: 类型映射正确性', () => {
  /**
   * Property 7.1: 每种字段类型都应该有对应的 UI 组件
   * Validates: Requirements 4.2
   */
  it('每种字段类型都应该有对应的 UI 组件', () => {
    const fieldTypes: FieldType[] = ['text', 'number', 'date', 'select'];
    
    fieldTypes.forEach((type) => {
      expect(FIELD_TYPE_COMPONENT_MAP[type]).toBeDefined();
    });
  });

  /**
   * Property 7.2: 控件类型映射应该覆盖所有填写控件
   * Validates: Requirements 4.2
   */
  it('控件类型映射应该覆盖所有填写控件', () => {
    FILLABLE_COMPONENT_TYPES.forEach((componentType) => {
      expect(COMPONENT_TYPE_MAP[componentType]).toBeDefined();
    });
  });
});

// ============ Property 8: 默认值处理正确性 ============

describe('Property 8: 默认值处理正确性', () => {
  /**
   * Property 8.1: 有默认值的字段应该在 buildFormFieldsForDocument 中包含
   * Validates: Requirements 4.4
   */
  it('有默认值的字段应该在 buildFormFieldsForDocument 中包含', () => {
    fc.assert(
      fc.property(
        validFormFieldConfigArb,
        fc.string({ minLength: 1, maxLength: 50 }),
        (field, defaultValue) => {
          const fieldWithDefault = { ...field, defaultValue };
          const values = { [field.name]: defaultValue };
          
          const result = buildFormFieldsForDocument([fieldWithDefault], values);
          
          // 应该包含该字段
          return result.some(r => r.ComponentName === field.name);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8.2: 空值字段不应该在 buildFormFieldsForDocument 中包含
   * Validates: Requirements 4.4
   */
  it('空值字段不应该在 buildFormFieldsForDocument 中包含', () => {
    fc.assert(
      fc.property(validFormFieldConfigArb, (field) => {
        const values = { [field.name]: '' };
        
        const result = buildFormFieldsForDocument([field], values);
        
        // 不应该包含该字段
        return !result.some(r => r.ComponentName === field.name);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8.3: undefined 值字段不应该在 buildFormFieldsForDocument 中包含
   * Validates: Requirements 4.4
   */
  it('undefined 值字段不应该在 buildFormFieldsForDocument 中包含', () => {
    fc.assert(
      fc.property(validFormFieldConfigArb, (field) => {
        const values = { [field.name]: undefined };
        
        const result = buildFormFieldsForDocument([field], values);
        
        // 不应该包含该字段
        return !result.some(r => r.ComponentName === field.name);
      }),
      { numRuns: 100 }
    );
  });
});

// ============ Property 9: 必填字段验证 ============

describe('Property 9: 必填字段验证', () => {
  /**
   * Property 9.1: 必填字段为空时验证应该失败
   * Validates: Requirements 5.1, 5.5
   */
  it('必填字段为空时验证应该失败', () => {
    fc.assert(
      fc.property(
        validFormFieldConfigArb.map(f => ({ ...f, required: true })),
        (field) => {
          const values = { [field.name]: '' };
          
          const result = validateDynamicFormData([field], values);
          
          // 验证应该失败
          return result.valid === false && result.errors.length > 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9.2: 必填字段有值时验证应该通过
   * Validates: Requirements 5.1, 5.5
   */
  it('必填字段有值时验证应该通过', () => {
    fc.assert(
      fc.property(
        validFormFieldConfigArb.map(f => ({ ...f, required: true })),
        fc.string({ minLength: 1, maxLength: 50 }),
        (field, value) => {
          const values = { [field.name]: value };
          
          const result = validateDynamicFormData([field], values);
          
          // 验证应该通过
          return result.valid === true && result.errors.length === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9.3: 非必填字段为空时验证应该通过
   * Validates: Requirements 5.1, 5.5
   */
  it('非必填字段为空时验证应该通过', () => {
    fc.assert(
      fc.property(
        validFormFieldConfigArb.map(f => ({ ...f, required: false })),
        (field) => {
          const values = { [field.name]: '' };
          
          const result = validateDynamicFormData([field], values);
          
          // 验证应该通过
          return result.valid === true && result.errors.length === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9.4: 多个必填字段都为空时应该返回多个错误
   * Validates: Requirements 5.1, 5.5
   */
  it('多个必填字段都为空时应该返回多个错误', () => {
    fc.assert(
      fc.property(
        fc.array(
          validFormFieldConfigArb.map(f => ({ ...f, required: true })),
          { minLength: 2, maxLength: 5 }
        ).filter(fields => {
          // 确保字段名不重复
          const names = fields.map(f => f.name);
          return new Set(names).size === names.length;
        }),
        (fields) => {
          // 所有字段都为空
          const values: Record<string, string> = {};
          fields.forEach(f => { values[f.name] = ''; });
          
          const result = validateDynamicFormData(fields, values);
          
          // 错误数量应该等于必填字段数量
          return result.valid === false && result.errors.length === fields.length;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9.5: 空字段列表验证应该通过
   * Validates: Requirements 5.1
   */
  it('空字段列表验证应该通过', () => {
    const result = validateDynamicFormData([], {});
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });
});

// ============ Property 10: API 参数转换正确性 ============

describe('Property 10: API 参数转换正确性', () => {
  /**
   * Property 10.1: 转换后的格式应该符合腾讯电子签 API 要求
   * Validates: Requirements 5.3, 5.4
   */
  it('转换后的格式应该符合腾讯电子签 API 要求', () => {
    fc.assert(
      fc.property(
        validFormFieldConfigArb,
        fc.string({ minLength: 1, maxLength: 50 }),
        (field, value) => {
          const values = { [field.name]: value };
          
          const result = buildFormFieldsForDocument([field], values);
          
          // 每个结果都应该有 ComponentName 和 ComponentValue
          return result.every(r => 
            typeof r.ComponentName === 'string' &&
            typeof r.ComponentValue === 'string'
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10.2: ComponentName 应该等于字段的 name
   * Validates: Requirements 5.3
   */
  it('ComponentName 应该等于字段的 name', () => {
    fc.assert(
      fc.property(
        validFormFieldConfigArb,
        fc.string({ minLength: 1, maxLength: 50 }),
        (field, value) => {
          const values = { [field.name]: value };
          
          const result = buildFormFieldsForDocument([field], values);
          
          // ComponentName 应该等于字段名
          return result.length === 1 && result[0].ComponentName === field.name;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10.3: ComponentValue 应该是字符串类型
   * Validates: Requirements 5.4
   */
  it('ComponentValue 应该是字符串类型', () => {
    fc.assert(
      fc.property(
        validFormFieldConfigArb,
        fc.oneof(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 1, max: 10000 }),
        ),
        (field, value) => {
          const values = { [field.name]: value };
          
          const result = buildFormFieldsForDocument([field], values);
          
          // ComponentValue 应该是字符串
          return result.every(r => typeof r.ComponentValue === 'string');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10.4: 数字类型值应该正确转换为字符串
   * Validates: Requirements 5.4
   */
  it('数字类型值应该正确转换为字符串', () => {
    fc.assert(
      fc.property(
        validFormFieldConfigArb.map(f => ({ ...f, type: 'number' as const })),
        fc.integer({ min: 0, max: 1000000 }),
        (field, value) => {
          const values = { [field.name]: value };
          
          const result = buildFormFieldsForDocument([field], values);
          
          // 数字应该被转换为字符串
          return result.length === 1 && result[0].ComponentValue === String(value);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10.5: 只有发起方字段应该被转换
   * Validates: Requirements 5.3
   */
  it('只有有值的字段应该被转换', () => {
    fc.assert(
      fc.property(
        fc.array(validFormFieldConfigArb, { minLength: 2, maxLength: 5 })
          .filter(fields => {
            // 确保字段名不重复
            const names = fields.map(f => f.name);
            return new Set(names).size === names.length;
          }),
        (fields) => {
          // 只给第一个字段赋值
          const values: Record<string, string> = {
            [fields[0].name]: 'test_value',
          };
          
          const result = buildFormFieldsForDocument(fields, values);
          
          // 只应该有一个结果
          return result.length === 1 && result[0].ComponentName === fields[0].name;
        }
      ),
      { numRuns: 100 }
    );
  });
});
