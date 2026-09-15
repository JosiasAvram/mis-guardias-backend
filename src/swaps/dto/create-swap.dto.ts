import { IsMongoId, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSwapDto {
  @ApiProperty({ description: 'Guardia mía que ofrezco' })
  @IsMongoId({ message: 'La guardia que ofrecés no es válida' })
  fromShiftId!: string;

  @ApiPropertyOptional({
    description:
      'Guardia del compañero que quiero a cambio. Si no se manda, es una cesión: ' +
      'le paso la mía y no pido nada.',
  })
  @IsOptional()
  @IsMongoId({ message: 'La guardia que pedís no es válida' })
  toShiftId?: string;

  @ApiPropertyOptional({
    description: 'A quién se la mando. Obligatorio si es una cesión.',
  })
  @IsOptional()
  @IsMongoId({ message: 'El compañero no es válido' })
  toUserId?: string;

  @ApiPropertyOptional({ example: 'Me surgió un viaje, ¿me la cambiás?' })
  @IsOptional()
  @IsString()
  @MaxLength(300, { message: 'El mensaje es muy largo' })
  message?: string;
}
