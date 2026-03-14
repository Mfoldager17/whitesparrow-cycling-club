import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './database/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ActivitiesModule } from './modules/activities/activities.module';
import { RegistrationsModule } from './modules/registrations/registrations.module';
import { CommentsModule } from './modules/comments/comments.module';
import { StravaModule } from './modules/strava/strava.module';

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
  ],
})
export class AppModule {}
