import { IsDateString, IsMongoId, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Filtros para traer las guardias del calendario.
 * El front pide siempre un rango de fechas (el mes que se está viendo)
 * y opcionalmente filtra por persona o por sector.
 */
export class QueryShiftsDto {
  @ApiPropertyOptional({ example: '2026-09-01T00:00:00-03:00' })
  @IsDateString({}, { message: 'La fecha "desde" no es válida' })
  from!: string;

  @ApiPropertyOptional({ example: '2026-10-01T00:00:00-03:00' })
  @IsDateString({}, { message: 'La fecha "hasta" no es válida' })
  to!: string;

  @ApiPropertyOptional({ description: 'Id de un compañero, o "me" para las mías' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ example: 'Guardia' })
  @IsOptional()
  @IsString()
  sector?: string;
}
