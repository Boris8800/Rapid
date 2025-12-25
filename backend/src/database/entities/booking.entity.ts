import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { BookingStatus } from '../../shared/enums/booking-status.enum';

@Entity('bookings')
export class BookingEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'customer_id', type: 'uuid' })
  customerId!: string;

  @Index()
  @Column({ name: 'assigned_driver_id', type: 'uuid', nullable: true })
  assignedDriverId!: string | null;

  @Column({ name: 'vehicle_id', type: 'uuid', nullable: true })
  vehicleId!: string | null;

  @Index()
  @Column({
    type: 'enum',
    enum: BookingStatus,
    enumName: 'booking_status',
    default: BookingStatus.Created,
  })
  status!: BookingStatus;

  @Column({ name: 'scheduled_pickup_at', type: 'timestamptz', nullable: true })
  scheduledPickupAt!: Date | null;

  @Column({ name: 'estimated_distance_m', type: 'integer', nullable: true })
  estimatedDistanceM!: number | null;

  @Column({ name: 'estimated_duration_s', type: 'integer', nullable: true })
  estimatedDurationS!: number | null;

  @Column({ name: 'quoted_fare_pence', type: 'integer', nullable: true })
  quotedFarePence!: number | null;

  @Column({ name: 'final_fare_pence', type: 'integer', nullable: true })
  finalFarePence!: number | null;

  @Column({ type: 'char', length: 3, default: () => "'GBP'" })
  currency!: string;

  @Column({ name: 'promotion_id', type: 'uuid', nullable: true })
  promotionId!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
