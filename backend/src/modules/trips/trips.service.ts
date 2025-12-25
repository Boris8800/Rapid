import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BookingEntity } from '../../database/entities/booking.entity';
import { TripEntity } from '../../database/entities/trip.entity';
import { BookingStatus } from '../../shared/enums/booking-status.enum';
import { TripStatus } from '../../shared/enums/trip-status.enum';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class TripsService {
  constructor(
    @InjectRepository(TripEntity) private readonly trips: Repository<TripEntity>,
    @InjectRepository(BookingEntity) private readonly bookings: Repository<BookingEntity>,
    private readonly realtime: RealtimeGateway,
  ) {}

  async assignDriver(adminUserId: string, bookingId: string, driverId: string) {
    void adminUserId;

    const booking = await this.bookings.findOne({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');

    if (booking.status === BookingStatus.Completed || booking.status === BookingStatus.Cancelled) {
      throw new BadRequestException('Booking not assignable');
    }

    booking.assignedDriverId = driverId;
    booking.status = BookingStatus.DriverAssigned;
    await this.bookings.save(booking);

    const existingTrip = await this.trips.findOne({ where: { bookingId } });
    if (existingTrip) {
      existingTrip.driverId = driverId;
      existingTrip.status = TripStatus.Pending;
      const updated = await this.trips.save(existingTrip);
      this.emitTripUpdate(booking, updated);
      return updated;
    }

    const trip = this.trips.create({
      bookingId,
      driverId,
      status: TripStatus.Pending,
      startedAt: null,
      completedAt: null,
      distanceM: null,
      durationS: null,
      routeLine: null,
    });

    const created = await this.trips.save(trip);
    this.emitTripUpdate(booking, created);
    return created;
  }

  async acceptTrip(driverId: string, tripId: string) {
    const trip = await this.trips.findOne({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Trip not found');
    if (trip.driverId !== driverId) throw new ForbiddenException();

    trip.status = TripStatus.Accepted;
    const updated = await this.trips.save(trip);

    const booking = await this.bookings.findOne({ where: { id: trip.bookingId } });
    if (booking) {
      booking.status = BookingStatus.Confirmed;
      await this.bookings.save(booking);
      this.emitTripUpdate(booking, updated);
    }

    return updated;
  }

  async startTrip(driverId: string, tripId: string) {
    const trip = await this.trips.findOne({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Trip not found');
    if (trip.driverId !== driverId) throw new ForbiddenException();

    trip.status = TripStatus.Started;
    trip.startedAt = trip.startedAt ?? new Date();
    const updated = await this.trips.save(trip);

    const booking = await this.bookings.findOne({ where: { id: trip.bookingId } });
    if (booking) {
      booking.status = BookingStatus.InProgress;
      await this.bookings.save(booking);
      this.emitTripUpdate(booking, updated);
    }

    return updated;
  }

  async completeTrip(driverId: string, tripId: string, distanceM?: number, durationS?: number) {
    const trip = await this.trips.findOne({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Trip not found');
    if (trip.driverId !== driverId) throw new ForbiddenException();

    trip.status = TripStatus.Completed;
    trip.completedAt = new Date();
    trip.distanceM = distanceM ?? trip.distanceM;
    trip.durationS = durationS ?? trip.durationS;

    const updated = await this.trips.save(trip);

    const booking = await this.bookings.findOne({ where: { id: trip.bookingId } });
    if (booking) {
      booking.status = BookingStatus.Completed;
      await this.bookings.save(booking);
      this.emitTripUpdate(booking, updated);
    }

    return updated;
  }

  async getTrip(tripId: string) {
    const trip = await this.trips.findOne({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Trip not found');
    return trip;
  }

  async listTripsForAdmin(limit = 50, offset = 0, status?: TripStatus) {
    const safeLimit = Math.min(Math.max(limit, 1), 200);
    const safeOffset = Math.max(offset, 0);

    const where = status ? { status } : {};
    return this.trips.find({
      where,
      order: { createdAt: 'DESC' },
      take: safeLimit,
      skip: safeOffset,
    });
  }

  async listTripsForDriver(driverId: string, limit = 50, offset = 0, status?: TripStatus) {
    const safeLimit = Math.min(Math.max(limit, 1), 200);
    const safeOffset = Math.max(offset, 0);

    const where = status ? { driverId, status } : { driverId };
    return this.trips.find({
      where,
      order: { createdAt: 'DESC' },
      take: safeLimit,
      skip: safeOffset,
    });
  }

  private emitTripUpdate(booking: BookingEntity, trip: TripEntity) {
    this.realtime.server?.to('admins').emit('trip.status.changed', {
      bookingId: booking.id,
      tripId: trip.id,
      driverId: trip.driverId,
      status: trip.status,
    });

    // If you later implement customer-specific rooms, target them here.
    this.realtime.server?.to('customers').emit('driver.assigned', {
      bookingId: booking.id,
      driverId: booking.assignedDriverId,
      status: booking.status,
    });

    this.realtime.server?.to('drivers').emit('trip.assigned', {
      tripId: trip.id,
      bookingId: booking.id,
    });
  }
}
