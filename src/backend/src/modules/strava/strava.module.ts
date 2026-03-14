import { Module } from '@nestjs/common';
import { StravaService } from './strava.service';
import { StravaController } from './strava.controller';
import { ActivitiesModule } from '../activities/activities.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [ActivitiesModule, StorageModule],
  providers: [StravaService],
  controllers: [StravaController],
})
export class StravaModule {}
