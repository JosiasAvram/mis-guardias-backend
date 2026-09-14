import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { UsersService } from '../../users/users.service';

interface JwtPayload {
  sub: string;
  username: string;
  role: string;
  name: string;
  // Version del token al momento de firmarlo.
  tv?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') ?? 'default-secret',
    });
  }

  // Lo que devuelve este metodo termina en req.user
  async validate(payload: JwtPayload) {
    const estado = await this.usersService.getAuthState(payload.sub);

    // El usuario fue borrado.
    if (!estado) {
      throw new UnauthorizedException('Sesión inválida');
    }

    // El admin invalido los tokens viejos (por ejemplo al cambiarle el rol).
    if ((payload.tv ?? 0) < estado.tokenVersion) {
      throw new UnauthorizedException('Tu sesión fue cerrada, volvé a entrar');
    }

    return {
      sub: payload.sub,
      username: payload.username,
      // Usamos el rol de la base y no el del token: si el admin lo aprobo
      // hace un minuto, queremos que ya pueda entrar.
      role: estado.role,
      name: payload.name,
    };
  }
}
