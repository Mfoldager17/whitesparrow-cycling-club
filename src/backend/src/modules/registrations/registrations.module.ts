import { Module } from '@nestjs/common';
import { RegistrationsService } from './registrations.service';
import { RegistrationsController, MyRegistrationsController } from './registrations.controller';

@Module({
  providers: [RegistrationsService],
  controllers: [RegistrationsController, MyRegistrationsController],
})
export class RegistrationsModule {}
