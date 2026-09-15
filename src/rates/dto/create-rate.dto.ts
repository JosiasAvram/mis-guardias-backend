import { IsIn, IsNumber, IsOptional, Matches, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RATE_MODES } from '../../common/constants';

export class CreateRateDto {
  @ApiProperty({
    example: '2026-09',
    description: 'Desde qué mes rige esta tarifa (YYYY-MM)',
  })
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'El mes tiene que tener el formato AAAA-MM',
  })
  validFrom!: string;

  @ApiProperty({ enum: RATE_MODES, example: 'hora' })
  @IsIn(RATE_MODES as unknown as string[], {
    message: 'El modo tiene que ser "hora" o "guardia"',
  })
  mode!: string;

  @ApiPropertyOptional({ example: 5000, description: 'Valor por hora' })
  @IsOptional()
  @IsNumber({}, { message: 'El valor por hora tiene que ser un número' })
  @Min(0, { message: 'El valor por hora no puede ser negativo' })
  hourlyRate?: number;

  @ApiPropertyOptional({ example: 60000 })
  @IsOptional()
  @IsNumber({}, { message: 'El precio de la guardia de 12 h tiene que ser un número' })
  @Min(0)
  price12h?: number;

  @ApiPropertyOptional({ example: 110000 })
  @IsOptional()
  @IsNumber({}, { message: 'El precio de la guardia de 24 h tiene que ser un número' })
  @Min(0)
  price24h?: number;

  @ApiPropertyOptional({ example: 25000 })
  @IsOptional()
  @IsNumber({}, { message: 'El precio de la pasiva tiene que ser un número' })
  @Min(0)
  pricePasiva?: number;

  @ApiPropertyOptional({ example: 40000 })
  @IsOptional()
  @IsNumber({}, { message: 'El precio de "otra" tiene que ser un número' })
  @Min(0)
  priceOtra?: number;
}
