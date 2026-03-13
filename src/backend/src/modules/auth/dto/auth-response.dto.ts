import { ApiProperty } from '@nestjs/swagger';

export class AuthResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty()
  userId: string;

  @ApiProperty({ enum: ['member', 'admin'] })
  role: string;
}
