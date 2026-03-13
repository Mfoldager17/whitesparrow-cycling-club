import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { UsersService } from './users.service';
import { AdminUpdateUserDto, UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: 'List all members (admin only)' })
  @ApiResponse({ status: 200, type: [UserResponseDto] })
  findAll(): Promise<UserResponseDto[]> {
    return this.usersService.findAll();
  }

  @Get('me')
  @ApiOperation({ summary: 'Get my own profile' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  getMe(@CurrentUser() user: User): Promise<UserResponseDto> {
    return this.usersService.findOne(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<UserResponseDto> {
    return this.usersService.findOne(id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update my own profile' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  updateMe(
    @CurrentUser() user: User,
    @Body() dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.updateSelf(user, user.id, dto);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Admin: update any user' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  adminUpdate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminUpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.adminUpdate(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Admin: deactivate a user' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  deactivate(@Param('id', ParseUUIDPipe) id: string): Promise<UserResponseDto> {
    return this.usersService.deactivate(id);
  }
}
