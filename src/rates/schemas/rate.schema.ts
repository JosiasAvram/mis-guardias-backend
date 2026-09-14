import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { RATE_MODES } from '../../common/constants';

export type RateDocument = HydratedDocument<Rate>;

/**
 * Tarifa de un usuario, con vigencia.
 *
 * En vez de pisar el valor cada vez que le aumentan, guardamos una tarifa
 * nueva con el mes desde el que rige (validFrom, en formato 'YYYY-MM').
 * Asi, cuando el usuario mira el historial, cada mes viejo sigue mostrando
 * lo que cobro de verdad y no se recalcula con la tarifa de hoy.
 *
 * Para calcular un mes, el backend busca la tarifa con el validFrom mas
 * grande que sea <= a ese mes.
 */
@Schema({ timestamps: true, collection: 'rates' })
export class Rate {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  // Desde que mes rige esta tarifa. Formato 'YYYY-MM'.
  @Prop({ required: true, index: true })
  validFrom!: string;

  // Como se calcula el total del mes:
  //  'hora'    -> horas trabajadas * hourlyRate
  //  'guardia' -> precio fijo segun el tipo de cada guardia
  @Prop({ enum: RATE_MODES, default: 'hora' })
  mode!: string;

  // Valor por hora (se usa si mode === 'hora').
  @Prop({ default: 0 })
  hourlyRate!: number;

  // Precio fijo por tipo de guardia (se usa si mode === 'guardia').
  @Prop({ default: 0 })
  price12h!: number;

  @Prop({ default: 0 })
  price24h!: number;

  @Prop({ default: 0 })
  pricePasiva!: number;

  @Prop({ default: 0 })
  priceOtra!: number;
}

export const RateSchema = SchemaFactory.createForClass(Rate);

// Un usuario no puede tener dos tarifas que arranquen el mismo mes.
RateSchema.index({ userId: 1, validFrom: 1 }, { unique: true });
