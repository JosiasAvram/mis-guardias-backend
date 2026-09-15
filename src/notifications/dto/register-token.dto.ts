import { IsIn, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterTokenDto {
  @ApiProperty({ example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]' })
  @IsString()
  token!: string;

  @ApiPropertyOptional({ enum: ['ios', 'android', 'web'], default: 'android' })
  @IsOptional()
  @IsIn(['ios', 'android', 'web'])
  platform?: string;

  @ApiPropertyOptional({ description: 'Identificador del celular' })
  @IsOptional()
  @IsString()
  deviceId?: string;
}

export class UnregisterTokenDto {
  @ApiProperty()
  @IsString()
  token!: string;
}
