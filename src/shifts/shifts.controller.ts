import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ShiftsService } from './shifts.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { QueryShiftsDto } from './dto/query-shifts.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, JwtUser } from '../auth/decorators/current-user.decorator';

@ApiTags('shifts')
@ApiBearerAuth()
@Controller({ path: 'shifts', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Get()
  @ApiOperation({
    summary: 'Guardias en un rango de fechas (para el calendario)',
    description:
      'Devuelve toda guardia que se superponga con el rango. Filtros opcionales: ' +
      'userId (o "me" para las propias) y sector.',
  })
  findRange(@CurrentUser() user: JwtUser, @Query() query: QueryShiftsDto) {
    return this.shiftsService.findRange(user.sub, query);
  }

  @Post()
  @ApiOperation({ summary: 'Cargar una guardia mía' })
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateShiftDto) {
    return this.shiftsService.create(user.sub, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de una guardia' })
  findOne(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.shiftsService.findOne(user.sub, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar una guardia mía' })
  update(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() dto: UpdateShiftDto,
  ) {
    return this.shiftsService.update(user.sub, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Borrar una guardia mía' })
  remove(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.shiftsService.remove(user.sub, id);
  }
}
