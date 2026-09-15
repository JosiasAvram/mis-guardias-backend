import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Shift, ShiftDocument } from './schemas/shift.schema';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { QueryShiftsDto } from './dto/query-shifts.dto';
import { UsersService } from '../users/users.service';
import { claveMes, horasEntre } from '../common/utils/dates';

/** Guardia como la recibe la app, con los datos del dueño ya resueltos. */
export interface GuardiaPublica {
  id: string;
  userId: string;
  userName: string;
  start: string;
  end: string;
  hours: number;
  type: string;
  sector: string;
  notes?: string;
  monthKey: string;
  /** true si la guardia es del usuario que hizo el request. */
  mine: boolean;
}

// Una guardia mas larga que esto casi seguro es un error de carga.
const MAX_HORAS = 48;

@Injectable()
export class ShiftsService {
  constructor(
    @InjectModel(Shift.name) private readonly shiftModel: Model<ShiftDocument>,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Valida el par (inicio, fin) y devuelve las fechas ya convertidas.
   * Acá es donde se banca que la guardia cruce la medianoche: no comparamos
   * días, comparamos momentos.
   */
  private validarHorario(startISO: string, endISO: string) {
    const start = new Date(startISO);
    const end = new Date(endISO);

    if (end.getTime() <= start.getTime()) {
      throw new BadRequestException('La hora de fin tiene que ser posterior a la de inicio');
    }

    const hours = horasEntre(start, end);
    if (hours > MAX_HORAS) {
      throw new BadRequestException(
        `La guardia dura ${hours} horas. ¿No te equivocaste de día en el fin?`,
      );
    }

    return { start, end, hours };
  }

  /**
   * Busca si el usuario ya tiene otra guardia que se pise con esta.
   * Dos rangos se solapan si: inicioA < finB && inicioB < finA.
   */
  private async chequearSolape(
    userId: Types.ObjectId,
    start: Date,
    end: Date,
    ignorarId?: string,
  ) {
    const filtro: Record<string, unknown> = {
      userId,
      start: { $lt: end },
      end: { $gt: start },
    };
    if (ignorarId) filtro._id = { $ne: new Types.ObjectId(ignorarId) };

    const choque = await this.shiftModel.findOne(filtro).lean().exec();
    if (choque) {
      const desde = new Date(choque.start).toLocaleString('es-AR');
      throw new BadRequestException(
        `Ya tenés una guardia cargada que se pisa con esa (arranca el ${desde})`,
      );
    }
  }

  private toPublic(
    shift: ShiftDocument | (Shift & { _id: Types.ObjectId }),
    nombresPorId: Map<string, string>,
    usuarioActual: string,
  ): GuardiaPublica {
    const dueño = shift.userId.toString();
    return {
      id: shift._id.toString(),
      userId: dueño,
      userName: nombresPorId.get(dueño) ?? 'Compañero',
      start: new Date(shift.start).toISOString(),
      end: new Date(shift.end).toISOString(),
      hours: shift.hours,
      type: shift.type,
      sector: shift.sector,
      notes: shift.notes,
      monthKey: shift.monthKey,
      mine: dueño === usuarioActual,
    };
  }

  /** Arma un mapa id -> "Nombre Apellido" para no hacer un populate por guardia. */
  private async mapaDeNombres(): Promise<Map<string, string>> {
    const usuarios = await this.usersService.listApproved();
    return new Map(usuarios.map((u) => [u.id, `${u.name} ${u.lastName}`]));
  }

  async create(userId: string, dto: CreateShiftDto): Promise<GuardiaPublica> {
    const { start, end, hours } = this.validarHorario(dto.start, dto.end);
    const objectId = new Types.ObjectId(userId);

    await this.chequearSolape(objectId, start, end);

    // Si no mandan sector, usamos el del usuario.
    const usuario = await this.usersService.findById(userId);

    const creada = await this.shiftModel.create({
      userId: objectId,
      start,
      end,
      hours,
      type: dto.type ?? 'otra',
      sector: dto.sector?.trim() || usuario.sector,
      notes: dto.notes?.trim(),
      monthKey: claveMes(start),
      createdBy: objectId,
    });

    const nombres = await this.mapaDeNombres();
    return this.toPublic(creada, nombres, userId);
  }

  /** Guardias dentro de un rango de fechas, para pintar el calendario. */
  async findRange(usuarioActual: string, query: QueryShiftsDto): Promise<GuardiaPublica[]> {
    const from = new Date(query.from);
    const to = new Date(query.to);

    if (to.getTime() <= from.getTime()) {
      throw new BadRequestException('El rango de fechas está al revés');
    }

    // Traemos toda guardia que se superponga con el rango pedido, no solo
    // las que empiezan adentro: una guardia que arranca el 31 a las 22:00
    // tiene que aparecer aunque el rango empiece el 1ro.
    const filtro: Record<string, unknown> = {
      start: { $lt: to },
      end: { $gt: from },
    };

    if (query.userId) {
      const id = query.userId === 'me' ? usuarioActual : query.userId;
      if (!Types.ObjectId.isValid(id)) {
        throw new BadRequestException('El id de usuario no es válido');
      }
      filtro.userId = new Types.ObjectId(id);
    }

    if (query.sector) filtro.sector = query.sector;

    const guardias = await this.shiftModel.find(filtro).sort({ start: 1 }).lean().exec();
    const nombres = await this.mapaDeNombres();
    return guardias.map((g) => this.toPublic(g as any, nombres, usuarioActual));
  }

  async findOne(usuarioActual: string, id: string): Promise<GuardiaPublica> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Id de guardia inválido');
    }
    const guardia = await this.shiftModel.findById(id).lean().exec();
    if (!guardia) throw new NotFoundException('No encontré esa guardia');

    const nombres = await this.mapaDeNombres();
    return this.toPublic(guardia as any, nombres, usuarioActual);
  }

  /** Documento crudo + control de que sea del usuario. Uso interno. */
  private async traerPropia(id: string, userId: string): Promise<ShiftDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Id de guardia inválido');
    }
    const guardia = await this.shiftModel.findById(id).exec();
    if (!guardia) throw new NotFoundException('No encontré esa guardia');
    if (guardia.userId.toString() !== userId) {
      throw new ForbiddenException('Esa guardia no es tuya');
    }
    return guardia;
  }

  async update(userId: string, id: string, dto: UpdateShiftDto): Promise<GuardiaPublica> {
    const guardia = await this.traerPropia(id, userId);

    // Si tocan alguna de las dos fechas, revalidamos el par completo.
    if (dto.start || dto.end) {
      const { start, end, hours } = this.validarHorario(
        dto.start ?? guardia.start.toISOString(),
        dto.end ?? guardia.end.toISOString(),
      );
      await this.chequearSolape(guardia.userId, start, end, id);
      guardia.start = start;
      guardia.end = end;
      guardia.hours = hours;
      guardia.monthKey = claveMes(start);
    }

    if (dto.type !== undefined) guardia.type = dto.type;
    if (dto.sector !== undefined) guardia.sector = dto.sector.trim();
    if (dto.notes !== undefined) guardia.notes = dto.notes.trim();

    await guardia.save();

    const nombres = await this.mapaDeNombres();
    return this.toPublic(guardia, nombres, userId);
  }

  async remove(userId: string, id: string): Promise<{ ok: true }> {
    const guardia = await this.traerPropia(id, userId);
    await guardia.deleteOne();
    return { ok: true };
  }
}
