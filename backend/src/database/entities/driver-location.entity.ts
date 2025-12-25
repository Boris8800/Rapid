import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('driver_locations')
export class DriverLocationEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Index()
  @Column({ name: 'driver_id', type: 'uuid' })
  driverId!: string;

  @Column({ type: 'geography', spatialFeatureType: 'Point', srid: 4326 })
  location!: { type: 'Point'; coordinates: [number, number] };

  @Column({ name: 'heading_degrees', type: 'numeric', precision: 6, scale: 2, nullable: true })
  headingDegrees!: string | null;

  @Column({ name: 'speed_mps', type: 'numeric', precision: 8, scale: 3, nullable: true })
  speedMps!: string | null;

  @Column({ name: 'accuracy_m', type: 'numeric', precision: 8, scale: 3, nullable: true })
  accuracyM!: string | null;

  @Column({ name: 'recorded_at', type: 'timestamptz', default: () => 'now()' })
  recordedAt!: Date;
}
