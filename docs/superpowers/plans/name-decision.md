# 命名决策备案：通账 · Tongzhang Books

**决策日期**：2026-11-15  
**原名**：LedgerFlow · 中小企业财务管理系统  
**新名**：通账 · Tongzhang Books  
**决策人**：iMENGiCHAO（经候选对比后选定）

---

## 一、选型理由

| 维度 | 说明 |
|---|---|
| 寓意 | 「通」= 打通/贯通全流程；「账」= 账目。对应产品「建账 → 凭证 → 账簿 → 报表 → 期末结账」的一体化闭环 |
| 可读性 | 拼音 Tongzhang，中英双读都顺口，适合口播与销售场景 |
| 搜索友好 | GitHub 仓库名用拼音 Tongzhang，搜中文「通账」可直达 |
| 品牌延展 | 「通账」可延展出「通账云」「通账助手」等子产品线 |
| 英文副标 | Books 取「账簿」义，承接原 LedgerFlow 的账簿语义，且比 Ledger 更轻、更口语 |

## 二、占用检查记录（2026-11-15 实测）

| 渠道 | 检查对象 | 返回 | 结论 |
|---|---|---|---|
| GitHub 仓库 | iMENGiCHAO/Tongzhang | 不存在（404） | 可用 |
| GitHub 仓库 | iMENGiCHAO/TongzhangBooks | 不存在（404） | 可用 |
| npm | tongzhang | 404 | 可用 |
| npm | tongzhang-books | 404 | 可用 |
| npm | tongzhang-server | 404 | 可用 |
| npm | tongzhang-web | 404 | 可用 |
| PyPI | tongzhang | 404 | 可用 |
| PyPI | tongzhangbooks | 404 | 可用 |
| 域名 | tongzhang.cn | 已注册 | 需另选后缀或拼写 |
| 域名 | tongzhang.com | 已注册 | 同上 |

> 说明：域名被占用不影响本次交付——本项目当前交付形态为 GitHub 仓库 + 自部署 Docker 镜像，域名在正式商用建站时再定。短拼音的 .com / .cn 普遍已被抢注，属正常现象。

## 三、商标风险初筛（公开信息检索，非正式法律意见）

检索发现财务/软件类目中以下名称已有注册或申请，**本项目已主动避开**：

- 「账本」（9 类 / 42 类，已注册）
- 「阳光账本」（42 类，已注册）
- 「平衡」（4 类，已注册）、「PINGHENG」（35 类）
- 「TONGXIN」（35 类）、「明鑫财务」（35 类）
- 「慧账 / HuiZhang」（已有深圳同名科技公司）
- 「通账 / TongZhang」（已有美国同名公司）

**风险评估**：「通账」二字本身在上述检索中未见财务软件类目的有效注册，但因「通账」与「通张 / TongZhang」同音，正式商用前仍建议：

1. 在中国商标网按第 9 类（可下载软件）/ 第 42 类（SaaS）/ 第 35 类（商业服务）做正式检索；
2. 委托代理机构申请「通账」文字商标与「Tongzhang」组合商标；
3. 在拿到注册前，避免在营销物料中大规模使用。

## 四、改名映射表

| 位置 | 旧值 | 新值 |
|---|---|---|
| GitHub 仓库 | iMENGiCHAO/LedgerFlow | iMENGiCHAO/Tongzhang |
| server 包名 | ledgerflow-server | tongzhang-server |
| web 包名 | ledgerflow-web | tongzhang-web |
| 页面标题 | LedgerFlow · 中小企业财务管理系统 | 通账 Tongzhang Books · 中小企业财务管理系统 |
| README 主标题 | # LedgerFlow · 中小企业财务管理系统 | # 通账 Tongzhang Books · 中小企业财务管理系统 |
| Docker 服务名 | ledgerflow-* | tongzhang-* |

## 五、配套变更（同期执行）

- 许可证：Apache-2.0（用户确认）
- 安全加固：P0 两项（用户确认）
  1. 移除 app.module.ts 的硬编码 JWT 密钥兜底，过期时间与 README 对齐
  2. seed.ts 演示账号增加生产环境门控
- CI：新增许可证门禁

---

*本文件为命名决策的内部备案，记录决策依据与实测占用数据。*
