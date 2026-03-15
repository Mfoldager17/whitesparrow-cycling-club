import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './database/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ActivitiesModule } from './modules/activities/activities.module';
import { RegistrationsModule } from './modules/registrations/registrations.module';
import { CommentsModule } from './modules/comments/comments.module';
import { StravaModule } from './modules/strava/strava.module';
import { RidewithgpsModule } from './modules/ridewithgps/ridewithgps.module';
import { RoutesModule } from './modules/routes/routes.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ActivitiesModule,
    RegistrationsModule,
    CommentsModule,
    StravaModule,
    RidewithgpsModule,
    RoutesModule,
  ],
})
export class AppModule {}
