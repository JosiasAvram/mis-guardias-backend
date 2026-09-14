import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ example: 'mi_password_actual' })
  @IsString()
  currentPassword!: string;

  @ApiProperty({ example: 'mi_password_nueva' })
  @IsString()
  @MinLength(6, { message: 'La contraseña nueva tiene que tener al menos 6 caracteres' })
  newPassword!: string;
}
