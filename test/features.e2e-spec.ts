/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Features API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);
  });

  // Clean up between tests for isolation
  beforeEach(async () => {
    await prisma.regionOverride.deleteMany();
    await prisma.groupOverride.deleteMany();
    await prisma.userOverride.deleteMany();
    await prisma.featureFlag.deleteMany();
  });

  afterAll(async () => {
    await prisma.regionOverride.deleteMany();
    await prisma.groupOverride.deleteMany();
    await prisma.userOverride.deleteMany();
    await prisma.featureFlag.deleteMany();
    await app.close();
  });

  // --- Feature CRUD ---

  describe('POST /features', () => {
    it('should create a feature flag', () => {
      return request(app.getHttpServer())
        .post('/features')
        .send({ key: 'dark-mode', isEnabled: false, description: 'test' })
        .expect(201)
        .expect((res) => {
          expect(res.body.key).toBe('dark-mode');
          expect(res.body.isEnabled).toBe(false);
          expect(res.body.id).toBeDefined();
        });
    });

    it('should reject duplicate keys', async () => {
      await request(app.getHttpServer())
        .post('/features')
        .send({ key: 'dark-mode', isEnabled: false });

      return request(app.getHttpServer())
        .post('/features')
        .send({ key: 'dark-mode', isEnabled: true })
        .expect(409);
    });

    it('should validate key format', () => {
      return request(app.getHttpServer())
        .post('/features')
        .send({ key: 'INVALID KEY!', isEnabled: false })
        .expect(400);
    });

    it('should reject missing isEnabled', () => {
      return request(app.getHttpServer())
        .post('/features')
        .send({ key: 'dark-mode' })
        .expect(400);
    });
  });

  describe('GET /features', () => {
    it('should return all feature flags', async () => {
      await request(app.getHttpServer())
        .post('/features')
        .send({ key: 'flag-a', isEnabled: true });
      await request(app.getHttpServer())
        .post('/features')
        .send({ key: 'flag-b', isEnabled: false });

      return request(app.getHttpServer())
        .get('/features')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveLength(2);
        });
    });
  });

  describe('GET /features/:key', () => {
    it('should return a flag with overrides', async () => {
      await request(app.getHttpServer())
        .post('/features')
        .send({ key: 'dark-mode', isEnabled: false });

      return request(app.getHttpServer())
        .get('/features/dark-mode')
        .expect(200)
        .expect((res) => {
          expect(res.body.key).toBe('dark-mode');
          expect(res.body.userOverrides).toBeDefined();
          expect(res.body.groupOverrides).toBeDefined();
        });
    });

    it('should return 404 for unknown key', () => {
      return request(app.getHttpServer())
        .get('/features/nonexistent')
        .expect(404);
    });
  });

  describe('PATCH /features/:key', () => {
    it('should update global state', async () => {
      await request(app.getHttpServer())
        .post('/features')
        .send({ key: 'dark-mode', isEnabled: false });

      return request(app.getHttpServer())
        .patch('/features/dark-mode')
        .send({ isEnabled: true })
        .expect(200)
        .expect((res) => {
          expect(res.body.isEnabled).toBe(true);
        });
    });
  });

  describe('DELETE /features/:key', () => {
    it('should delete an existing flag', async () => {
      await request(app.getHttpServer())
        .post('/features')
        .send({ key: 'dark-mode', isEnabled: false });

      await request(app.getHttpServer())
        .delete('/features/dark-mode')
        .expect(204);

      return request(app.getHttpServer())
        .get('/features/dark-mode')
        .expect(404);
    });
  });

  // --- Overrides ---

  describe('User overrides', () => {
    beforeEach(async () => {
      await request(app.getHttpServer())
        .post('/features')
        .send({ key: 'dark-mode', isEnabled: false });
    });

    it('should set and evaluate a user override', async () => {
      await request(app.getHttpServer())
        .put('/features/dark-mode/overrides/users/user-1')
        .send({ isEnabled: true })
        .expect(200);

      return request(app.getHttpServer())
        .post('/features/dark-mode/evaluate')
        .send({ userId: 'user-1' })
        .expect(200)
        .expect((res) => {
          expect(res.body.enabled).toBe(true);
          expect(res.body.reason).toBe('user_override');
        });
    });

    it('should remove a user override', async () => {
      await request(app.getHttpServer())
        .put('/features/dark-mode/overrides/users/user-1')
        .send({ isEnabled: true });

      await request(app.getHttpServer())
        .delete('/features/dark-mode/overrides/users/user-1')
        .expect(204);

      return request(app.getHttpServer())
        .post('/features/dark-mode/evaluate')
        .send({ userId: 'user-1' })
        .expect(200)
        .expect((res) => {
          expect(res.body.enabled).toBe(false);
          expect(res.body.reason).toBe('default');
        });
    });
  });

  describe('Group overrides', () => {
    beforeEach(async () => {
      await request(app.getHttpServer())
        .post('/features')
        .send({ key: 'dark-mode', isEnabled: false });
    });

    it('should set and evaluate a group override', async () => {
      await request(app.getHttpServer())
        .put('/features/dark-mode/overrides/groups/beta')
        .send({ isEnabled: true })
        .expect(200);

      return request(app.getHttpServer())
        .post('/features/dark-mode/evaluate')
        .send({ groups: ['beta'] })
        .expect(200)
        .expect((res) => {
          expect(res.body.enabled).toBe(true);
          expect(res.body.reason).toBe('group_override');
        });
    });
  });

  describe('Region overrides', () => {
    beforeEach(async () => {
      await request(app.getHttpServer())
        .post('/features')
        .send({ key: 'dark-mode', isEnabled: false });
    });

    it('should set and evaluate a region override', async () => {
      await request(app.getHttpServer())
        .put('/features/dark-mode/overrides/regions/eu')
        .send({ isEnabled: true })
        .expect(200);

      return request(app.getHttpServer())
        .post('/features/dark-mode/evaluate')
        .send({ region: 'eu' })
        .expect(200)
        .expect((res) => {
          expect(res.body.enabled).toBe(true);
          expect(res.body.reason).toBe('region_override');
        });
    });

    it('should remove a region override', async () => {
      await request(app.getHttpServer())
        .put('/features/dark-mode/overrides/regions/eu')
        .send({ isEnabled: true });

      await request(app.getHttpServer())
        .delete('/features/dark-mode/overrides/regions/eu')
        .expect(204);

      return request(app.getHttpServer())
        .post('/features/dark-mode/evaluate')
        .send({ region: 'eu' })
        .expect(200)
        .expect((res) => {
          expect(res.body.enabled).toBe(false);
          expect(res.body.reason).toBe('default');
        });
    });
  });

  // --- Evaluation precedence ---

  describe('Evaluation precedence', () => {
    beforeEach(async () => {
      await request(app.getHttpServer())
        .post('/features')
        .send({ key: 'dark-mode', isEnabled: false });
    });

    it('user override should take priority over group override', async () => {
      await request(app.getHttpServer())
        .put('/features/dark-mode/overrides/users/user-1')
        .send({ isEnabled: false });

      await request(app.getHttpServer())
        .put('/features/dark-mode/overrides/groups/beta')
        .send({ isEnabled: true });

      return request(app.getHttpServer())
        .post('/features/dark-mode/evaluate')
        .send({ userId: 'user-1', groups: ['beta'] })
        .expect(200)
        .expect((res) => {
          expect(res.body.enabled).toBe(false);
          expect(res.body.reason).toBe('user_override');
        });
    });

    it('should fall back to global default with no matching overrides', () => {
      return request(app.getHttpServer())
        .post('/features/dark-mode/evaluate')
        .send({ userId: 'unknown-user' })
        .expect(200)
        .expect((res) => {
          expect(res.body.enabled).toBe(false);
          expect(res.body.reason).toBe('default');
        });
    });

    it('should return 404 when evaluating a non-existent flag', () => {
      return request(app.getHttpServer())
        .post('/features/nonexistent/evaluate')
        .send({})
        .expect(404);
    });

    it('region override should have lower priority than group override', async () => {
      await request(app.getHttpServer())
        .put('/features/dark-mode/overrides/groups/beta')
        .send({ isEnabled: false });
      await request(app.getHttpServer())
        .put('/features/dark-mode/overrides/regions/eu')
        .send({ isEnabled: true });

      return request(app.getHttpServer())
        .post('/features/dark-mode/evaluate')
        .send({ groups: ['beta'], region: 'eu' })
        .expect(200)
        .expect((res) => {
          expect(res.body.enabled).toBe(false);
          expect(res.body.reason).toBe('group_override');
        });
    });
  });
});
