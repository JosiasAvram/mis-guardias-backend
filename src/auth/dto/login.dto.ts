import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'jperez' })
  @IsString()
  username!: string;

  @ApiProperty({ example: 'mi_password' })
  @IsString()
  @MinLength(1, { message: 'Ingresá tu contraseña' })
  password!: string;
}
