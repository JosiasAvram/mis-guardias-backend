import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { SWAP_STATUS } from '../../common/constants';

export type SwapRequestDocument = HydratedDocument<SwapRequest>;

/**
 * Solicitud de intercambio de guardias entre dos companieros.
 *
 * Hay dos casos:
 *  1) Intercambio: mando mi guardia del viernes y pido la tuya del lunes.
 *     -> fromShiftId y toShiftId tienen valor. Al aceptar, se cambian los
 *        duenios de las dos guardias.
 *  2) Cesion: te paso mi guardia del viernes y no pido nada a cambio.
 *     -> toShiftId queda vacio. Al aceptar, mi guardia pasa a ser tuya.
 */
@Schema({ timestamps: true, collection: 'swaprequests' })
export class SwapRequest {
  // Quien manda la solicitud.
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  fromUserId!: Types.ObjectId;

  // A quien se la manda.
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  toUserId!: Types.ObjectId;

  // Guardia que ofrece el que manda la solicitud.
  @Prop({ type: Types.ObjectId, ref: 'Shift', required: true })
  fromShiftId!: Types.ObjectId;

  // Guardia que pide a cambio. Si no esta, es una cesion.
  @Prop({ type: Types.ObjectId, ref: 'Shift' })
  toShiftId?: Types.ObjectId;

  @Prop({ enum: SWAP_STATUS, default: 'pending', index: true })
  status!: string;

  @Prop({ trim: true })
  message?: string;

  // Cuando se respondio (acepto o rechazo). Queda para el historial.
  @Prop({ type: Date })
  respondedAt?: Date;
}

export const SwapRequestSchema = SchemaFactory.createForClass(SwapRequest);

// Para listar rapido "mis solicitudes recibidas pendientes".
SwapRequestSchema.index({ toUserId: 1, status: 1 });
SwapRequestSchema.index({ fromUserId: 1, status: 1 });
