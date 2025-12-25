import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class AssignDriverDto {
  @IsString()
  driverId!: string;
}

export class CompleteTripDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  distanceM?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  durationS?: number;
}
