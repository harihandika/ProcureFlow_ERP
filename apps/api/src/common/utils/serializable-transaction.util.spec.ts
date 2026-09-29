import { Prisma } from '@prisma/client';
import { serializableTransaction } from './serializable-transaction.util';

const conflict = () => new Prisma.PrismaClientKnownRequestError('write conflict', { code: 'P2034', clientVersion: 'test' });

describe('serializableTransaction', () => {
  it('retries serialization conflicts and uses Serializable', async () => {
    const transaction = jest.fn().mockRejectedValueOnce(conflict()).mockResolvedValue('ok');
    await expect(serializableTransaction({ $transaction: transaction } as never, async () => 'ok')).resolves.toBe('ok');
    expect(transaction).toHaveBeenCalledTimes(2);
    expect(transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'Serializable' });
  });

  it('limits retries to three attempts and returns a conflict', async () => {
    const transaction = jest.fn().mockRejectedValue(conflict());
    await expect(serializableTransaction({ $transaction: transaction } as never, async () => null)).rejects.toThrow('Another transaction');
    expect(transaction).toHaveBeenCalledTimes(3);
  });

  it('does not retry validation errors or unrelated database errors', async () => {
    for (const error of [new Error('validation'), new Prisma.PrismaClientKnownRequestError('unique', { code: 'P2002', clientVersion: 'test' })]) {
      const transaction = jest.fn().mockRejectedValue(error);
      await expect(serializableTransaction({ $transaction: transaction } as never, async () => null)).rejects.toBe(error);
      expect(transaction).toHaveBeenCalledTimes(1);
    }
  });
});
