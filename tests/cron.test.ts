import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/cron/weekly-leagues/route';
import * as fs from 'fs';
import * as path from 'path';

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = match[2] || '';
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.slice(1, -1);
        }
        process.env[key] = val;
      }
    }
  }
}

loadEnvLocal();

describe('H3: Cron Route Security and Method Authentication', () => {
  const originalCronSecret = process.env.CRON_SECRET;
  const TEST_SECRET = 'test-cron-secret-production-token-12345';

  afterEach(() => {
    if (originalCronSecret !== undefined) {
      process.env.CRON_SECRET = originalCronSecret;
    } else {
      delete process.env.CRON_SECRET;
    }
  });

  describe('1. Fail Closed when CRON_SECRET is Unset', () => {
    beforeEach(() => {
      delete process.env.CRON_SECRET;
    });

    it('rejects GET request even with a provided Bearer token', async () => {
      const req = new NextRequest('http://localhost:3000/api/cron/weekly-leagues', {
        method: 'GET',
        headers: {
          authorization: `Bearer ${TEST_SECRET}`,
        },
      });

      const res = await GET(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toMatch(/Unauthorized/i);
    });

    it('rejects POST request even with a provided x-cron-secret header', async () => {
      const req = new NextRequest('http://localhost:3000/api/cron/weekly-leagues', {
        method: 'POST',
        headers: {
          'x-cron-secret': TEST_SECRET,
        },
      });

      const res = await POST(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toMatch(/Unauthorized/i);
    });
  });

  describe('2. Authentication When CRON_SECRET is Set', () => {
    beforeEach(() => {
      process.env.CRON_SECRET = TEST_SECRET;
    });

    it('rejects request with no secret header (GET)', async () => {
      const req = new NextRequest('http://localhost:3000/api/cron/weekly-leagues', {
        method: 'GET',
      });

      const res = await GET(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toMatch(/Unauthorized/i);
    });

    it('rejects request with no secret header (POST)', async () => {
      const req = new NextRequest('http://localhost:3000/api/cron/weekly-leagues', {
        method: 'POST',
      });

      const res = await POST(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toMatch(/Unauthorized/i);
    });

    it('rejects request with wrong secret (Bearer in GET)', async () => {
      const req = new NextRequest('http://localhost:3000/api/cron/weekly-leagues', {
        method: 'GET',
        headers: {
          authorization: 'Bearer wrong-secret-token',
        },
      });

      const res = await GET(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toMatch(/Unauthorized/i);
    });

    it('rejects request with wrong secret (x-cron-secret in POST)', async () => {
      const req = new NextRequest('http://localhost:3000/api/cron/weekly-leagues', {
        method: 'POST',
        headers: {
          'x-cron-secret': 'wrong-secret-token',
        },
      });

      const res = await POST(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toMatch(/Unauthorized/i);
    });

    it('rejects request with secret of mismatched length (constant-time guard)', async () => {
      const req = new NextRequest('http://localhost:3000/api/cron/weekly-leagues', {
        method: 'GET',
        headers: {
          authorization: 'Bearer short',
        },
      });

      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it('accepts GET request with Authorization: Bearer <CRON_SECRET> (Vercel Cron)', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/cron/weekly-leagues?closingWeekKey=2099-W99&newWeekKey=2099-W100',
        {
          method: 'GET',
          headers: {
            authorization: `Bearer ${TEST_SECRET}`,
          },
        }
      );

      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.closingWeekKey).toBe('2099-W99');
      expect(data.newWeekKey).toBe('2099-W100');
    });

    it('accepts POST request with x-cron-secret header', async () => {
      const req = new NextRequest('http://localhost:3000/api/cron/weekly-leagues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cron-secret': TEST_SECRET,
        },
        body: JSON.stringify({
          closingWeekKey: '2099-W99',
          newWeekKey: '2099-W100',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.closingWeekKey).toBe('2099-W99');
      expect(data.newWeekKey).toBe('2099-W100');
    });

    it('cross-supports GET with x-cron-secret and POST with Bearer token', async () => {
      const getReq = new NextRequest(
        'http://localhost:3000/api/cron/weekly-leagues?closingWeekKey=2099-W99&newWeekKey=2099-W100',
        {
          method: 'GET',
          headers: {
            'x-cron-secret': TEST_SECRET,
          },
        }
      );
      const getRes = await GET(getReq);
      expect(getRes.status).toBe(200);

      const postReq = new NextRequest(
        'http://localhost:3000/api/cron/weekly-leagues?closingWeekKey=2099-W99&newWeekKey=2099-W100',
        {
          method: 'POST',
          headers: {
            authorization: `Bearer ${TEST_SECRET}`,
          },
        }
      );
      const postRes = await POST(postReq);
      expect(postRes.status).toBe(200);
    });
  });
});
