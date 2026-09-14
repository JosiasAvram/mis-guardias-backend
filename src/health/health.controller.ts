import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

/**
 * Endpoint de salud: GET /api/v1/health
 *
 * Render lo usa para saber si el servicio esta vivo, y a vos te sirve para
 * confirmar de un vistazo que la API levanto y que se conecto a Mongo.
 * No pide token a proposito.
 */
@ApiTags('health')
@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(@InjectConnection() private readonly conexion: Connection) {}

  @Get()
  @ApiOperation({ summary: 'Estado del servicio y de la base' })
  check() {
    // readyState: 0 desconectada, 1 conectada, 2 conectando, 3 desconectando
    const estados = ['desconectada', 'conectada', 'conectando', 'desconectando'];
    return {
      ok: true,
      db: estados[this.conexion.readyState] ?? 'desconocido',
      hora: new Date().toISOString(),
    };
  }
}
