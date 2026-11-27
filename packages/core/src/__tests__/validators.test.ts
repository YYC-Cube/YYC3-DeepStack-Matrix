/**
 * @file: validators.test.ts
 * @description: validators + config-validator + figma-error-filter 用例（导出面冒烟 + 分支覆盖）
 * @author: YanYuCloudCube Team
 * @version: v0.1.0
 * @created: 2026-11-27
 * @status: active
 */
import { describe, it, expect } from 'vitest';
import {
  isValidUrl,
  validateUrl,
  isValidEmail,
  validateEmail,
  isValidId,
  validateId,
  isNonEmptyString,
  validateStringLength,
  validateNumberRange,
  isValidPercentage,
  validatePercentage,
  isValidApiKey,
  validateApiKey,
  validateAll,
  validateObject,
  validateModelProvider,
  validateConfiguredModel,
} from '../validators';
import {
  validateAPIConfig,
  validatePartialAPIConfig,
  formatValidationErrors,
  getDefaultValue,
  sanitizeAPIConfig,
  apiEndpointsSchema,
} from '../config-validator';
import { isFigmaPlatformError } from '../figma-error-filter';

const VALID_CONFIG = {
  fsBase: '/api/fs',
  dbBase: '/api/db',
  wsEndpoint: 'ws://localhost:3113/ws',
  aiBase: 'https://api.openai.com/v1',
  clusterBase: '/api/cluster',
  enableBackend: false,
  timeout: 15000,
  maxRetries: 2,
};

describe('validators / isValidUrl + validateUrl', () => {
  it('接受 http/https', () => {
    expect(isValidUrl('http://localhost:3113/api')).toBe(true);
    expect(isValidUrl('https://api.openai.com/v1')).toBe(true);
  });

  it('拒绝非 http 协议与空值', () => {
    expect(isValidUrl('ftp://x')).toBe(false);
    expect(isValidUrl('ws://localhost')).toBe(false);
    expect(isValidUrl('')).toBe(false);
    expect(isValidUrl(undefined as unknown as string)).toBe(false);
    expect(isValidUrl(123 as unknown as string)).toBe(false);
  });

  it('validateUrl 空值返回错误', () => {
    const r = validateUrl('', 'baseUrl');
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toContain('不能为空');
  });

  it('validateUrl 非法格式', () => {
    const r = validateUrl('notaurl');
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes('格式无效'))).toBe(true);
  });

  it('validateUrl 端口越界', () => {
    // WHATWG URL 对 >65535 端口直接抛 TypeError → 落入「格式无效 + 解析失败」分支
    const r = validateUrl('http://localhost:99999');
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes('格式无效'))).toBe(true);
    expect(r.errors.some((e) => e.includes('解析失败'))).toBe(true);
  });

  it('validateUrl 超长 URL', () => {
    const r = validateUrl(`https://example.com/${'a'.repeat(2100)}`);
    expect(r.errors.some((e) => e.includes('2048'))).toBe(true);
  });

  it('validateUrl 合法值通过全部检查', () => {
    expect(validateUrl('https://example.com:8443/path').valid).toBe(true);
  });
});

describe('validators / email', () => {
  it('合法邮箱', () => {
    expect(isValidEmail('admin@0379.email')).toBe(true);
    expect(isValidEmail('  dev@yyc3.local  ')).toBe(true);
  });
  it('非法邮箱', () => {
    expect(isValidEmail('no-at-sign')).toBe(false);
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail(null as unknown as string)).toBe(false);
  });
  it('validateEmail 长度越界', () => {
    // 'a@' 长度 2 < 3 → 长度分支
    expect(validateEmail('a@').errors.some((e) => e.includes('3-254'))).toBe(true);
    expect(validateEmail(`${'x'.repeat(260)}@y.com`).errors.some((e) => e.includes('3-254'))).toBe(true);
    // 'a@b' 长度恰 3 → 仅格式分支
    expect(validateEmail('a@b').errors.some((e) => e.includes('格式无效'))).toBe(true);
    expect(validateEmail('a@b').errors.some((e) => e.includes('3-254'))).toBe(false);
  });
  it('validateEmail 格式与非法字符', () => {
    expect(validateEmail('bad-email').errors.some((e) => e.includes('格式无效'))).toBe(true);
    expect(validateEmail('a b@c.com').errors.some((e) => e.includes('非法字符'))).toBe(true);
    expect(validateEmail('a..b@c.com').errors.some((e) => e.includes('非法字符'))).toBe(true);
  });
  it('validateEmail 合法', () => {
    expect(validateEmail('user@example.com').valid).toBe(true);
  });
});

