import { IsEmail, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'jperez', description: 'Usuario único, mínimo 3 caracteres' })
  @IsString()
  @MinLength(3, { message: 'El usuario tiene que tener al menos 3 caracteres' })
  @Matches(/^[a-zA-Z0-9_.-]+$/, {
    message: 'El usuario solo puede tener letras, números, guiones, guión bajo y punto',
  })
  username!: string;

  @ApiProperty({ example: 'mi_password' })
  @IsString()
  @MinLength(6, { message: 'La contraseña tiene que tener al menos 6 caracteres' })
  password!: string;

  @ApiProperty({ example: 'Juan' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ example: 'Pérez' })
  @IsString()
  @MinLength(1)
  lastName!: string;

  @ApiProperty({ example: 'Terapia Intensiva', description: 'Sector o servicio del hospital' })
  @IsString()
  @MinLength(2, { message: 'Indicá tu sector' })
  sector!: string;

  @ApiPropertyOptional({ example: 'juan@ejemplo.com' })
  @IsOptional()
  @IsEmail({}, { message: 'El email no es válido' })
  email?: string;
}
