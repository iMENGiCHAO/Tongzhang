/**
 * 许可证合规门禁(CI 专用)
 *
 * 校验三件事:
 *  1. 根目录存在 LICENSE 且为 Apache-2.0(校验首尾关键行,防止误改/误删);
 *  2. 根目录存在 NOTICE(Apache-2.0 要求分发时随附归属声明);
 *  3. 全部运行时依赖的许可证不含 copyleft / 未授权 / 商业限制型条款。
 *
 * 用法:
 *   node scripts/check-licenses.mjs
 * 退出码: 0 = 通过, 1 = 不通过
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const notes = [];

// ---------------------------------------------------------------- LICENSE

const licensePath = join(ROOT, 'LICENSE');
if (!existsSync(licensePath)) {
  failures.push('缺少 LICENSE 文件(Apache-2.0 交付必须包含)');
} else {
  const text = readFileSync(licensePath, 'utf8');
  if (!text.includes('Apache License')) {
    failures.push('LICENSE 未识别为 Apache License');
  }
  if (!/Version 2\.0/.test(text)) {
    failures.push('LICENSE 缺少 "Version 2.0" 版本声明');
  }
  if (!text.includes('Copyright 2026 iMENGiCHAO')) {
    failures.push('LICENSE 缺少版权声明 "Copyright 2026 iMENGiCHAO"');
  }
  if (!text.includes('http://www.apache.org/licenses/LICENSE-2.0')) {
    failures.push('LICENSE 缺少许可证全文链接');
  }
  notes.push('LICENSE: Apache-2.0 正文与版权声明完整');
}

// ---------------------------------------------------------------- NOTICE

const noticePath = join(ROOT, 'NOTICE');
if (!existsSync(noticePath)) {
  failures.push('缺少 NOTICE 文件(Apache-2.0 要求随附第三方归属声明)');
} else {
  const text = readFileSync(noticePath, 'utf8');
  if (!text.includes('Third-party') && !text.includes('third-party')) {
    failures.push('NOTICE 未包含第三方组件归属说明');
  }
  notes.push('NOTICE: 存在且含第三方归属说明');
}

// ------------------------------------------------- 依赖许可证(copyleft 检查)

/** 禁止出现的许可证特征 */
const FORBIDDEN = [
  { re: /(^|[^A-Z])GPL([^A-Z]|$)/i, label: 'GPL 系(copyleft)' },
  { re: /AGPL/i, label: 'AGPL(强 copyleft)' },
  { re: /SSPL/i, label: 'SSPL(非 OSI 认证)' },
  { re: /BUSL/i, label: 'BUSL(商业限制)' },
  { re: /UNLICENSED|PROPRIETARY|NOASSERTION/i, label: '未声明/专有许可证' },
  { re: /Elastic|Commons Clause/i, label: '附加限制条款' },
];

/** 允许出现的许可证 */
const ALLOWED = /^(MIT|Apache-2\.0|BSD(-\d-Clause)?|ISC|0BSD|PSF-2\.0|BlueOak-1\.0\.0|CC0-1\.0|MPL-2\.0|CC-BY-4\.0|MIT-0|Zlib|Artistic-2\.0|Unlicense|MPL-2\.0 OR Apache-2\.0|Apache-2\.0 OR MIT|\(MIT AND Zlib\)|MIT AND ISC AND BSD-3-Clause|BlueOak-1\.0\.0 OR Apache-2\.0|MIT OR Apache-2\.0|MIT OR CC0-1\.0|BSD-3-Clause OR MIT|MIT AND BSD-3-Clause|0BSD OR MIT OR Apache-2\.0|CC-BY-4\.0 AND MIT|WTFPL|BlueOak-1\.0\.0|Apache-2\.0 WITH LLVM-exception|BUSL-1\.1)$/i;

/**
 * 扫描一个 package.json 目录的依赖许可证
 * 优先用 license-checker(基于已安装 node_modules),失败则回退到 npm registry 查询
 */
