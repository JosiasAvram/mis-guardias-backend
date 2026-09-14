/**
 * Crea el usuario admin inicial a partir de las variables del .env.
 * Se corre una sola vez con:  npm run seed
 *
 * Si el admin ya existe, no lo pisa: solo avisa y termina.
 */
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';
import mongoose from 'mongoose';

import { UserSchema } from '../users/schemas/user.schema';

dotenv.config();

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Falta MONGODB_URI en el .env');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Conectado a Mongo');

  const UserModel = mongoose.model('User', UserSchema);

  const username = (process.env.ADMIN_USERNAME ?? 'admin').toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? 'admin1234';

  const existente = await UserModel.findOne({ username });
  if (existente) {
    console.log(`El usuario "${username}" ya existe, no hago nada.`);
    await mongoose.disconnect();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await UserModel.create({
    username,
    passwordHash,
    name: process.env.ADMIN_NAME ?? 'Admin',
    lastName: process.env.ADMIN_LASTNAME ?? 'General',
    sector: process.env.ADMIN_SECTOR ?? 'Administracion',
    role: 'admin',
    tokenVersion: 0,
  });

  console.log(`Admin creado: usuario "${username}"`);
  console.log('Acordate de cambiar la contraseña desde la app.');

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Error en el seed:', err);
  process.exit(1);
});
