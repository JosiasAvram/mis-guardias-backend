import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RatesService } from './rates.service';
import { CreateRateDto } from './dto/create-rate.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, JwtUser } from '../auth/decorators/current-user.decorator';

@ApiTags('rates')
@ApiBearerAuth()
@Controller({ path: 'rates', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
export class RatesController {
  constructor(private readonly ratesService: RatesService) {}

  @Get()
  @ApiOperation({ summary: 'Mis tarifas, de la más nueva a la más vieja' })
  list(@CurrentUser() user: JwtUser) {
    return this.ratesService.listMine(user.sub);
  }

  @Get('current')
  @ApiOperation({ summary: 'Tarifa que rige para un mes (por defecto, el actual)' })
  current(@CurrentUser() user: JwtUser, @Query('month') month?: string) {
    const mes = month ?? new Date().toISOString().slice(0, 7);
    return this.ratesService.vigentePara(user.sub, mes);
  }

  @Post()
  @ApiOperation({
    summary: 'Cargar una tarifa desde un mes',
    description:
      'Si ya existe una tarifa que arranca ese mismo mes, se reemplaza. Los meses ' +
      'anteriores siguen usando la tarifa vieja, así el historial no se recalcula.',
  })
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateRateDto) {
    return this.ratesService.upsert(user.sub, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Borrar una tarifa' })
  remove(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.ratesService.remove(user.sub, id);
  }
}
