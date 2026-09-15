import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SwapsService } from './swaps.service';
import { CreateSwapDto } from './dto/create-swap.dto';
import { QuerySwapsDto } from './dto/query-swaps.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, JwtUser } from '../auth/decorators/current-user.decorator';

@ApiTags('swaps')
@ApiBearerAuth()
@Controller({ path: 'swaps', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
export class SwapsController {
  constructor(private readonly swapsService: SwapsService) {}

  @Get()
  @ApiOperation({ summary: 'Mis solicitudes (recibidas, enviadas o todas)' })
  list(@CurrentUser() user: JwtUser, @Query() query: QuerySwapsDto) {
    return this.swapsService.list(user.sub, query);
  }

  @Get('pending-count')
  @ApiOperation({ summary: 'Cuántas solicitudes tengo sin responder (badge)' })
  pendingCount(@CurrentUser() user: JwtUser) {
    return this.swapsService.contarPendientes(user.sub);
  }

  @Post()
  @ApiOperation({
    summary: 'Proponer un intercambio',
    description:
      'Con toShiftId es un cambio de guardia por guardia. Sin toShiftId (pero con ' +
      'toUserId) es una cesión: le paso la mía y no pido nada a cambio.',
  })
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateSwapDto) {
    return this.swapsService.create(user.sub, dto);
  }

  @Patch(':id/accept')
  @ApiOperation({ summary: 'Aceptar (las guardias cambian de dueño)' })
  accept(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.swapsService.accept(user.sub, id);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Rechazar una solicitud que me llegó' })
  reject(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.swapsService.reject(user.sub, id);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancelar una solicitud que mandé yo' })
  cancel(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.swapsService.cancel(user.sub, id);
  }
}
