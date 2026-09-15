import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { SwapRequest, SwapRequestDocument } from './schemas/swap-request.schema';
import { Shift, ShiftDocument } from '../shifts/schemas/shift.schema';
import { CreateSwapDto } from './dto/create-swap.dto';
import { QuerySwapsDto } from './dto/query-swaps.dto';
import { UsersService } from '../users/users.service';

/** Resumen de una guardia dentro de una solicitud. */
export interface GuardiaResumen {
  id: string;
  start: string;
  end: string;
  hours: number;
  type: string;
  sector: string;
}

export interface SolicitudPublica {
  id: string;
  status: string;
  message?: string;
  createdAt: string;
  respondedAt?: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  fromShift: GuardiaResumen | null;
  toShift: GuardiaResumen | null;
  /** true si el usuario actual es el que tiene que responder. */
  paraResponder: boolean;
}

@Injectable()
export class SwapsService {
  constructor(
    @InjectModel(SwapRequest.name)
    private readonly swapModel: Model<SwapRequestDocument>,
    @InjectModel(Shift.name)
    private readonly shiftModel: Model<ShiftDocument>,
    private readonly usersService: UsersService,
  ) {}

  private resumir(shift: any): GuardiaResumen | null {
    if (!shift) return null;
    return {
      id: shift._id.toString(),
      start: new Date(shift.start).toISOString(),
      end: new Date(shift.end).toISOString(),
      hours: shift.hours,
      type: shift.type,
      sector: shift.sector,
    };
  }

  private async mapaDeNombres(): Promise<Map<string, string>> {
    const usuarios = await this.usersService.listApproved();
    return new Map(usuarios.map((u) => [u.id, `${u.name} ${u.lastName}`]));
  }

  /**
   * Chequea que meter `shift` en la agenda de `nuevoDueño` no se pise con
   * otra guardia que esa persona ya tenga.
   *
   * Es el control más importante del intercambio: sin esto, dos personas se
   * cambian guardias y una queda con dos al mismo tiempo.
   */
  private async chequearSolapeDestino(
    nuevoDueño: Types.ObjectId,
    shift: ShiftDocument,
    idsIgnorados: Types.ObjectId[],
  ) {
    const choque = await this.shiftModel
      .findOne({
        userId: nuevoDueño,
        _id: { $nin: idsIgnorados },
        start: { $lt: shift.end },
        end: { $gt: shift.start },
      })
      .lean()
      .exec();

    if (choque) {
      const cuando = new Date(shift.start).toLocaleDateString('es-AR');
      throw new BadRequestException(
        `No se puede aceptar: la guardia del ${cuando} se pisa con otra que ya tiene esa persona`,
      );
    }
  }

  async create(userId: string, dto: CreateSwapDto): Promise<SolicitudPublica> {
    const miId = new Types.ObjectId(userId);

    // 1. La guardia que ofrezco tiene que ser mía.
    const mia = await this.shiftModel.findById(dto.fromShiftId).exec();
    if (!mia) throw new NotFoundException('No encontré la guardia que querés ofrecer');
    if (mia.userId.toString() !== userId) {
      throw new ForbiddenException('Solo podés ofrecer guardias tuyas');
    }

    // 2. Resolver a quién se la mando.
    let destinatario: Types.ObjectId;
    let ajena: ShiftDocument | null = null;

    if (dto.toShiftId) {
      ajena = await this.shiftModel.findById(dto.toShiftId).exec();
      if (!ajena) throw new NotFoundException('No encontré la guardia que pedís');
      if (ajena.userId.toString() === userId) {
        throw new BadRequestException('Esa guardia ya es tuya');
      }
      destinatario = ajena.userId;
    } else {
      if (!dto.toUserId) {
        throw new BadRequestException('Elegí a qué compañero querés pasarle la guardia');
      }
      if (dto.toUserId === userId) {
        throw new BadRequestException('No podés mandarte una solicitud a vos mismo');
      }
      // Si el usuario no existe, findById tira 404.
      await this.usersService.findById(dto.toUserId);
      destinatario = new Types.ObjectId(dto.toUserId);
    }

    // 3. No repetir una solicitud pendiente sobre las mismas guardias.
    const yaHay = await this.swapModel
      .findOne({
        status: 'pending',
        $or: [
          { fromShiftId: mia._id },
          ...(ajena ? [{ toShiftId: ajena._id }] : []),
        ],
      })
      .lean()
      .exec();

    if (yaHay) {
      throw new BadRequestException(
        'Ya hay una solicitud pendiente sobre alguna de esas guardias',
      );
    }

    const creada = await this.swapModel.create({
      fromUserId: miId,
      toUserId: destinatario,
      fromShiftId: mia._id,
      toShiftId: ajena?._id,
      status: 'pending',
      message: dto.message?.trim(),
    });

    return this.armarPublica(creada, userId);
  }

  private async armarPublica(
    solicitud: SwapRequestDocument,
    usuarioActual: string,
  ): Promise<SolicitudPublica> {
    const [nombres, fromShift, toShift] = await Promise.all([
      this.mapaDeNombres(),
      this.shiftModel.findById(solicitud.fromShiftId).lean().exec(),
      solicitud.toShiftId
        ? this.shiftModel.findById(solicitud.toShiftId).lean().exec()
        : Promise.resolve(null),
    ]);

    const from = solicitud.fromUserId.toString();
    const to = solicitud.toUserId.toString();

    return {
      id: solicitud._id.toString(),
      status: solicitud.status,
      message: solicitud.message,
      createdAt: (solicitud as any).createdAt?.toISOString?.() ?? new Date().toISOString(),
      respondedAt: solicitud.respondedAt?.toISOString(),
      fromUserId: from,
      fromUserName: nombres.get(from) ?? 'Compañero',
      toUserId: to,
      toUserName: nombres.get(to) ?? 'Compañero',
      fromShift: this.resumir(fromShift),
      toShift: this.resumir(toShift),
      paraResponder: to === usuarioActual && solicitud.status === 'pending',
    };
  }

