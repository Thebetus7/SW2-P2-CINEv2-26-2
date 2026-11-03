import { IsEnum, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { SeatType } from '../../domain/seat.entity';

export class UpdateSeatTypeDto {
  @IsEnum(SeatType)
  @IsNotEmpty()
  seatType: SeatType;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
