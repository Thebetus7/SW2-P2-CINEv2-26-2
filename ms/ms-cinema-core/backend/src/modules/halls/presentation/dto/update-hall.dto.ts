import { IsOptional, IsString } from 'class-validator';

export class UpdateHallDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  projectionType?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
