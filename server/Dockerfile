# LedgerFlow 后端:NestJS + Prisma
FROM node:22-slim AS build
WORKDIR /app
RUN corepack enable
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
RUN pnpm install --frozen-lockfile || pnpm install
RUN pnpm approve-builds --all || true
COPY prisma ./prisma
RUN pnpm exec prisma generate
COPY tsconfig.json ./
COPY src ./src
RUN pnpm build

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable
COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
EXPOSE 3100
# 启动:等库就绪(db push 重试至成功)→ 可选 DEMO_MODE=1 灌种子 → 起 API
# 注意:镜像内 NODE_ENV=production,seed 的演示数据门控默认关闭,
#      因此 DEMO_MODE=1 时必须同时显式设置 SEED_DEMO_ACCOUNTS=true 才会灌入演示账号与业务数据。
CMD ["sh", "-c", "until node ./node_modules/prisma/build/index.js db push --skip-generate; do echo waiting-for-postgres; sleep 2; done; if [ x$DEMO_MODE = x1 ]; then SEED_DEMO_ACCOUNTS=true pnpm run db:seed || true; fi; exec node dist/main.js"]
