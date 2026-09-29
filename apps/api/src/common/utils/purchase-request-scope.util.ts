import { Prisma } from '@prisma/client';
import { AppRole } from '../constants/roles';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

export function purchaseRequestReadScope(user: AuthenticatedUser): Prisma.PurchaseRequestWhereInput {
  if (user.roles.some((role) => [AppRole.Admin, AppRole.Finance, AppRole.Purchasing].includes(role as AppRole))) {
    return {};
  }
  if (user.roles.includes(AppRole.Manager)) {
    return { departmentId: user.departmentId ?? '00000000-0000-0000-0000-000000000000' };
  }
  if (user.roles.includes(AppRole.Requester)) {
    return { requesterId: user.id };
  }
  return { id: '00000000-0000-0000-0000-000000000000' };
}
