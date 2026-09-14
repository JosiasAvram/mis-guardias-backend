import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { SHIFT_TYPES } from '../../common/constants';

export type ShiftDocument = HydratedDocument<Shift>;

/**
 * Una guardia trabajada (o por trabajar) por un usuario.
 *
 * start y end son fechas completas con hora, asi que una guardia puede
 * cruzar la medianoche sin problema: por ejemplo start = 12/09 20:00 y
 * end = 13/09 08:00. Las horas se calculan restando timestamps, no dias.
 */
@Schema({ timestamps: true, collection: 'shifts' })
export class Shift {
  // Duenio actual de la guardia. Cambia si se acepta un intercambio.
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, type: Date, index: true })
  start!: Date;

  @Prop({ required: true, type: Date })
  end!: Date;

  // Horas que dura la guardia. Lo guardamos calculado para no tener que
  // recalcularlo en cada consulta del resumen mensual.
  @Prop({ required: true })
  hours!: number;

  @Prop({ enum: SHIFT_TYPES, default: 'otra' })
  type!: string;

  // Sector al que corresponde la guardia. Se copia del usuario al crearla,
  // pero se puede cambiar (alguien puede cubrir en otro sector).
  @Prop({ required: true, trim: true, index: true })
  sector!: string;

  @Prop({ trim: true })
  notes?: string;

  // Clave 'YYYY-MM' del mes local al que pertenece la guardia (segun su
  // fecha de inicio). Sirve para agrupar rapido en los resumenes.
  @Prop({ required: true, index: true })
  monthKey!: string;

  // Quien la creo originalmente. Si hubo un intercambio, userId cambia
  // pero este campo queda igual, asi se puede rastrear el historial.
  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;
}

export const ShiftSchema = SchemaFactory.createForClass(Shift);

// Indice compuesto: casi todas las consultas son "las guardias de este
// usuario en este mes" o "las guardias entre dos fechas".
ShiftSchema.index({ userId: 1, start: 1 });
ShiftSchema.index({ userId: 1, monthKey: 1 });
