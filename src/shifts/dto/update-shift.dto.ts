import { PartialType } from '@nestjs/swagger';
import { CreateShiftDto } from './create-shift.dto';

/** Todos los campos de CreateShiftDto, pero opcionales. */
export class UpdateShiftDto extends PartialType(CreateShiftDto) {}
