import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { TripStatus } from '../../shared/enums/trip-status.enum';

@Entity('trips')
export class TripEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ name: 'booking_id', type: 'uuid', unique: true })
  bookingId!: string;

  @Index()
  @Column({ name: 'driver_id', type: 'uuid' })
  driverId!: string;

  @Index()
  @Column({
    type: 'enum',
    enum: TripStatus,
    enumName: 'trip_status',
    default: TripStatus.Pending,
  })
  status!: TripStatus;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt!: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @Column({ name: 'distance_m', type: 'integer', nullable: true })
  distanceM!: number | null;

  @Column({ name: 'duration_s', type: 'integer', nullable: true })
  durationS!: number | null;

  @Column({ name: 'route_line', type: 'geography', spatialFeatureType: 'LineString', srid: 4326, nullable: true })
  routeLine!: { type: 'LineString'; coordinates: [number, number][] } | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
