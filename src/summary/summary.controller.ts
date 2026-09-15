import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SummaryService } from './summary.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, JwtUser } from '../auth/decorators/current-user.decorator';

@ApiTags('summary')
@ApiBearerAuth()
@Controller({ path: 'summary', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
export class SummaryController {
  constructor(private readonly summaryService: SummaryService) {}

  @Get('month/:month')
  @ApiOperation({
    summary: 'Horas y cobro de un mes',
    description: 'El mes va en formato AAAA-MM, por ejemplo 2026-09',
  })
  mes(@CurrentUser() user: JwtUser, @Param('month') month: string) {
    return this.summaryService.mes(user.sub, month);
  }

  @Get('year/:year')
  @ApiOperation({ summary: 'Los 12 meses de un año, para el historial' })
  anio(@CurrentUser() user: JwtUser, @Param('year', ParseIntPipe) year: number) {
    return this.summaryService.anio(user.sub, year);
  }
}
