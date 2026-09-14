import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { UsersService, UsuarioPublico } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

const SALT_ROUNDS = 10;

export interface RespuestaAuth {
  token: string;
  user: UsuarioPublico;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  /** Arma el JWT con los datos que la app necesita tener a mano. */
  private firmarToken(user: UsuarioPublico, tokenVersion: number): string {
    return this.jwtService.sign({
      sub: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      tv: tokenVersion,
    });
  }

  /**
   * Registro. El usuario queda con rol 'none' hasta que el admin lo aprueba,
   * asi que igual le devolvemos token: con ese token la app lo manda a la
   * pantalla de "esperando aprobación" y no lo obliga a loguearse de nuevo.
   */
  async register(dto: RegisterDto): Promise<RespuestaAuth> {
    const yaExiste = await this.usersService.findByUsername(dto.username);
    if (yaExiste) {
      throw new ConflictException('Ese usuario ya está en uso, probá con otro');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const creado = await this.usersService.create({
      username: dto.username,
      passwordHash,
      name: dto.name,
      lastName: dto.lastName,
      sector: dto.sector,
      email: dto.email,
      role: 'none',
    });

    const publico = this.usersService.toPublic(creado);
    return { token: this.firmarToken(publico, creado.tokenVersion ?? 0), user: publico };
  }

  async login(dto: LoginDto): Promise<RespuestaAuth> {
    const user = await this.usersService.findByUsername(dto.username);
    // Mismo mensaje para usuario inexistente y contrasena mala, asi no se
    // puede adivinar que usuarios existen.
    if (!user) {
      throw new UnauthorizedException('Usuario o contraseña incorrectos');
    }

    const coincide = await bcrypt.compare(dto.password, user.passwordHash);
    if (!coincide) {
      throw new UnauthorizedException('Usuario o contraseña incorrectos');
    }

    const publico = this.usersService.toPublic(user);
    return { token: this.firmarToken(publico, user.tokenVersion ?? 0), user: publico };
  }

  /** Devuelve el usuario actual leyendolo de la base (rol siempre fresco). */
  async me(userId: string): Promise<UsuarioPublico> {
    const user = await this.usersService.findById(userId);
    return this.usersService.toPublic(user);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ ok: true }> {
    const user = await this.usersService.findById(userId);

    const coincide = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!coincide) {
      throw new BadRequestException('La contraseña actual no es correcta');
    }
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('La contraseña nueva tiene que ser distinta');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);
    await this.usersService.setPasswordHash(userId, passwordHash);
    return { ok: true };
  }
}
