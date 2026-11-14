import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AppModule } from './app.module';
import { attachAuthGuardDeps } from './common/guards';
import { attachOpLogDeps } from './common/interceptors';
import { PrismaService } from './prisma.service';
import { resolveJwtExpiresIn, resolveJwtSecret } from './common/jwt-config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log'] });

  // 生产硬化:JWT 密钥强度校验(与 app.module 同一份逻辑,避免两处实现漂移)
  // 生产环境密钥不合规 → 抛错拒绝启动;非生产 → 改用一次性随机密钥
  resolveJwtSecret();
  resolveJwtExpiresIn();

  // 关键:绕过 tsx 运行时 constructor 注入失效的坑(沙箱 100% 复现),
  // 在 app.listen() 之前显式把 JwtService / Reflector / PrismaService
  // 注入到 Guard / Interceptor 的模块级单例。
  attachAuthGuardDeps(
    app.get(JwtService, { strict: false }),
    app.get(Reflector, { strict: false }),
  );
  attachOpLogDeps(
    app.get(PrismaService, { strict: false }),
    app.get(Reflector, { strict: false }),
  );

  // 令牌黑名单:启动时从数据库加载未过期吊销记录(重启后已注销 token 仍失效)
  const { TokenBlacklist } = await import('./common/token-blacklist');
  await TokenBlacklist.init(app.get(PrismaService, { strict: false }));

  // 结构化访问日志:一行 JSON(method/path/status/耗时;>1s 标 slow;health 静默)
  const { metrics } = await import('./common/metrics');
  app.use((req: any, res: any, next: any) => {
    if (req.url?.includes('/api/v1/health')) return next();
    metrics.requestsTotal += 1;
    metrics.inFlight += 1;
    const t0 = Date.now();
    res.on('finish', () => {
      metrics.inFlight -= 1;
      const ms = Date.now() - t0;
      if (ms > 1000) metrics.requestsSlow += 1;
      // eslint-disable-next-line no-console
      console.log(
        JSON.stringify({
          t: new Date().toISOString(),
          m: req.method,
          p: req.originalUrl || req.url,
          s: res.statusCode,
          ms,
          ...(ms > 1000 ? { slow: 1 } : {}),
        }),
      );
    });
    next();
  });

  app.setGlobalPrefix('api/v1');
  // CORS:默认仅同源(开发态由 Vite 代理 /api,无跨域);需要跨域时用 CORS_ORIGIN 显式放开
  const corsOrigin = (process.env.CORS_ORIGIN ?? '').trim();
  app.enableCors(
    corsOrigin
      ? { origin: corsOrigin.split(',').map((s) => s.trim()), credentials: true }
      : { origin: false },
  );
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
      stopAtFirstError: true,
      exceptionFactory: (errors) => {
        const messages = errors.map((e) => Object.values(e.constraints ?? {}).join(',')).filter(Boolean);
        return new BadRequestException(messages.join(';') || '参数校验失败');
      },
    }),
  );
  const port = Number(process.env.PORT || 3000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`[FM-Server] 财务管理系统后端已启动: http://127.0.0.1:${port}/api/v1`);
}

void bootstrap();
