import { Module } from '@nestjs/common';

import { SummaryService } from './summary.service';
import { SummaryController } from './summary.controller';
import { ShiftsModule } from '../shifts/shifts.module';
import { RatesModule } from '../rates/rates.module';

@Module({
  // ShiftsModule reexporta su MongooseModule, así que el modelo de Shift
  // está disponible acá sin volver a registrarlo.
  imports: [ShiftsModule, RatesModule],
  controllers: [SummaryController],
  providers: [SummaryService],
})
export class SummaryModule {}
