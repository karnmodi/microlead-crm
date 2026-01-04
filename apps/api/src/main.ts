import { ValidationPipe, RequestMethod } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:3000";
  app.enableCors({
    origin: webOrigin.split(",").map((s) => s.trim()),
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
