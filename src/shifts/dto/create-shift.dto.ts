import { IsDateString, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SHIFT_TYPES } from '../../common/constants';

export class CreateShiftDto {
  @ApiProperty({
    example: '2026-09-20T20:00:00-03:00',
    description: 'Inicio de la guardia, con fecha y hora (ISO 8601)',
  })
  @IsDateString({}, { message: 'La fecha de inicio no es válida' })
  start!: string;

  @ApiProperty({
    example: '2026-09-21T08:00:00-03:00',
    description: 'Fin de la guardia. Puede ser del día siguiente.',
  })
  @IsDateString({}, { message: 'La fecha de fin no es válida' })
  end!: string;

  @ApiPropertyOptional({ enum: SHIFT_TYPES, example: '12h' })
  @IsOptional()
  @IsIn(SHIFT_TYPES as unknown as string[], {
    message: `El tipo tiene que ser uno de: ${SHIFT_TYPES.join(', ')}`,
  })
  type?: string;

  @ApiPropertyOptional({
    example: 'Terapia Intensiva',
    description: 'Si no se manda, se usa el sector del usuario',
  })
  @IsOptional()
  @IsString()
  sector?: string;

  @ApiPropertyOptional({ example: 'Cubro a Martínez' })
  @IsOptional()
  @IsString()
  @MaxLength(300, { message: 'La nota es muy larga' })
  notes?: string;
}