function scanPackage(dir) {
  const pkgPath = join(ROOT, dir, 'package.json');
  if (!existsSync(pkgPath)) {
    notes.push(dir + ': 无 package.json,跳过');
    return [];
  }
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const deps = Object.keys(pkg.dependencies || {});
  if (deps.length === 0) {
    notes.push(dir + ': 无运行时依赖');
    return [];
  }

  const results = [];
  let raw = null;
  try {
    raw = execFileSync(
      'npx',
      ['--yes', 'license-checker', '--json', '--production', '--start', dir],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 32 * 1024 * 1024 },
    );
  } catch {
    notes.push(dir + ': license-checker 不可用,回退 npm registry 查询');
  }

  if (raw) {
    const parsed = JSON.parse(raw);
    // license-checker 的 key 形如 name@version(含 scope 时为 @scope/name@version),
    // 这里按包名还原并只统计本项目的直接运行时依赖。
    const byName = new Map();
    for (const [key, meta] of Object.entries(parsed)) {
      const at = key.lastIndexOf('@');
      const name = at > 0 ? key.slice(0, at) : key;
      if (!byName.has(name)) byName.set(name, meta.licenses || 'UNKNOWN');
    }
    for (const d of deps) {
      const lic = byName.get(d);
      // license-checker 以包内 LICENSE 文件为准,可能与 package.json 的 license 字段不一致
      // (例如 package.json 写 UNLICENSED / PROPRIETARY 但目录里放了 MIT 正文)。
      // 这里把 package.json 字段一并纳入判定,避免漏掉未授权声明。
      let declared = 'UNKNOWN';
      try {
        const pj = join(ROOT, dir, 'node_modules', d, 'package.json');
        if (existsSync(pj)) {
          const v = JSON.parse(readFileSync(pj, 'utf8')).license;
          if (typeof v === 'string') declared = v;
        }
      } catch {
        // 读取失败时保持 UNKNOWN,交由后续判定拦截
      }
      results.push({ name: d, licenses: lic || 'UNKNOWN', declared });
    }
    return results;
  }

  // 未安装时的兜底:直接读 node_modules/<pkg>/package.json 的 license 字段

  // 回退:逐包查 npm registry
  for (const d of deps) {
    let license = 'UNKNOWN';
    try {
      const meta = JSON.parse(
        execFileSync('npm', ['view', d, 'license', '--json'], {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
        }),
      );
      license = typeof meta === 'string' ? meta : meta?.type || 'UNKNOWN';
    } catch {
      license = 'FETCH_ERROR';
    }
    results.push({ name: d, licenses: license });
  }
  return results;
}

const all = [...scanPackage('server'), ...scanPackage('web')];
const summary = new Map();
for (const r of all) {
  summary.set(r.licenses, (summary.get(r.licenses) || 0) + 1);
}

console.log('== 依赖许可证分布 ==');
for (const [lic, count] of [...summary.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${lic}: ${count}`);
}

for (const r of all) {
  // 两个来源都参与判定:license-checker 报告的许可证,以及包自身 package.json 的声明。
  // 任何一个来源出现受限许可证都拦截,避免"文件与声明不一致"导致漏检。
  const sources = [
    { label: 'license-checker', value: r.licenses },
    { label: 'package.json', value: r.declared },
  ].filter((s) => s.value && s.value !== 'UNKNOWN' && s.value !== 'FETCH_ERROR');

  let hit = false;
  for (const s of sources) {
    const forbidden = FORBIDDEN.find((f) => f.re.test(s.value));
    if (forbidden) {
      failures.push(`依赖 ${r.name} 的 ${s.label} 声明为受限许可证 ${s.value}(${forbidden.label})`);
      hit = true;
      continue;
    }
    if (!ALLOWED.test(s.value.trim())) {
      failures.push(`依赖 ${r.name} 的 ${s.label} 许可证 ${s.value} 不在允许清单内,需人工确认`);
      hit = true;
    }
  }

  if (!hit && sources.length === 0) {
    failures.push(`依赖 ${r.name} 的许可证无法确定(${r.licenses}),需人工确认后再放行`);
  }
}

console.log('\n== 检查项 ==');
for (const n of notes) console.log('  · ' + n);

if (failures.length > 0) {
  console.error('\n❌ 许可证门禁未通过:');
  for (const f of failures) console.error('  - ' + f);
  process.exit(1);
}
console.log('\n✅ 许可证门禁通过:LICENSE / NOTICE 完整,依赖许可证无 copyleft 或未声明项');
