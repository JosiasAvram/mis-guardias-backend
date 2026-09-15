import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { User, UserDocument } from './schemas/user.schema';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { NotificationsService } from '../notifications/notifications.service';

/** Como devolvemos un usuario a la app (sin el hash de la contrasena). */
export interface UsuarioPublico {
  id: string;
  username: string;
  name: string;
  lastName: string;
  sector: string;
  role: string;
  email?: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly notifications: NotificationsService,
  ) {}

  /** Saca los campos sensibles antes de mandar el usuario a la app. */
  toPublic(user: UserDocument): UsuarioPublico {
    return {
      id: user._id.toString(),
      username: user.username,
      name: user.name,
      lastName: user.lastName,
      sector: user.sector,
      role: user.role,
      email: user.email,
    };
  }

  async findByUsername(username: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ username: username.toLowerCase().trim() }).exec();
  }

  async findById(id: string): Promise<UserDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Id de usuario inválido');
    }
    const user = await this.userModel.findById(id).exec();
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  /**
   * Datos minimos que necesita la estrategia JWT en cada request.
   * Devuelve null si el usuario ya no existe.
   */
  async getAuthState(id: string): Promise<{ role: string; tokenVersion: number } | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const user = await this.userModel
      .findById(id)
      .select('role tokenVersion')
      .lean()
      .exec();
    if (!user) return null;
    return { role: user.role, tokenVersion: user.tokenVersion ?? 0 };
  }

  async create(data: {
    username: string;
    passwordHash: string;
    name: string;
    lastName: string;
    sector: string;
    email?: string;
    role?: string;
  }): Promise<UserDocument> {
    const creado = new this.userModel({
      ...data,
      username: data.username.toLowerCase().trim(),
      role: data.role ?? 'none',
    });
    return creado.save();
  }

  /**
   * Lista de companieros para el filtro del calendario.
   * Solo devuelve usuarios aprobados (no los que estan esperando).
   */
  async listApproved(sector?: string): Promise<UsuarioPublico[]> {
    const filtro: Record<string, unknown> = { role: { $ne: 'none' } };
    if (sector) filtro.sector = sector;

    const users = await this.userModel
      .find(filtro)
      .sort({ lastName: 1, name: 1 })
      .exec();
    return users.map((u) => this.toPublic(u));
  }

  /** Sectores que existen hoy en la base, para armar el filtro de la app. */
  async listSectors(): Promise<string[]> {
    const sectores = await this.userModel.distinct('sector', { role: { $ne: 'none' } });
    return sectores.filter(Boolean).sort();
  }

  /** Usuarios esperando aprobacion (pantalla del admin). */
  async listPending(): Promise<UsuarioPublico[]> {
    const users = await this.userModel.find({ role: 'none' }).sort({ createdAt: 1 }).exec();
    return users.map((u) => this.toPublic(u));
  }

  async updateProfile(id: string, dto: UpdateProfileDto): Promise<UsuarioPublico> {
    const user = await this.findById(id);
    if (dto.name !== undefined) user.name = dto.name;
    if (dto.lastName !== undefined) user.lastName = dto.lastName;
    if (dto.sector !== undefined) user.sector = dto.sector;
    if (dto.email !== undefined) user.email = dto.email;
    await user.save();
    return this.toPublic(user);
  }

  /**
   * Cambia el rol de un usuario (aprobarlo, hacerlo admin, o volverlo a
   * dejar pendiente). Sube tokenVersion para que sus sesiones abiertas
   * se renueven con el rol nuevo.
   */
  async updateRole(id: string, role: string): Promise<UsuarioPublico> {
    const user = await this.findById(id);
    const estabaPendiente = user.role === 'none';

    user.role = role;
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    await user.save();

    // Si lo acaban de habilitar, le avisamos: puede estar esperando hace
    // rato en la pantalla de "esperando aprobación".
    if (estabaPendiente && role !== 'none') {
      await this.notifications.sendToUser(
        user._id,
        'Ya podés entrar',
        'Un administrador aprobó tu cuenta. Volvé a iniciar sesión.',
        { type: 'account-approved' },
      );
    }

    return this.toPublic(user);
  }

  async setPasswordHash(id: string, passwordHash: string): Promise<void> {
    const user = await this.findById(id);
    user.passwordHash = passwordHash;
    await user.save();
  }
}
