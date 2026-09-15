import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { SwapRequest, SwapRequestSchema } from './schemas/swap-request.schema';
import { SwapsService } from './swaps.service';
import { SwapsController } from './swaps.controller';
import { ShiftsModule } from '../shifts/shifts.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: SwapRequest.name, schema: SwapRequestSchema }]),
    // ShiftsModule reexporta su MongooseModule, asi que acá tenemos acceso
    // al modelo de Shift sin volver a registrarlo.
    ShiftsModule,
    UsersModule,
    NotificationsModule,
  ],
  controllers: [SwapsController],
  providers: [SwapsService],
  exports: [SwapsService],
})
export class SwapsModule {}
