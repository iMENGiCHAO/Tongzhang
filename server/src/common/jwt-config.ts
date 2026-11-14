/**
 * JWT 配置解析(纯函数,便于单测)
 *
 * 目标:
 *  1. 生产环境不允许任何弱密钥(缺失/过短/演示值)——缺一即拒绝启动;
 *  2. 非生产环境不再使用固定兜底密钥,改为一次性随机密钥(每次进程重启不同),
 *     避免"开发能用 → 忘改就上线"的经典事故;
 *  3. access token 过期时间默认 15m,与 README 文档保持一致(此前实现为 2h,属文档漂移)。
 */
import { randomBytes } from 'crypto';

/** 演示/占位密钥特征串——命中即视为弱密钥 */
const DEMO_SECRET_MARKERS = ['change-me', 'fm-dev-secret'];

/** 弱密钥判定:空 / 长度 < 32 / 含演示特征串 */
export function isWeakJwtSecret(secret: string | undefined | null): boolean {
  if (!secret) return true;
  if (secret.length < 32) return true;
  const lower = secret.toLowerCase();
  return DEMO_SECRET_MARKERS.some((m) => lower.includes(m));
}

/**
 * 解析 JWT 签名密钥
 * @throws 生产环境下密钥不合规时抛错,阻止服务启动
 */
export function resolveJwtSecret(env: NodeJS.ProcessEnv = process.env): string {
  const raw = env.JWT_SECRET;
  if (!isWeakJwtSecret(raw)) return raw as string;

  const reason = !raw
    ? '未设置'
    : raw.length < 32
      ? `长度不足 32 位(当前 ${raw.length})`
      : '仍为演示值(change-me / fm-dev-secret)';

  const msg =
    `JWT_SECRET ${reason}。生产环境请配置高强度随机密钥,例如: openssl rand -base64 48` +
    `检测到 NODE_ENV=production,拒绝启动。`;

  if (env.NODE_ENV === 'production') {
    throw new Error(msg);
  }

  // 非生产:一次性随机密钥,不落盘、不硬编码,进程重启即失效
  const generated = randomBytes(48).toString('base64');
  // eslint-disable-next-line no-console
  console.warn(`[JWT] JWT_SECRET ${reason},已改用本次进程的一次性随机密钥(重启后失效,仅供本地开发)`);
  return generated;
}

/** 合法的 expiresIn 形态:如 30s / 15m / 2h / 7d */
const DURATION_RE = /^\d+[smhd]$/;

/**
 * 解析 access token 过期时间
 * @default 15m(与 README 描述一致)
 * @throws 非法值时抛错
 */
export function resolveJwtExpiresIn(env: NodeJS.ProcessEnv = process.env): string {
  const raw = env.JWT_EXPIRES_IN;
  if (raw === undefined) return '15m';
  if (!DURATION_RE.test(raw)) {
    throw new Error(
      `JWT_EXPIRES_IN 非法值 "${raw}",应为形如 30s / 15m / 2h / 7d 的时长字符串。`,
    );
  }
  return raw;
}
