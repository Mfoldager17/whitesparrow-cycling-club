import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { RegistrationsService } from './registrations.service';
import { CreateRegistrationDto, UpdateRegistrationDto } from './dto/registration.dto';
import { RegistrationResponseDto } from './dto/registration-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('registrations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('activities/:activityId/registrations')
export class RegistrationsController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  @Get()
  @ApiParam({ name: 'activityId', type: String })
  @ApiOperation({ summary: 'List all registrations for an activity' })
  @ApiResponse({ status: 200, type: [RegistrationResponseDto] })
  getForActivity(
    @Param('activityId', ParseUUIDPipe) activityId: string,
  ): Promise<RegistrationResponseDto[]> {
    return this.registrationsService.getForActivity(activityId);
  }

  @Post()
  @ApiParam({ name: 'activityId', type: String })
  @ApiOperation({ summary: 'Register for an activity' })
  @ApiResponse({ status: 201, type: RegistrationResponseDto })
  register(
    @CurrentUser() user: User,
    @Param('activityId', ParseUUIDPipe) activityId: string,
    @Body() dto: CreateRegistrationDto,
  ): Promise<RegistrationResponseDto> {
    return this.registrationsService.register(user, activityId, dto);
  }

  @Patch('me')
  @ApiParam({ name: 'activityId', type: String })
  @ApiOperation({ summary: 'Update my registration note' })
  @ApiResponse({ status: 200, type: RegistrationResponseDto })
  update(
    @CurrentUser() user: User,
    @Param('activityId', ParseUUIDPipe) activityId: string,
    @Body() dto: UpdateRegistrationDto,
  ): Promise<RegistrationResponseDto> {
    return this.registrationsService.update(user, activityId, dto);
  }

  @Delete('me')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'activityId', type: String })
  @ApiOperation({ summary: 'Cancel my registration' })
  @ApiResponse({ status: 200, type: RegistrationResponseDto })
  cancel(
    @CurrentUser() user: User,
    @Param('activityId', ParseUUIDPipe) activityId: string,
  ): Promise<RegistrationResponseDto> {
    return this.registrationsService.cancel(user, activityId);
  }
}

@ApiTags('registrations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('registrations')
export class MyRegistrationsController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  @Get('mine')
  @ApiOperation({ summary: 'Get my own registrations' })
  @ApiResponse({ status: 200, type: [RegistrationResponseDto] })
  getMyRegistrations(@CurrentUser() user: User): Promise<RegistrationResponseDto[]> {
    return this.registrationsService.getMyRegistrations(user.id);
  }
}