  async list(userId: string, query: QuerySwapsDto): Promise<SolicitudPublica[]> {
    const miId = new Types.ObjectId(userId);

    const filtro: Record<string, unknown> = {};
    if (query.box === 'recibidas') filtro.toUserId = miId;
    else if (query.box === 'enviadas') filtro.fromUserId = miId;
    else filtro.$or = [{ toUserId: miId }, { fromUserId: miId }];

    if (query.status) filtro.status = query.status;

    const solicitudes = await this.swapModel
      .find(filtro)
      .sort({ createdAt: -1 })
      .limit(100)
      .exec();

    return Promise.all(solicitudes.map((s) => this.armarPublica(s, userId)));
  }

  /** Cuántas solicitudes pendientes tengo por responder (para el badge). */
  async contarPendientes(userId: string): Promise<{ pendientes: number }> {
    const pendientes = await this.swapModel.countDocuments({
      toUserId: new Types.ObjectId(userId),
      status: 'pending',
    });
    return { pendientes };
  }

  private async traerPendiente(id: string): Promise<SwapRequestDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Id de solicitud inválido');
    }
    const solicitud = await this.swapModel.findById(id).exec();
    if (!solicitud) throw new NotFoundException('No encontré esa solicitud');
    if (solicitud.status !== 'pending') {
      throw new BadRequestException('Esa solicitud ya fue respondida');
    }
    return solicitud;
  }

  /**
   * Aceptar: las guardias cambian de dueño.
   *
   * Si hay dos guardias, se intercambian. Si hay una sola, se transfiere.
   * Antes de tocar nada verificamos que ninguno de los dos quede con
   * guardias superpuestas.
   */
  async accept(userId: string, id: string): Promise<SolicitudPublica> {
    const solicitud = await this.traerPendiente(id);

    if (solicitud.toUserId.toString() !== userId) {
      throw new ForbiddenException('Esa solicitud no es tuya para responder');
    }

    const mia = await this.shiftModel.findById(solicitud.fromShiftId).exec();
    if (!mia) {
      throw new BadRequestException('La guardia ofrecida ya no existe. Rechazá la solicitud.');
    }

    const ajena = solicitud.toShiftId
      ? await this.shiftModel.findById(solicitud.toShiftId).exec()
      : null;

    if (solicitud.toShiftId && !ajena) {
      throw new BadRequestException('Tu guardia ya no existe. Rechazá la solicitud.');
    }

    const emisor = solicitud.fromUserId;
    const receptor = solicitud.toUserId;

    // Las guardias que se están moviendo no cuentan como choque entre ellas.
    const enJuego = [mia._id, ...(ajena ? [ajena._id] : [])];

    // La guardia del emisor pasa al receptor.
    await this.chequearSolapeDestino(receptor, mia, enJuego);
    // Y si hay intercambio, la del receptor pasa al emisor.
    if (ajena) await this.chequearSolapeDestino(emisor, ajena, enJuego);

    // Recién acá tocamos los datos. Si el segundo guardado fallara,
    // deshacemos el primero para no dejar las guardias a medio cambiar.
    const dueñoOriginal = mia.userId;
    mia.userId = receptor;
    await mia.save();

    if (ajena) {
      try {
        ajena.userId = emisor;
        await ajena.save();
      } catch (err) {
        mia.userId = dueñoOriginal;
        await mia.save();
        throw err;
      }
    }

    solicitud.status = 'accepted';
    solicitud.respondedAt = new Date();
    await solicitud.save();

    // Cualquier otra solicitud pendiente sobre estas guardias queda sin
    // sentido: las cancelamos para que nadie acepte algo que ya cambió.
    await this.swapModel.updateMany(
      {
        _id: { $ne: solicitud._id },
        status: 'pending',
        $or: [
          { fromShiftId: { $in: enJuego } },
          { toShiftId: { $in: enJuego } },
        ],
      },
      { $set: { status: 'cancelled', respondedAt: new Date() } },
    );

    return this.armarPublica(solicitud, userId);
  }

  async reject(userId: string, id: string): Promise<SolicitudPublica> {
    const solicitud = await this.traerPendiente(id);
    if (solicitud.toUserId.toString() !== userId) {
      throw new ForbiddenException('Esa solicitud no es tuya para responder');
    }
    solicitud.status = 'rejected';
    solicitud.respondedAt = new Date();
    await solicitud.save();
    return this.armarPublica(solicitud, userId);
  }

  /** Cancelar: solo la puede cancelar quien la mandó. */
  async cancel(userId: string, id: string): Promise<SolicitudPublica> {
    const solicitud = await this.traerPendiente(id);
    if (solicitud.fromUserId.toString() !== userId) {
      throw new ForbiddenException('Solo podés cancelar las solicitudes que mandaste vos');
    }
    solicitud.status = 'cancelled';
    solicitud.respondedAt = new Date();
    await solicitud.save();
    return this.armarPublica(solicitud, userId);
  }
}
