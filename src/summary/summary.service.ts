import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Shift, ShiftDocument } from '../shifts/schemas/shift.schema';
import { RatesService, TarifaPublica } from '../rates/rates.service';

export interface GuardiaDelResumen {
  id: string;
  start: string;
  end: string;
  hours: number;
  type: string;
  sector: string;
  /** Cuánto se cobra por esta guardia con la tarifa del mes. */
  amount: number;
}

export interface ResumenMes {
  month: string;
  hours: number;
  shiftsCount: number;
  /** Horas y cantidad agrupadas por tipo de guardia. */
  byType: Record<string, { count: number; hours: number }>;
  rate: TarifaPublica | null;
  amount: number;
  shifts: GuardiaDelResumen[];
}

export interface ResumenAnio {
  year: number;
  months: { month: string; hours: number; shiftsCount: number; amount: number }[];
  totalHours: number;
  totalShifts: number;
  totalAmount: number;
}

@Injectable()
export class SummaryService {
  constructor(
    @InjectModel(Shift.name) private readonly shiftModel: Model<ShiftDocument>,
    private readonly ratesService: RatesService,
  ) {}

  /**
   * Cuánto se cobra una guardia según el modo de la tarifa.
   *
   *  'hora'    -> horas trabajadas por el valor de la hora
   *  'guardia' -> un precio fijo según el tipo
   *
   * Si no hay tarifa cargada devuelve 0: preferimos mostrar "cargá tu tarifa"
   * antes que inventar un número.
   */
  private calcularMonto(shift: { hours: number; type: string }, rate: TarifaPublica | null) {
    if (!rate) return 0;

    if (rate.mode === 'hora') {
      return Math.round(shift.hours * rate.hourlyRate);
    }

    const precios: Record<string, number> = {
      '12h': rate.price12h,
      '24h': rate.price24h,
      pasiva: rate.pricePasiva,
      otra: rate.priceOtra,
    };
    return Math.round(precios[shift.type] ?? rate.priceOtra ?? 0);
  }

  private validarMes(mes: string) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) {
      throw new BadRequestException('El mes tiene que tener el formato AAAA-MM');
    }
  }

  /**
   * Resumen de un mes.
   *
   * Agrupamos por monthKey, que se calcula con la fecha de INICIO de la
   * guardia. Entonces una guardia del 30/09 20:00 al 01/10 08:00 cuenta
   * entera en septiembre. Es como lo piensa la gente: "esa guardia la hice
   * el 30".
   */
  async mes(userId: string, mes: string): Promise<ResumenMes> {
    this.validarMes(mes);

    const [guardias, rate] = await Promise.all([
      this.shiftModel
        .find({ userId: new Types.ObjectId(userId), monthKey: mes })
        .sort({ start: 1 })
        .lean()
        .exec(),
      this.ratesService.vigentePara(userId, mes),
    ]);

    const byType: Record<string, { count: number; hours: number }> = {};
    let hours = 0;
    let amount = 0;

    const shifts: GuardiaDelResumen[] = guardias.map((g) => {
      const monto = this.calcularMonto(g, rate);
      hours += g.hours;
      amount += monto;

      const actual = byType[g.type] ?? { count: 0, hours: 0 };
      actual.count++;
      actual.hours = Math.round((actual.hours + g.hours) * 100) / 100;
      byType[g.type] = actual;

      return {
        id: g._id.toString(),
        start: new Date(g.start).toISOString(),
        end: new Date(g.end).toISOString(),
        hours: g.hours,
        type: g.type,
        sector: g.sector,
        amount: monto,
      };
    });

    return {
      month: mes,
      hours: Math.round(hours * 100) / 100,
      shiftsCount: guardias.length,
      byType,
      rate,
      amount,
      shifts,
    };
  }

  /**
   * Resumen de un año: los 12 meses, incluso los vacíos, para que el
   * gráfico no tenga huecos.
   *
   * Cada mes se calcula con SU tarifa vigente, no con la de hoy. Por eso
   * pedimos la tarifa mes por mes en vez de una sola vez.
   */
  async anio(userId: string, anio: number): Promise<ResumenAnio> {
    if (!Number.isInteger(anio) || anio < 2000 || anio > 2100) {
      throw new BadRequestException('Año inválido');
    }

    const guardias = await this.shiftModel
      .find({
        userId: new Types.ObjectId(userId),
        monthKey: { $regex: `^${anio}-` },
      })
      .lean()
      .exec();

    // Agrupamos las guardias por mes.
    const porMes = new Map<string, { hours: number; count: number; items: any[] }>();
    for (const g of guardias) {
      const actual = porMes.get(g.monthKey) ?? { hours: 0, count: 0, items: [] };
      actual.hours += g.hours;
      actual.count++;
      actual.items.push(g);
      porMes.set(g.monthKey, actual);
    }

    const months: ResumenAnio['months'] = [];
    let totalHours = 0;
    let totalShifts = 0;
    let totalAmount = 0;

    for (let m = 1; m <= 12; m++) {
      const clave = `${anio}-${String(m).padStart(2, '0')}`;
      const datos = porMes.get(clave);

      let amount = 0;
      if (datos) {
        const rate = await this.ratesService.vigentePara(userId, clave);
        amount = datos.items.reduce((suma, g) => suma + this.calcularMonto(g, rate), 0);
      }

      const hours = Math.round((datos?.hours ?? 0) * 100) / 100;
      months.push({ month: clave, hours, shiftsCount: datos?.count ?? 0, amount });

      totalHours += hours;
      totalShifts += datos?.count ?? 0;
      totalAmount += amount;
    }

    return {
      year: anio,
      months,
      totalHours: Math.round(totalHours * 100) / 100,
      totalShifts,
      totalAmount,
    };
  }
}
