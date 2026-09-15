import { IsIn, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SWAP_STATUS } from '../../common/constants';

export class QuerySwapsDto {
  @ApiPropertyOptional({
    enum: ['recibidas', 'enviadas', 'todas'],
    description: 'Bandeja a mostrar. Por defecto: todas',
  })
  @IsOptional()
  @IsIn(['recibidas', 'enviadas', 'todas'])
  box?: 'recibidas' | 'enviadas' | 'todas';

  @ApiPropertyOptional({ enum: SWAP_STATUS })
  @IsOptional()
  @IsIn(SWAP_STATUS as unknown as string[])
  status?: string;
}
