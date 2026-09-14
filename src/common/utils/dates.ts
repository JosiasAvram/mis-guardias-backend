/**
 * Helpers de fechas.
 *
 * Todo se guarda en Mongo en UTC (asi trabaja Date por defecto), pero la app
 * la usa gente en Argentina, que esta siempre en UTC-3 y NO tiene horario de
 * verano. Entonces para saber "a que dia / a que mes pertenece una guardia"
 * convertimos a hora local con ese offset fijo.
 *
 * Ejemplo del problema que esto resuelve: una guardia que arranca el 31/07 a
 * las 22:00 en Argentina se guarda como 01/08 01:00 UTC. Si contaramos el mes
 * directo desde UTC, esa guardia caeria en agosto cuando en realidad la
 * persona la empezo en julio.
 */

export const TZ_OFFSET_HOURS = -3;

const MS_POR_HORA = 60 * 60 * 1000;

/** Devuelve la misma fecha corrida al huso horario local (UTC-3). */
export function aHoraLocal(fecha: Date): Date {
  return new Date(fecha.getTime() + TZ_OFFSET_HOURS * MS_POR_HORA);
}

/** Clave de dia local: 'YYYY-MM-DD'. Sirve para agrupar por fecha. */
export function claveDia(fecha: Date): string {
  return aHoraLocal(fecha).toISOString().slice(0, 10);
}

/** Clave de mes local: 'YYYY-MM'. Sirve para los resumenes mensuales. */
export function claveMes(fecha: Date): string {
  return claveDia(fecha).slice(0, 7);
}

/**
 * Horas entre dos fechas, redondeadas a 2 decimales.
 * Funciona igual si la guardia cruza la medianoche, porque restamos
 * timestamps y no dias.
 */
export function horasEntre(inicio: Date, fin: Date): number {
  const horas = (fin.getTime() - inicio.getTime()) / MS_POR_HORA;
  return Math.round(horas * 100) / 100;
}

/**
 * Limites de un mes en UTC, a partir de 'YYYY-MM' local.
 * Devuelve { desde, hasta } para usar en la query de Mongo:
 *   start >= desde && start < hasta
 */
export function rangoDelMes(mes: string): { desde: Date; hasta: Date } {
  const [anio, mesNum] = mes.split('-').map(Number);
  // Date.UTC(anio, mes-1, 1) es el 1ro a las 00:00 UTC; le restamos el offset
  // para que sea el 1ro a las 00:00 hora local.
  const desde = new Date(Date.UTC(anio, mesNum - 1, 1) - TZ_OFFSET_HOURS * MS_POR_HORA);
  const hasta = new Date(Date.UTC(anio, mesNum, 1) - TZ_OFFSET_HOURS * MS_POR_HORA);
  return { desde, hasta };
}

/** Limites de un anio completo en UTC, a partir de un numero de anio. */
export function rangoDelAnio(anio: number): { desde: Date; hasta: Date } {
  const desde = new Date(Date.UTC(anio, 0, 1) - TZ_OFFSET_HOURS * MS_POR_HORA);
  const hasta = new Date(Date.UTC(anio + 1, 0, 1) - TZ_OFFSET_HOURS * MS_POR_HORA);
  return { desde, hasta };
}
