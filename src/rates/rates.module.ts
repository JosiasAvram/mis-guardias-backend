import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Rate, RateSchema } from './schemas/rate.schema';
import { RatesService } from './rates.service';
import { RatesController } from './rates.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: Rate.name, schema: RateSchema }])],
  controllers: [RatesController],
  providers: [RatesService],
  // SummaryModule lo necesita para calcular cuánto se cobra cada mes.
  exports: [RatesService],
})
export class RatesModule {}
