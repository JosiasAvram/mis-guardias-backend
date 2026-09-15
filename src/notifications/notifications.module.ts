import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { PushToken, PushTokenSchema } from './schemas/push-token.schema';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: PushToken.name, schema: PushTokenSchema }]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  // SwapsModule y UsersModule lo usan para avisar de solicitudes y aprobaciones.
  exports: [NotificationsService],
})
export class NotificationsModule {}
