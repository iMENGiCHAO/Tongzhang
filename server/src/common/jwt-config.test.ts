/**
 * JWT 配置解析单测(纯函数)
 * 覆盖:JWT_SECRET 强度校验(production fail-fast / 非生产随机兜底)
 *      JWT_EXPIRES_IN 默认值与非法值
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveJwtSecret, resolveJwtExpiresIn, isWeakJwtSecret } from './jwt-config';

const STRONG = 'a'.repeat(48);

/** 在受控 env 下调用,调用结束后恢复原值 */
function withEnv<T>(env: Record<string, string | undefined>, fn: () => T): T {
  const saved: Record<string, string | undefined> = {};
  for (const k of Object.keys(env)) saved[k] = process.env[k];
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    return fn();
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

// ---------- 弱密钥判定 ----------

test('弱密钥判定:空值视为弱', () => {
  assert.equal(isWeakJwtSecret(''), true);
  assert.equal(isWeakJwtSecret(undefined), true);
});

test('弱密钥判定:长度不足 32 视为弱', () => {
  assert.equal(isWeakJwtSecret('a'.repeat(31)), true);
  assert.equal(isWeakJwtSecret('a'.repeat(32)), false);
});

test('弱密钥判定:含演示值视为弱', () => {
  assert.equal(isWeakJwtSecret('change-me-'.padEnd(40, 'x')), true);
  assert.equal(isWeakJwtSecret('fm-dev-secret'.padEnd(40, 'x')), true);
});

// ---------- resolveJwtSecret ----------

test('production + 缺失 JWT_SECRET → 抛错拒绝启动', () => {
  assert.throws(
    () => withEnv({ NODE_ENV: 'production', JWT_SECRET: undefined }, () => resolveJwtSecret()),
    /JWT_SECRET/,
  );
});

test('production + 短密钥(<32) → 抛错', () => {
  assert.throws(
    () => withEnv({ NODE_ENV: 'production', JWT_SECRET: 'short' }, () => resolveJwtSecret()),
    /JWT_SECRET/,
  );
});

test('production + 含 change-me → 抛错', () => {
  assert.throws(
    () => withEnv({ NODE_ENV: 'production', JWT_SECRET: 'change-me'.padEnd(40, 'x') }, () => resolveJwtSecret()),
    /JWT_SECRET/,
  );
});

test('production + 含 fm-dev-secret → 抛错', () => {
  assert.throws(
    () =>
      withEnv(
        { NODE_ENV: 'production', JWT_SECRET: 'fm-dev-secret'.padEnd(40, 'x') },
        () => resolveJwtSecret(),
      ),
    /JWT_SECRET/,
  );
});

test('production + 合规密钥 → 原样返回', () => {
  const got = withEnv(
    { NODE_ENV: 'production', JWT_SECRET: STRONG },
    () => resolveJwtSecret(),
  );
  assert.equal(got, STRONG);
});

test('非 production + 缺失 JWT_SECRET → 返回随机密钥(非固定兜底值)', () => {
  const got = withEnv(
    { NODE_ENV: 'development', JWT_SECRET: undefined },
    () => resolveJwtSecret(),
  );
  assert.ok(got.length >= 32, '随机密钥长度应至少 32');
  assert.ok(!got.includes('fm-dev-secret'));
});

test('非 production + 缺失 JWT_SECRET → 两次调用结果不同', () => {
  const a = withEnv({ NODE_ENV: 'development', JWT_SECRET: undefined }, () => resolveJwtSecret());
  const b = withEnv({ NODE_ENV: 'development', JWT_SECRET: undefined }, () => resolveJwtSecret());
  assert.notEqual(a, b);
});

test('非 production + 短密钥 → 返回随机密钥而非原弱值', () => {
  const got = withEnv({ NODE_ENV: 'development', JWT_SECRET: 'weak' }, () => resolveJwtSecret());
  assert.notEqual(got, 'weak');
  assert.ok(got.length >= 32);
});

test('非 production + 合规密钥 → 原样返回(不随机化)', () => {
  const got = withEnv({ NODE_ENV: 'development', JWT_SECRET: STRONG }, () => resolveJwtSecret());
  assert.equal(got, STRONG);
});

// ---------- resolveJwtExpiresIn ----------

test('JWT_EXPIRES_IN 未设置 → 默认 15m(与 README 一致)', () => {
  const got = withEnv({ JWT_EXPIRES_IN: undefined }, () => resolveJwtExpiresIn());
  assert.equal(got, '15m');
});

test('JWT_EXPIRES_IN 已设置 → 原样返回', () => {
  const got = withEnv({ JWT_EXPIRES_IN: '2h' }, () => resolveJwtExpiresIn());
  assert.equal(got, '2h');
});

test('JWT_EXPIRES_IN 非法值 → 抛错', () => {
  assert.throws(
    () => withEnv({ JWT_EXPIRES_IN: 'not-a-duration' }, () => resolveJwtExpiresIn()),
    /JWT_EXPIRES_IN/,
  );
});

test('JWT_EXPIRES_IN 为空字符串 → 抛错', () => {
  assert.throws(
    () => withEnv({ JWT_EXPIRES_IN: '' }, () => resolveJwtExpiresIn()),
    /JWT_EXPIRES_IN/,
  );
});
