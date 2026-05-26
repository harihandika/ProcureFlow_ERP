import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule, TestingModuleBuilder } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

export type CreateTestAppOptions = {
  prismaService?: unknown;
  configureModule?: (builder: TestingModuleBuilder) => TestingModuleBuilder;
};

export type CreatedTestApp = {
  app: INestApplication;
  moduleFixture: TestingModule;
  prisma: PrismaService;
};

export async function createTestApp(options: CreateTestAppOptions = {}): Promise<CreatedTestApp> {
  let moduleBuilder = Test.createTestingModule({
    imports: [AppModule],
  });

  if (options.prismaService) {
    moduleBuilder = moduleBuilder.overrideProvider(PrismaService).useValue(options.prismaService);
  }

  if (options.configureModule) {
    moduleBuilder = options.configureModule(moduleBuilder);
  }

  const moduleFixture = await moduleBuilder.compile();
  const app = moduleFixture.createNestApplication();

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.init();

  return {
    app,
    moduleFixture,
    prisma: app.get(PrismaService),
  };
}
