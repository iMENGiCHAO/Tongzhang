# 实施计划：LedgerFlow 改名 + Apache-2.0 许可证 + P0 安全加固

**日期**：2026-11-15  
**范围**：仅 `FinancialManagement/`（GitHub: iMENGiCHAO/LedgerFlow）  
**明确不动**：`ecommerce/`（ox-shopping）——用户明确要求不碰

## 用户已确认的决策

| 决策项 | 选择 |
|---|---|
| LICENSE | **Apache-2.0** |
| 安全边界范围 | **修 P0 两项**（不改 Prisma schema、不做数据库级隔离） |
| 新名字风格 | **中文意蕴 + 英文副标** |

## 命名调研已发现的硬约束

- GitHub 上 `iMENGiCHAO/LedgerFlow` 当前 0 star / 0 fork / 0 view → 改名零迁移成本
- 财务软件商标极度拥挤：已查到「账本」(9/42类)、「阳光账本」、「平衡」、「TONGXIN」、「PINGHENG」、「明鑫财务」等在 9/35/42 类有注册或申请
- 「HuiZhang」已有深圳慧账科技、「TongZhang」已有美国公司 → 避开这两个词根
- 候选名需通过 **GitHub 仓库名 + npm + PyPI** 三重可注册性预检（已全部通过）

## 改名影响面（实测）

含 `LedgerFlow` 的文件（13 个，git 跟踪）：

| 文件 | 次数 | 性质 |
|---|---|---|
| `server/src/mcp/server.ts` | 7 | MCP server 标识符（对外协议，改动需谨慎） |
| `docs/MCP-GUIDE.md` | 6 | 文档 |
| `README.md` | 3 | 文档门面 |
| `progress.md` | 3 | 内部工作文档 |
| `server/package.json` | 2 | 包名 |
| `web/src/views/Login.vue` | 2 | 登录页显示名 |
| `web/index.html` | 1 | 页面 title |
| `web/package.json` | 1 | 包名 |
| `web/src/router/index.ts` | 1 | 路由 |
| `web/dist/index.html` | 1 | **构建产物**（应重新构建而非手改） |
| `docs/openapi.json` | 1 | OpenAPI title |
| `findings.md` | 1 | 内部工作文档 |
| `docker-compose.yml` | 1 | 容器名 |

---

## Task 1：选定新名字并做全网占用终检

**目标**：确定中英文名，写入 `docs/superpowers/plans/name-decision.md` 备案。

**步骤**：

1. 从候选清单中由用户选定一个中文主名 + 英文副标（见下方候选表）
2. 对选定的名字执行终检：
   - `gh api repos/iMENGiCHAO/<RepoName>` → 仓库名未被占用
   - `curl https://registry.npmjs.org/<pkg>` → 404
   - `curl https://pypi.org/pypi/<pkg>/json` → 404
   - `curl -I https://<domain>` → 域名可注册性初筛（仅提示，最终以注册商为准）
3. 结果写入 `docs/superpowers/plans/name-decision.md`，含检查日期与各渠道返回码

**验收**：`name-decision.md` 存在，且记录了 4 个渠道的实际返回码。

## Task 2：补 Apache-2.0 LICENSE + NOTICE

**文件**：

- 新建 `LICENSE`（Apache License 2.0 全文，末尾追加版权声明）
- 新建 `NOTICE`（第三方组件归属声明）
- 修改 `README.md`：新增「许可证」章节

**LICENSE 版权声明写法**：

```
   Copyright 2026 iMENGiCHAO

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
```

**NOTICE 需列出的第三方组件**（实测依赖，分三类）：

| 类别 | 内容 | 许可证 |
|---|---|---|
| 后端运行时 | @nestjs/common, @nestjs/core, @nestjs/jwt, @nestjs/platform-express, @prisma/client, @electric-sql/pglite, @electric-sql/pglite-socket, @modelcontextprotocol/sdk, bcryptjs, class-transformer, class-validator, exceljs, reflect-metadata, rxjs, zod | MIT / Apache-2.0 |
| 前端运行时 | vue, vue-router, pinia, element-plus, @element-plus/icons-vue, echarts, axios, dayjs | MIT / Apache-2.0 |
| 构建/测试 | vite, typescript, tsx, prisma, sass, puppeteer-core, unplugin-auto-import, unplugin-vue-components | MIT / Apache-2.0 |
| 字体 | 无内置字体文件（`web/src/style.css` 用系统字体栈） | — |

