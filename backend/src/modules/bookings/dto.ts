import { IsISO8601, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateBookingDto {
  @IsString()
  pickupAddress!: string;

  @IsString()
  dropoffAddress!: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  pickupLat!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  pickupLon!: number;

  @IsNumber()
  @Min(-90)
  @Max(90)
  dropoffLat!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  dropoffLon!: number;

  @IsOptional()
  @IsISO8601()
  scheduledPickupAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  pickupNotes?: string;

  @IsOptional()
  @IsString()
  dropoffNotes?: string;
}
