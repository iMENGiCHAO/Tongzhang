/**
 * 种子数据生产门控(纯函数,便于单测)
 *
 * 演示账号(admin/Admin@123、cfo/Cfo@123 等 6 个)密码固定且公开可猜,
 * 且演示业务数据(凭证 / 报销单 / 审批流)以这些账号的 userId 为外键,
 * 因此二者必须整体开关——不能只跳过账号而保留依赖它们的业务数据。
 *
 * 规则:
 *   - 非生产环境:一律创建(本地开发、CI、测试依赖演示数据);
 *   - 生产环境:仅当 SEED_DEMO_ACCOUNTS=true(大小写不敏感)时创建。
 */
export function shouldSeedDemoData(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.NODE_ENV !== 'production') return true;
  return String(env.SEED_DEMO_ACCOUNTS ?? '').trim().toLowerCase() === 'true';
}

/** 生产环境下的提示文案(便于调用方打印一致信息) */
export function demoDataSkipNotice(env: NodeJS.ProcessEnv = process.env): string {
  return (
    '[Seed] 检测到 NODE_ENV=production,已跳过演示账号与演示业务数据。' +
    '如确需灌入演示数据,请显式设置 SEED_DEMO_ACCOUNTS=true 后重试。' +
    '生产环境请改用 scripts/admin-create.ts 创建首个管理员账号。'
  );
}