**验收**：

- `ls LICENSE NOTICE` 两者存在
- `curl -s https://www.apache.org/licenses/LICENSE-2.0.txt | diff - LICENSE` → 正文与官方一致（仅附录版权声明段不同）
- README 含「## 许可证」章节并链接 LICENSE 与 NOTICE

## Task 3：P0 安全加固 —— JWT 密钥与过期时间

**问题**：

- `server/src/app.module.ts:34` → `secret: process.env.JWT_SECRET || 'fm-dev-secret'` —— 硬编码兜底密钥
- `server/src/app.module.ts:35` → `expiresIn: process.env.JWT_EXPIRES_IN || '2h'` —— 实际 2 小时，README 声称 15 分钟，文档漂移
- `server/src/main.ts:15-19` 已有 production fail-fast，但仅在 `main.ts` 里，与 `app.module.ts` 的兜底行为脱节

**改动**：

1. 新建 `server/src/common/jwt-config.ts`，导出：
   - `resolveJwtSecret(): string` —— 读取 `process.env.JWT_SECRET`；为空/长度 < 32/包含 `change-me`/`fm-dev-secret` 时：
     - `NODE_ENV === 'production'` → 抛错（保持现有 fail-fast 语义）
     - 非 production → 返回**随机生成**的一次性开发密钥并打警告（不再有固定兜底值）
   - `resolveJwtExpiresIn(): string` —— 读取 `JWT_EXPIRES_IN`，默认 `'15m'`（与 README 对齐），非法值抛错
2. `app.module.ts` 改用上述两个函数，删除 `'fm-dev-secret'` 兜底
3. `main.ts` 的弱密钥检测改为调用 `resolveJwtSecret()`，消除重复实现

**TDD 要求**：先写 `server/src/common/jwt-config.test.ts`，用 Node 内置 `node:test`（项目现有测试风格，`server/package.json` 的 `test` 脚本用 `tsx --test`）：

| 用例 | 断言 |
|---|---|
| production + 缺 JWT_SECRET | 抛错 |
| production + 短密钥(<32) | 抛错 |
| production + 含 change-me | 抛错 |
| production + 含 fm-dev-secret | 抛错 |
| production + 合规密钥(>=32, 无演示词) | 返回该密钥 |
| 非 production + 缺 JWT_SECRET | 返回随机密钥，且两次调用结果不同 |
| 非 production + 短密钥 | 返回随机密钥 + 警告 |
| JWT_EXPIRES_IN 未设置 | 返回 `'15m'` |
| JWT_EXPIRES_IN='2h' | 返回 `'2h'` |
| JWT_EXPIRES_IN 非法值 | 抛错 |

**红绿验证**：先写测试跑一次确认失败（RED），再改实现跑通（GREEN）。

**验收**：`cd server && pnpm test` 全绿，且新测试文件单独跑通过。

## Task 4：P0 安全加固 —— seed 演示账号生产门控

**问题**：`server/prisma/seed.ts:50-55` 无条件创建 6 个固定弱密码账号（`admin/Admin@123`、`cfo/Cfo@123` 等），生产环境执行 `pnpm db:seed` 会静默留下可登录的弱口令账号。

**改动**：

1. `server/prisma/seed.ts` 增加门控：
   - 仅当 `process.env.SEED_DEMO_ACCOUNTS === 'true'`（显式开启）或 `NODE_ENV !== 'production'` 时创建演示账号
   - `NODE_ENV === 'production'` 且未显式开启时：跳过账号创建并打印醒目提示（含开启方式）
2. 演示账号的密码支持 `SEED_DEMO_PASSWORD` 环境变量覆盖（默认保持现状，避免破坏现有 E2E）

**TDD 要求**：新建 `server/src/common/seed-account-guard.test.ts`（抽出纯函数 `shouldSeedDemoAccounts(env)` 便于测试）：

