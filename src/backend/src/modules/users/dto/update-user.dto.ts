import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({ example: 'Lars Andersen', required: false })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiProperty({ example: '+45 20 12 34 56', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: 'https://example.com/avatar.jpg', required: false })
  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @ApiProperty({ example: 'Passioneret cyklist fra København', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  bio?: string;
}

export class AdminUpdateUserDto extends UpdateUserDto {
  @ApiProperty({ enum: ['member', 'admin'], required: false })
  @IsString()
  @IsOptional()
  role?: 'member' | 'admin';

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