describe('validators / id + string + number', () => {
  it('isValidId 边界', () => {
    expect(isValidId('abc-123')).toBe(true);
    expect(isValidId('')).toBe(false);
    expect(isValidId('has space')).toBe(false);
    expect(isValidId('x'.repeat(129))).toBe(false);
  });
  it('validateId 分支', () => {
    expect(validateId('').errors[0]).toContain('不能为空');
    expect(validateId('bad id').errors.some((e) => e.includes('连字符'))).toBe(true);
    expect(validateId('ok_id').valid).toBe(true);
  });
  it('isNonEmptyString', () => {
    expect(isNonEmptyString(' x ')).toBe(true);
    expect(isNonEmptyString('   ')).toBe(false);
    expect(isNonEmptyString(1)).toBe(false);
  });
  it('validateStringLength 分支', () => {
    expect(validateStringLength(123 as unknown as string, {}).errors[0]).toContain('字符串类型');
    expect(validateStringLength('ab', { min: 3 }).valid).toBe(false);
    expect(validateStringLength('abcd', { max: 3 }).valid).toBe(false);
    expect(validateStringLength('abc', { min: 1, max: 5, fieldName: '名' }).valid).toBe(true);
  });
  it('validateNumberRange 分支', () => {
    expect(validateNumberRange(NaN, {}).valid).toBe(false);
    expect(validateNumberRange('x' as unknown as number, {}).valid).toBe(false);
    expect(validateNumberRange(1.5, { integer: true }).errors.some((e) => e.includes('整数'))).toBe(true);
    expect(validateNumberRange(-1, { min: 0 }).errors[0]).toContain('不能小于');
    expect(validateNumberRange(11, { max: 10 }).errors[0]).toContain('不能大于');
    expect(validateNumberRange(5, { min: 0, max: 10 }).valid).toBe(true);
  });
  it('percentage', () => {
    expect(isValidPercentage(50)).toBe(true);
    expect(isValidPercentage(101)).toBe(false);
    expect(isValidPercentage('50' as unknown as number)).toBe(false);
    expect(validatePercentage(120).valid).toBe(false);
    expect(validatePercentage(50).valid).toBe(true);
  });
});

describe('validators / api key', () => {
  it('isValidApiKey 模式', () => {
    expect(isValidApiKey('sk-1234567890abcdef1234')).toBe(true);
    expect(isValidApiKey('api-1234567890abcdef123456')).toBe(true);
    expect(isValidApiKey('a'.repeat(32))).toBe(true);
    expect(isValidApiKey('short')).toBe(false);
    expect(isValidApiKey('')).toBe(false);
  });
  it('validateApiKey 分支', () => {
    expect(validateApiKey('').errors[0]).toContain('不能为空');
    expect(validateApiKey('short').errors.some((e) => e.includes('20'))).toBe(true);
    expect(validateApiKey('x'.repeat(2049)).errors.some((e) => e.includes('2048'))).toBe(true);
    expect(validateApiKey('bad key!').errors.some((e) => e.includes('非法字符'))).toBe(true);
    expect(validateApiKey('sk-valid_key-1234567890').valid).toBe(true);
  });
});

