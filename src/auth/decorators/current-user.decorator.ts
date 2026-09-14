import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface JwtUser {
  sub: string; // id del usuario en Mongo
  username: string;
  role: string;
  name: string;
}

/**
 * Atajo para no escribir @Req() req y despues req.user en cada controller.
 * Se usa asi:  @Get('me') me(@CurrentUser() user: JwtUser) { ... }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
