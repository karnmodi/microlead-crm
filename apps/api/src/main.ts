import { ValidationPipe, RequestMethod } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { Request, Response, NextFunction } from "express";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const allowedOrigins = [
    process.env.WEB_ORIGIN ?? "http://localhost:3000",
    process.env.WEB_ORIGIN_2,
    "https://microlead.aviusolutions.com",
  ]
    .filter(Boolean)
    .flatMap((o) => o!.split(",").map((s) => s.trim()));

  // Explicit middleware so OPTIONS preflights are handled before NestJS routing
  // (required for Vercel serverless where enableCors alone can miss preflights)
  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin ?? "";
    if (allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader(
        "Access-Control-Allow-Methods",
        "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
      );
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, Accept",
      );
      res.setHeader("Vary", "Origin");
    }
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.setGlobalPrefix("v1", {
    exclude: [{ path: "health", method: RequestMethod.GET }],
  });
  const port = process.env.PORT ?? "3001";
  await app.listen(Number(port));
}

void bootstrap();
