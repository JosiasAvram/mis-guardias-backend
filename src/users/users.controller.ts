import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { UsersService } from './users.service';
import { UpdateProfileDto, UpdateRoleDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, JwtUser } from '../auth/decorators/current-user.decorator';
import { SECTOR_SUGGESTIONS } from '../common/constants';

@ApiTags('users')
@ApiBearerAuth()
@Controller({ path: 'users', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Lista de compañeros aprobados (para el filtro del calendario)' })
  list(@Query('sector') sector?: string) {
    return this.usersService.listApproved(sector);
  }

  @Get('sectors')
  @ApiOperation({ summary: 'Sectores que ya existen en la base + sugerencias' })
  async sectors() {
    const enUso = await this.usersService.listSectors();
    // Juntamos los que ya usan los usuarios con la lista sugerida, sin repetir.
    const todos = Array.from(new Set([...enUso, ...SECTOR_SUGGESTIONS]));
    return { sectors: todos.sort(), enUso };
  }

  @Patch('me')
  @ApiOperation({ summary: 'Editar mi propio perfil' })
  updateMe(@CurrentUser() user: JwtUser, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.sub, dto);
  }

  // ---- Endpoints solo para el admin ----

  @Get('pending')
  @Roles('admin')
  @ApiOperation({ summary: 'Usuarios esperando aprobación' })
  pending() {
    return this.usersService.listPending();
  }

  @Patch(':id/role')
  @Roles('admin')
  @ApiOperation({ summary: 'Aprobar un usuario o cambiarle el rol' })
  updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.usersService.updateRole(id, dto.role);
  }
}
