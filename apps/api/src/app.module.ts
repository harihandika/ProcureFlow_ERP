import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { AuditTrailsModule } from './audit-trails/audit-trails.module';
import { AuthModule } from './auth/auth.module';
import { BudgetsModule } from './budgets/budgets.module';
import { CommonModule } from './common/common.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { DepartmentsModule } from './departments/departments.module';
import { ErpIntegrationModule } from './erp-integration/erp-integration.module';
import { ItemsModule } from './items/items.module';
import { PackagingUnitsModule } from './packaging-units/packaging-units.module';
import { PrismaModule } from './prisma/prisma.module';
import { PurchaseRequestsModule } from './purchase-requests/purchase-requests.module';
import { ReceivingModule } from './receiving/receiving.module';
import { RolesModule } from './roles/roles.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { UsersModule } from './users/users.module';
import { WarehousesModule } from './warehouses/warehouses.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    CommonModule,
    AuditTrailsModule,
    AuthModule,
    UsersModule,
    RolesModule,
    DepartmentsModule,
    ItemsModule,
    SuppliersModule,
    WarehousesModule,
    PackagingUnitsModule,
    BudgetsModule,
    PurchaseRequestsModule,
    ReceivingModule,
    ErpIntegrationModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
