import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/** Marca un endpoint como accesible solo para ciertos roles. */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
