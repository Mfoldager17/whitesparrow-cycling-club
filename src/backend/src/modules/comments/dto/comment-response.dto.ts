import { ApiProperty } from '@nestjs/swagger';

export class CommentResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() activityId: string;
  @ApiProperty() userId: string;
  @ApiProperty() authorName: string;
  @ApiProperty({ nullable: true }) authorAvatarUrl: string | null;
  @ApiProperty() body: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
