import { Module } from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { ActivitiesController } from './activities.controller';
import { GpxService } from './gpx.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  providers: [ActivitiesService, GpxService],
  controllers: [ActivitiesController],
})
export class ActivitiesModule {}