| 用例 | 断言 |
|---|---|
| `NODE_ENV=production`, 无 SEED_DEMO_ACCOUNTS | false |
| `NODE_ENV=production`, `SEED_DEMO_ACCOUNTS=true` | true |
| `NODE_ENV=production`, `SEED_DEMO_ACCOUNTS=false` | false |
| `NODE_ENV` 未设（开发） | true |
| `NODE_ENV=test` | true |

**兼容性注意**：

- CI 的 `ci.yml` 跑 `pnpm db:seed`，随后 E2E 用 `MCP_USERNAME=zhangsan MCP_PASSWORD=Acc@123` → CI 环境 `NODE_ENV` 未设 → 仍会 seed 演示账号，**E2E 不受影响**
- `docker-compose.yml` 若设了 `NODE_ENV=production` 需检查并显式加 `SEED_DEMO_ACCOUNTS=true`，否则演示模式登录会失效

**验收**：`cd server && pnpm test` 全绿；本地 `NODE_ENV=production pnpm db:seed` 不创建账号并打印提示。

## Task 5：CI 增加许可证门禁 + 文档一致性

**改动**：

1. `.github/workflows/ci.yml` 新增 `license` job：
   - 校验 `LICENSE` 文件存在且为 Apache-2.0（校验首行与版权声明段）
   - 用 `npx license-checker` 或 `npx licensee --json` 生成依赖许可证清单，断言不含 GPL/AGPL/SSPL/BUSL/UNLICENSED
   - 断言 `NOTICE` 存在
2. README 修正 token 过期时间描述（15 分钟 / 刷新 7 天，与实现对齐）
3. README「安全说明」段补充：演示账号需 `SEED_DEMO_ACCOUNTS=true` 显式开启

**验收**：CI 新 job 通过；README 与 `jwt-config.ts` 实现一致。

## Task 6：改名执行（仅在 Task 1 定名后进行）

**改动顺序（避免中途破窗）**：

1. 源码与文档内字符串替换（`server/src`、`web/src`、`docs`、`*.json`、`docker-compose.yml`、`README.md`）
   - **`web/dist/` 不手改**，改为重新构建生成
   - **`server/src/mcp/server.ts` 单独处理**：先读全文确认 server name 是否是对外协议的一部分，再决定是否改
2. `server/package.json` / `web/package.json` 的 `name` 字段改为 `<新英文名>-server` / `<新英文名>-web`
3. `web/index.html` 的 `<title>`
4. `docs/openapi.json` 的 title（若为生成物则改生成源）
5. 重新构建 web 与 server，确认无残留
6. GitHub 仓库改名：`gh repo rename <新Repo名> --repo iMENGiCHAO/LedgerFlow`
7. 更新本地 remote：`git remote set-url origin <新URL>`
8. 提交并推送

**验收**：

```bash
grep -ril ledgerflow --exclude-dir=node_modules --exclude-dir=.git . | wc -l   # 期望 0（除历史记录）
cd server && pnpm test && pnpm build
cd web && pnpm build
gh api repos/iMENGiCHAO/<新Repo名> --jq '.full_name + " license=" + (.license.spdx_id // "NULL")'
```

期望：`license=Apache-2.0`，仓库名已更新，工作区干净。

---

## 执行顺序与依赖

```
Task 1 (定名) ──→ Task 6 (改名)      [依赖定名]
Task 2 (LICENSE) ──→ Task 5 (CI 门禁)  [CI 校验 LICENSE 存在]
Task 3 (JWT) ──┐
Task 4 (seed) ─┴─→ Task 5 (README 对齐)  [README 依赖实现]
```

Task 2/3/4/5 与改名相互独立，**可并行**；Task 6 最后做，避免改名与功能改动混在一个 diff 里难以审阅。

## 明确不做（YAGNI）

- ❌ 数据库级租户隔离（Prisma schema / RLS）——用户选了「修 P0 两项」
- ❌ 中间件统一注入 tenantId ——同上是 P1 选项，用户未选
- ❌ `ecommerce/`（ox-shopping）任何改动 ——用户明确要求
- ❌ 清理沙箱环境注释、移除 `task_plan.md`/`findings.md`/`progress.md` ——属 P1 卫生项，本次不做（可在报告中提示）
- ❌ 商标正式注册 ——需委托代理，仅做占用初筛