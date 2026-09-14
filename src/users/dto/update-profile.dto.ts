import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ROLES } from '../../common/constants';

/** Datos que un usuario puede cambiar de su propio perfil. */
export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Juan' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional({ example: 'Pérez' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  lastName?: string;

  @ApiPropertyOptional({ example: 'Guardia' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  sector?: string;

  @ApiPropertyOptional({ example: 'juan@ejemplo.com' })
  @IsOptional()
  @IsEmail({}, { message: 'El email no es válido' })
  email?: string;
}

/** Solo el admin puede usar esto, para aprobar usuarios o darles admin. */
export class UpdateRoleDto {
  @ApiPropertyOptional({ enum: ROLES, example: 'empleado' })
  @IsIn(ROLES as unknown as string[], {
    message: `El rol tiene que ser uno de: ${ROLES.join(', ')}`,
  })
  role!: string;
}
