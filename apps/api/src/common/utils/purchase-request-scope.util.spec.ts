import { purchaseRequestReadScope } from './purchase-request-scope.util';

describe('purchaseRequestReadScope', () => {
  const user = { id: 'user', email: 'a@test', fullName: 'A', departmentId: 'dept', roles: ['REQUESTER'] };
  it('scopes requesters to their own requests', () => {
    expect(purchaseRequestReadScope(user)).toEqual({ requesterId: 'user' });
  });
  it('scopes managers and denies missing departments', () => {
    expect(purchaseRequestReadScope({ ...user, roles: ['MANAGER'] })).toEqual({ departmentId: 'dept' });
    expect(purchaseRequestReadScope({ ...user, departmentId: null, roles: ['MANAGER'] })).toEqual({ departmentId: '00000000-0000-0000-0000-000000000000' });
  });
  it('preserves broader authorized roles for multi-role users', () => {
    for (const role of ['ADMIN', 'FINANCE', 'PURCHASING']) {
      expect(purchaseRequestReadScope({ ...user, roles: ['REQUESTER', 'MANAGER', role] })).toEqual({});
    }
  });
  it('denies users without a permitted read role', () => {
    expect(purchaseRequestReadScope({ ...user, roles: [] })).toEqual({ id: '00000000-0000-0000-0000-000000000000' });
  });
});
