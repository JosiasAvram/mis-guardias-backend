import { Body, Controller, Delete, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { NotificationsService } from './notifications.service';
import { RegisterTokenDto, UnregisterTokenDto } from './dto/register-token.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtUser } from '../auth/decorators/current-user.decorator';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller({ path: 'notifications', version: '1' })
// Solo JwtAuthGuard: un usuario todavía sin aprobar también puede registrar
// su celular, así le llega el aviso cuando el admin lo habilita.
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('token')
  @ApiOperation({ summary: 'Registrar el celular para recibir notificaciones' })
  register(@CurrentUser() user: JwtUser, @Body() dto: RegisterTokenDto) {
    return this.notificationsService.registerToken(
      user.sub,
      dto.token,
      dto.platform,
      dto.deviceId,
    );
  }

  @Delete('token')
  @ApiOperation({ summary: 'Dar de baja el celular (al cerrar sesión)' })
  unregister(@Body() dto: UnregisterTokenDto) {
    return this.notificationsService.unregisterToken(dto.token);
  }
}
