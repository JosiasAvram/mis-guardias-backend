import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    // Si el endpoint no pide ningun rol puntual, igual exigimos que el
    // usuario este aprobado (role distinto de 'none').
    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException('No tenés permisos para esta acción');
    }
    if (user.role === 'none') {
      throw new ForbiddenException('Tu cuenta todavía no fue aprobada por el administrador');
    }

    if (!requiredRoles?.length) return true;

    // El admin pasa cualquier chequeo de roles.
    if (user.role === 'admin') return true;

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException('No tenés permisos para esta acción');
    }
    return true;
  }
}
