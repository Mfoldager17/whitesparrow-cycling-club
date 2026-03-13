import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegistrationResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() activityId: string;
  @ApiProperty() userId: string;
  @ApiProperty({ enum: ['registered', 'waitlisted', 'cancelled'] }) status: string;
  @ApiProperty({ nullable: true }) note: string | null;
  @ApiProperty() registeredAt: Date;

  // User fields (populated for activity participant list)
  @ApiPropertyOptional() userName?: string;
  @ApiPropertyOptional() userEmail?: string;

  // Activity fields (populated for /registrations/mine)
  @ApiPropertyOptional() title?: string;
  @ApiPropertyOptional() type?: string;
  @ApiPropertyOptional() startsAt?: Date;
  @ApiPropertyOptional({ nullable: true }) startLocation?: string | null;
  @ApiPropertyOptional({ nullable: true }) approxKm?: number | null;
  @ApiPropertyOptional({ nullable: true }) difficulty?: string | null;
  @ApiPropertyOptional() isCancelled?: boolean;
  @ApiPropertyOptional({ name: 'registrationStatus' }) registrationStatus?: string;
}
