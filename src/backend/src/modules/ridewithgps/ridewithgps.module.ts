import { Module } from '@nestjs/common';
import { RidewithgpsService } from './ridewithgps.service';
import { RidewithgpsController } from './ridewithgps.controller';
import { ActivitiesModule } from '../activities/activities.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [ActivitiesModule, StorageModule],
  providers: [RidewithgpsService],
  controllers: [RidewithgpsController],
})
export class RidewithgpsModule {}
