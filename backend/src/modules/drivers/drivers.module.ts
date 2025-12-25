import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DriverLocationEntity } from '../../database/entities/driver-location.entity';
import { DriversController } from './drivers.controller';
import { DriverLocationsService } from './driver-locations.service';

@Module({
  imports: [TypeOrmModule.forFeature([DriverLocationEntity])],
  controllers: [DriversController],
  providers: [DriverLocationsService],
  exports: [DriverLocationsService],
})
export class DriversModule {}
