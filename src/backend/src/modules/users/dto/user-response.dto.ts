import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  fullName: string;

  @ApiProperty({ nullable: true })
  phone: string | null;

  @ApiProperty({ enum: ['member', 'admin'] })
  role: string;

  @ApiProperty({ nullable: true })
  avatarUrl: string | null;

  @ApiProperty({ nullable: true })
  bio: string | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;
}
