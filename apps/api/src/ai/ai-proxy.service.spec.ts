import { of } from 'rxjs';
import { AiProxyService } from './ai-proxy.service';

describe('AiProxyService authentication', () => {
  it('sends the internal service key to FastAPI', async () => {
    const post = jest.fn().mockReturnValue(of({ data: { riskScore: 0 } }));
    const config = { get: jest.fn((name: string) => name === 'AI_SERVICE_API_KEY' ? 'test-key' : 'http://ai:8000') };
    const service = new AiProxyService({ post } as never, config as never);
    await expect(service.auditPr('pr-id')).resolves.toEqual({ riskScore: 0 });
    expect(post).toHaveBeenCalledWith('http://ai:8000/ai/audit-pr', { prId: 'pr-id' }, {
      timeout: 35000, headers: { 'X-AI-Service-Key': 'test-key' },
    });
  });

  it('does not call FastAPI when the key is unconfigured', async () => {
    const post = jest.fn();
    const service = new AiProxyService({ post } as never, { get: jest.fn() } as never);
    await expect(service.auditPr('pr-id')).rejects.toThrow('authentication is not configured');
    expect(post).not.toHaveBeenCalled();
  });
});
