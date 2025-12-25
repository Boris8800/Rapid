import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { DriverLocationEntity } from '../../database/entities/driver-location.entity';
import { UpdateDriverLocationDto } from './dto';

@Injectable()
export class DriverLocationsService {
  constructor(@InjectRepository(DriverLocationEntity) private readonly locations: Repository<DriverLocationEntity>) {}

  async record(driverId: string, dto: UpdateDriverLocationDto) {
    const entity = this.locations.create({
      driverId,
      location: { type: 'Point', coordinates: [dto.lon, dto.lat] },
      headingDegrees: dto.headingDegrees !== undefined ? String(dto.headingDegrees) : null,
      speedMps: dto.speedMps !== undefined ? String(dto.speedMps) : null,
      accuracyM: dto.accuracyM !== undefined ? String(dto.accuracyM) : null,
    });

    return this.locations.save(entity);
  }
}
