import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BookingEntity } from '../../database/entities/booking.entity';
import { TripEntity } from '../../database/entities/trip.entity';
import { RealtimeModule } from '../realtime/realtime.module';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';

@Module({
  imports: [TypeOrmModule.forFeature([TripEntity, BookingEntity]), RealtimeModule],
  controllers: [TripsController],
  providers: [TripsService],
})
export class TripsModule {}
