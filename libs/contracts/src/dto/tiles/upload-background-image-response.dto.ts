import { ApiProperty } from '@nestjs/swagger';
import { TileResponseDto } from './tile-response.dto';

export class UploadBackgroundImageResponseDto {
  @ApiProperty({
    description: 'Updated tile with new background image URL',
    type: TileResponseDto,
  })
  tile: TileResponseDto;

  @ApiProperty({
    description: 'URL of the uploaded background image',
    example: 'https://storage.example.com/tiles/tile123/background.webp',
  })
  imageUrl: string;
}
