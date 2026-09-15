import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Rate, RateDocument } from './schemas/rate.schema';
import { CreateRateDto } from './dto/create-rate.dto';

export interface TarifaPublica {
  id: string;
  validFrom: string;
  mode: string;
  hourlyRate: number;
  price12h: number;
  price24h: number;
  pricePasiva: number;
  priceOtra: number;
}

@Injectable()
export class RatesService {
  constructor(
    @InjectModel(Rate.name) private readonly rateModel: Model<RateDocument>,
  ) {}

  private toPublic(r: any): TarifaPublica {
    return {
      id: r._id.toString(),
      validFrom: r.validFrom,
      mode: r.mode,
      hourlyRate: r.hourlyRate ?? 0,
      price12h: r.price12h ?? 0,
      price24h: r.price24h ?? 0,
      pricePasiva: r.pricePasiva ?? 0,
      priceOtra: r.priceOtra ?? 0,
    };
  }

  /** Todas mis tarifas, de la más nueva a la más vieja. */
  async listMine(userId: string): Promise<TarifaPublica[]> {
    const tarifas = await this.rateModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ validFrom: -1 })
      .lean()
      .exec();
    return tarifas.map((t) => this.toPublic(t));
  }

  /**
   * Tarifa que rige para un mes dado: la de validFrom más grande que sea
   * menor o igual a ese mes.
   *
   * Devuelve null si el usuario todavía no cargó ninguna tarifa que aplique
   * (por ejemplo, si mira un mes anterior a su primera tarifa).
   */
  async vigentePara(userId: string, mes: string): Promise<TarifaPublica | null> {
    const tarifa = await this.rateModel
      .findOne({
        userId: new Types.ObjectId(userId),
        validFrom: { $lte: mes },
      })
      .sort({ validFrom: -1 })
      .lean()
      .exec();

    return tarifa ? this.toPublic(tarifa) : null;
  }

  /**
   * Guarda una tarifa. Si ya existe una que arranca ese mismo mes, la pisa
   * (es lo que espera el usuario cuando corrige un valor recién cargado).
   */
  async upsert(userId: string, dto: CreateRateDto): Promise<TarifaPublica> {
    if (dto.mode === 'hora' && !dto.hourlyRate) {
      throw new BadRequestException('Cargá el valor por hora');
    }
    if (
      dto.mode === 'guardia' &&
      !dto.price12h &&
      !dto.price24h &&
      !dto.pricePasiva &&
      !dto.priceOtra
    ) {
      throw new BadRequestException('Cargá al menos un precio por tipo de guardia');
    }

    const guardada = await this.rateModel
      .findOneAndUpdate(
        { userId: new Types.ObjectId(userId), validFrom: dto.validFrom },
        {
          $set: {
            mode: dto.mode,
            hourlyRate: dto.hourlyRate ?? 0,
            price12h: dto.price12h ?? 0,
            price24h: dto.price24h ?? 0,
            pricePasiva: dto.pricePasiva ?? 0,
            priceOtra: dto.priceOtra ?? 0,
          },
        },
        { new: true, upsert: true },
      )
      .lean()
      .exec();

    return this.toPublic(guardada);
  }

  async remove(userId: string, id: string): Promise<{ ok: true }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Id de tarifa inválido');
    }
    const borrada = await this.rateModel
      .findOneAndDelete({ _id: id, userId: new Types.ObjectId(userId) })
      .exec();

    if (!borrada) throw new NotFoundException('No encontré esa tarifa');
    return { ok: true };
  }
}
