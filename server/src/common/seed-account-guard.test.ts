/**
 * 种子数据生产门控单测(纯函数)
 *
 * 背景:seed.ts 会创建 6 个固定弱密码演示账号(admin/Admin@123 等),
 *       且演示业务数据(凭证/报销/审批流)强依赖这些账号的 userId。
 *       生产环境若执行 db:seed,会留下可被猜中的后台账号。
 *
 * 规则:
 *   - 非生产环境(development / test / 未设置):照常创建演示账号与演示数据;
 *   - 生产环境(NODE_ENV=production):
 *       * SEED_DEMO_ACCOUNTS=true  → 显式开启,创建演示账号与演示数据;
 *       - 否则 → 跳过演示账号与演示数据(仅保留角色/报表公式等基础配置)。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldSeedDemoData } from './seed-account-guard';

test('非生产(未设置 NODE_ENV)→ 创建演示数据', () => {
  assert.equal(shouldSeedDemoData({}), true);
});

test('非生产(development)→ 创建演示数据', () => {
  assert.equal(shouldSeedDemoData({ NODE_ENV: 'development' }), true);
});

test('非生产(test)→ 创建演示数据', () => {
  assert.equal(shouldSeedDemoData({ NODE_ENV: 'test' }), true);
});

test('生产 + 未显式开启 → 跳过演示数据', () => {
  assert.equal(shouldSeedDemoData({ NODE_ENV: 'production' }), false);
});

test('生产 + SEED_DEMO_ACCOUNTS=false → 跳过演示数据', () => {
  assert.equal(
    shouldSeedDemoData({ NODE_ENV: 'production', SEED_DEMO_ACCOUNTS: 'false' }),
    false,
  );
});

test('生产 + SEED_DEMO_ACCOUNTS=true → 创建演示数据(显式开启)', () => {
  assert.equal(
    shouldSeedDemoData({ NODE_ENV: 'production', SEED_DEMO_ACCOUNTS: 'true' }),
    true,
  );
});

test('生产 + SEED_DEMO_ACCOUNTS=TRUE(大写)→ 创建演示数据', () => {
  assert.equal(
    shouldSeedDemoData({ NODE_ENV: 'production', SEED_DEMO_ACCOUNTS: 'TRUE' }),
    true,
  );
});

test('非生产 + SEED_DEMO_ACCOUNTS=false → 仍然创建(该开关只约束生产)', () => {
  assert.equal(
    shouldSeedDemoData({ NODE_ENV: 'development', SEED_DEMO_ACCOUNTS: 'false' }),
    true,
  );
});

test('生产 + SEED_DEMO_ACCOUNTS=1 → 不等于 true,跳过', () => {
  assert.equal(
    shouldSeedDemoData({ NODE_ENV: 'production', SEED_DEMO_ACCOUNTS: '1' }),
    false,
  );
});
