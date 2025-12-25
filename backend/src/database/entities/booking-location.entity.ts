import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('booking_locations')
export class BookingLocationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ name: 'booking_id', type: 'uuid', unique: true })
  bookingId!: string;

  @Column({ name: 'pickup_address', type: 'text' })
  pickupAddress!: string;

  @Column({ name: 'dropoff_address', type: 'text' })
  dropoffAddress!: string;

  // Stored as PostGIS geography(Point,4326)
  @Column({ name: 'pickup_point', type: 'geography', spatialFeatureType: 'Point', srid: 4326 })
  pickupPoint!: { type: 'Point'; coordinates: [number, number] };

  @Column({ name: 'dropoff_point', type: 'geography', spatialFeatureType: 'Point', srid: 4326 })
  dropoffPoint!: { type: 'Point'; coordinates: [number, number] };

  @Column({ name: 'pickup_notes', type: 'text', nullable: true })
  pickupNotes!: string | null;

  @Column({ name: 'dropoff_notes', type: 'text', nullable: true })
  dropoffNotes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
