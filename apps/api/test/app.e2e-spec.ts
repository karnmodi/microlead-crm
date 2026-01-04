import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe, RequestMethod } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";

describe("App (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.ALLOW_START_WITHOUT_DB = "1";
    process.env.JWT_SECRET ??= "test-jwt-secret-at-least-32-characters-long";
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
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
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /health", () => {
    return request(app.getHttpServer()).get("/health").expect(200).expect((res) => {
      expect(res.body.status).toBe("ok");
      expect(res.body).toHaveProperty("db");
    });
  });
});
