import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Shift, ShiftSchema } from './schemas/shift.schema';
import { ShiftsService } from './shifts.service';
import { ShiftsController } from './shifts.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Shift.name, schema: ShiftSchema }]),
    UsersModule,
  ],
  controllers: [ShiftsController],
  providers: [ShiftsService],
  // Lo exportamos porque swaps (paso 3) y summary (paso 4) lo van a usar.
  exports: [ShiftsService, MongooseModule],
})
export class ShiftsModule {}
