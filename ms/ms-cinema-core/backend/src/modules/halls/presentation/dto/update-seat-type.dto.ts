import { IsEnum, IsOptional, IsBoolean, IsString, MaxLength } from 'class-validator';
import { SeatType } from '../../domain/seat.entity';

export class UpdateSeatTypeDto {
  @IsOptional()
  @IsEnum(SeatType)
  seatType?: SeatType;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  visibleCode?: string;
}

