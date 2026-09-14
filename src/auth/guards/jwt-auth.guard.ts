import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Exige un token JWT valido en el header Authorization: Bearer ... */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
