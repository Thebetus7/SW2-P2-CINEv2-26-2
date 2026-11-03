import { IsString, IsNotEmpty, IsInt, Min, IsOptional, IsEnum } from 'class-validator';
import { ProjectionType } from '../../domain/cinema-hall.entity';

export class CreateHallDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsInt()
  @Min(1)
  totalRows: number;

  @IsInt()
  @Min(1)
  columnsPerRow: number;

  @IsOptional()
  @IsEnum(ProjectionType)
  projectionType?: ProjectionType;
}
