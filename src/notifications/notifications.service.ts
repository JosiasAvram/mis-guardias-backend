import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';

import { PushToken, PushTokenDocument } from './schemas/push-token.schema';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly expo = new Expo();

  constructor(
    @InjectModel(PushToken.name)
    private readonly tokenModel: Model<PushTokenDocument>,
  ) {}

  /**
   * Guarda el token del celular para este usuario.
   *
   * Si el mismo aparato ya tenía un token de otra persona (porque se
   * deslogueó y entró otra), lo borramos: si no, las notificaciones del
   * usuario anterior seguirían llegando a ese celular.
   */
  async registerToken(
    userId: string,
    token: string,
    platform = 'android',
    deviceId?: string,
  ) {
    if (!Expo.isExpoPushToken(token)) {
      throw new BadRequestException('El token de notificaciones no es válido');
    }

    if (deviceId) {
      await this.tokenModel.deleteMany({ deviceId, token: { $ne: token } }).exec();
    }

    await this.tokenModel
      .findOneAndUpdate(
        { token },
        { userId: new Types.ObjectId(userId), token, platform, deviceId, active: true },
        { upsert: true, new: true },
      )
      .exec();

    return { ok: true };
  }

  /** Al cerrar sesión, para no seguir recibiendo avisos ajenos. */
  async unregisterToken(token: string) {
    await this.tokenModel.deleteOne({ token }).exec();
    return { ok: true };
  }

  /**
   * Manda una notificación a todos los dispositivos de una persona.
   *
   * Nunca tira error hacia afuera: si las push fallan (sin credenciales de
   * Firebase, sin internet, token vencido), el intercambio de guardias tiene
   * que funcionar igual. La notificación es un extra, no parte de la
   * operación.
   */
  async sendToUser(
    userId: string | Types.ObjectId,
    title: string,
    body: string,
    data: Record<string, unknown> = {},
  ) {
    try {
      const tokens = await this.tokenModel
        .find({ userId: new Types.ObjectId(userId.toString()), active: true })
        .lean()
        .exec();

      if (tokens.length === 0) return { sent: 0 };

      const messages: ExpoPushMessage[] = tokens
        .filter((t) => Expo.isExpoPushToken(t.token))
        .map((t) => ({
          to: t.token,
          sound: 'default',
          title,
          body,
          data,
          channelId: 'default',
        }));

      const tickets: ExpoPushTicket[] = [];
      for (const chunk of this.expo.chunkPushNotifications(messages)) {
        try {
          tickets.push(...(await this.expo.sendPushNotificationsAsync(chunk)));
        } catch (err) {
          this.logger.error('Error mandando notificaciones:', err);
        }
      }

      // Si Expo nos dice que un celular ya no tiene la app, apagamos ese token.
      const muertos: string[] = [];
      tickets.forEach((ticket, i) => {
        if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
          muertos.push(messages[i].to as string);
        }
      });
      if (muertos.length > 0) {
        await this.tokenModel
          .updateMany({ token: { $in: muertos } }, { active: false })
          .exec();
      }

      return { sent: messages.length, invalid: muertos.length };
    } catch (err) {
      this.logger.error('No se pudo notificar:', err);
      return { sent: 0 };
    }
  }
}
