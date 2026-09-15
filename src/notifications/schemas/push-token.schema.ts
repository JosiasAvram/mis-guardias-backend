import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PushTokenDocument = HydratedDocument<PushToken>;

/**
 * Token de push de un celular, atado al usuario que estaba logueado cuando
 * se registró.
 *
 * A diferencia de una app de avisos generales, acá las notificaciones van
 * dirigidas: "a vos te llegó una solicitud". Por eso el token guarda el
 * userId, y una persona puede tener varios (celular y tablet, por ejemplo).
 */
@Schema({ timestamps: true, collection: 'pushTokens' })
export class PushToken {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, unique: true, trim: true })
  token!: string;

  @Prop({ enum: ['ios', 'android', 'web'], default: 'android' })
  platform!: string;

  // Se marca en false cuando Expo avisa que el token murió (app desinstalada).
  @Prop({ default: true })
  active!: boolean;

  // Identificador del celular. Sirve para que, si otra persona se loguea en
  // el mismo aparato, el token quede asociado a ella y no a la anterior.
  @Prop({ trim: true, index: true })
  deviceId?: string;
}

export const PushTokenSchema = SchemaFactory.createForClass(PushToken);
PushTokenSchema.index({ userId: 1, active: 1 });