describe('validators / 批量与对象', () => {
  it('validateAll', () => {
    const r = validateAll([
      { field: 'a', value: 1, validator: (v) => v === 1, message: 'a 失败' },
      { field: 'b', value: 2, validator: (v) => v === 1, message: 'b 失败' },
    ]);
    expect(r.valid).toBe(false);
    expect(r.errors).toEqual(['b 失败']);
    expect(validateAll([]).valid).toBe(true);
  });
  it('validateObject', () => {
    const r = validateObject({ url: 'bad', n: 5 }, {
      url: (v) => validateUrl(v as string, 'url'),
      n: (v) => validateNumberRange(v as number, { min: 0, max: 10 }),
    });
    expect(r.valid).toBe(false);
    expect(r.errors[0].startsWith('[url]')).toBe(true);
  });
});

describe('validators / model provider + configured model', () => {
  it('validateModelProvider 全分支', () => {
    const empty = validateModelProvider({});
    expect(empty.valid).toBe(false);
    expect(empty.errors.some((e) => e.includes('label'))).toBe(true);

    const badAuth = validateModelProvider({
      label: 'X',
      baseUrl: 'https://api.x.com',
      authType: 'magic' as never,
      models: 'nope' as never,
      requiresApiKey: 'yes' as never,
      isLocal: 1 as never,
    });
    expect(badAuth.valid).toBe(false);
    expect(badAuth.errors.some((e) => e.includes('authType'))).toBe(true);
    expect(badAuth.errors.some((e) => e.includes('models'))).toBe(true);
    expect(badAuth.errors.some((e) => e.includes('requiresApiKey'))).toBe(true);
    expect(badAuth.errors.some((e) => e.includes('isLocal'))).toBe(true);

    const badUrl = validateModelProvider({ label: 'X', baseUrl: 'notaurl' });
    expect(badUrl.errors.some((e) => e.includes('baseUrl'))).toBe(true);

    expect(validateModelProvider({
      label: 'X',
      baseUrl: 'https://api.x.com',
      authType: 'bearer',
      models: [],
      requiresApiKey: true,
      isLocal: false,
    }).valid).toBe(true);
  });

  it('validateConfiguredModel 全分支', () => {
    const empty = validateConfiguredModel({});
    expect(empty.valid).toBe(false);
    expect(empty.errors.some((e) => e.includes('providerId'))).toBe(true);
    expect(empty.errors.some((e) => e.includes('[model]'))).toBe(true);

    const bad = validateConfiguredModel({
      providerId: 'p1',
      model: 'gpt',
      baseUrl: 'bad',
      apiKey: 'short',
      status: 'weird' as never,
      createdAt: -1,
    });
    expect(bad.valid).toBe(false);
    expect(bad.errors.some((e) => e.includes('baseUrl'))).toBe(true);
    expect(bad.errors.some((e) => e.includes('apiKey'))).toBe(true);
    expect(bad.errors.some((e) => e.includes('status'))).toBe(true);
    expect(bad.errors.some((e) => e.includes('createdAt'))).toBe(true);

    expect(validateConfiguredModel({
      providerId: 'p1',
      model: 'gpt',
      baseUrl: 'https://api.x.com',
      apiKey: 'sk-1234567890abcdef12',
      status: 'active',
      createdAt: Date.now(),
    }).valid).toBe(true);
  });
});

