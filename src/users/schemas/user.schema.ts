import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { ROLES } from '../../common/constants';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true, collection: 'users' })
export class User {
  // Identificador para el login. Siempre en minusculas para que no haya
  // dos usuarios "Juan" y "juan".
  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  username!: string;

  @Prop({ required: true })
  passwordHash!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, trim: true })
  lastName!: string;

  // Email opcional: por ahora no lo usamos para nada obligatorio, queda
  // para recuperar la contrasena mas adelante.
  @Prop({ lowercase: true, trim: true, sparse: true })
  email?: string;

  // Sector / servicio del hospital. Es texto libre porque cada hospital
  // los nombra distinto; la app ofrece una lista de sugerencias.
  @Prop({ required: true, trim: true, index: true })
  sector!: string;

  // 'none' es el estado inicial: el usuario se registro pero todavia no
  // lo aprobo el admin, asi que no puede entrar a la app.
  @Prop({ enum: ROLES, default: 'none', index: true })
  role!: string;

  // Se incrementa cuando queremos invalidar las sesiones abiertas de este
  // usuario (por ejemplo si el admin le cambia el rol). El JWT lleva esta
  // version adentro y la estrategia la compara con la de la base: si el
  // token quedo viejo, devuelve 401 y la app cierra sesion sola.
  @Prop({ default: 0 })
  tokenVersion!: number;
}

export const UserSchema = SchemaFactory.createForClass(User);