describe('config-validator', () => {
  it('合法配置通过', () => {
    const r = validateAPIConfig(VALID_CONFIG);
    expect(r.success).toBe(true);
    expect(r.errors).toHaveLength(0);
    expect(r.data?.timeout).toBe(15000);
  });

  it('非法字段返回结构化错误与建议', () => {
    const r = validateAPIConfig({ ...VALID_CONFIG, timeout: 5, maxRetries: -1, wsEndpoint: 'http://x' });
    expect(r.success).toBe(false);
    const fields = r.errors.map((e) => e.field);
    expect(fields).toContain('timeout');
    expect(fields).toContain('maxRetries');
    expect(fields).toContain('wsEndpoint');
    expect(r.errors.every((e) => e.code.length > 0)).toBe(true);
    expect(r.errors.find((e) => e.field === 'timeout')?.suggestion).toBeTruthy();
  });

  it('http 协议 aiBase 拒绝 / ws 协议拒绝', () => {
    expect(validateAPIConfig({ ...VALID_CONFIG, aiBase: 'ftp://x.com' }).success).toBe(false);
    expect(validateAPIConfig({ ...VALID_CONFIG, aiBase: 'ws://x.com' }).success).toBe(false);
    expect(validateAPIConfig({ ...VALID_CONFIG, fsBase: 'notaurl' }).success).toBe(false);
  });

  it('validatePartialAPIConfig 部分通过', () => {
    expect(validatePartialAPIConfig({ timeout: 5000 }).success).toBe(true);
    expect(validatePartialAPIConfig({ timeout: 1 }).success).toBe(false);
  });

  it('formatValidationErrors', () => {
    expect(formatValidationErrors([])).toContain('通过');
    const msg = formatValidationErrors([
      { field: 'timeout', message: '太小', code: 'VALUE_TOO_SMALL', suggestion: '用 15000' },
    ]);
    expect(msg).toContain('[timeout]');
    expect(msg).toContain('建议');
  });

  it('getDefaultValue', () => {
    expect(getDefaultValue('fsBase')).toBe('/api/fs');
    expect(getDefaultValue('enableBackend')).toBe(false);
    expect(getDefaultValue('timeout')).toBe(15000);
  });

  it('sanitizeAPIConfig 白名单与类型过滤', () => {
    const out = sanitizeAPIConfig({
      fsBase: '/api/fs2',
      timeout: 30000,
      enableBackend: true,
      hack: 'x',
      badObj: { a: 1 },
      nullVal: null,
    } as Record<string, unknown>);
    expect(out).toEqual({ fsBase: '/api/fs2', timeout: 30000, enableBackend: true });
    expect('hack' in out).toBe(false);
  });

  it('导出 schema 可直接使用', () => {
    expect(apiEndpointsSchema.safeParse(VALID_CONFIG).success).toBe(true);
  });
});

describe('figma-error-filter', () => {
  it('iframe message 类错误', () => {
    expect(isFigmaPlatformError('IframeMessageAbortError', '')).toBe(true);
  });
  it('AbortError + port 上下文', () => {
    expect(isFigmaPlatformError('AbortError', 'message port closed')).toBe(true);
    expect(isFigmaPlatformError('AbortError', 'other', undefined, 'at port handler')).toBe(true);
    expect(isFigmaPlatformError('AbortError', 'unrelated')).toBe(false);
  });
  it('消息内容匹配', () => {
    expect(isFigmaPlatformError('Error', 'The message port was destroyed before a response was received')).toBe(true);
    expect(isFigmaPlatformError('Error', 'setImmediate$ returned')).toBe(true);
    expect(isFigmaPlatformError('Error', 'user aborted the request')).toBe(true);
    expect(isFigmaPlatformError('Error', 'message channel closed')).toBe(true);
  });
  it('来源文件匹配', () => {
    expect(isFigmaPlatformError('Error', '', 'https://www.figma.com/app.js')).toBe(true);
    expect(isFigmaPlatformError('Error', '', 'webpack-artifacts/foo.js')).toBe(true);
    expect(isFigmaPlatformError('Error', '', '1741-0091e26ad4c06e70.min.js')).toBe(true);
    expect(isFigmaPlatformError('Error', '', 'figma_infra/x.js')).toBe(true);
    expect(isFigmaPlatformError('Error', '', '/figma/host.js')).toBe(true);
    expect(isFigmaPlatformError('Error', '', '/notfigma/host.js')).toBe(false);
  });
  it('堆栈匹配', () => {
    expect(isFigmaPlatformError('', '', undefined, 'at setupMessageChannel (figma.com/x.js)')).toBe(true);
    expect(isFigmaPlatformError('', '', undefined, 'at iframeMessage handler')).toBe(true);
  });
  it('普通错误放行', () => {
    expect(isFigmaPlatformError('TypeError', 'cannot read property')).toBe(false);
    expect(isFigmaPlatformError('', '', '', '')).toBe(false);
  });
});
