import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { BookingEntity } from '../../database/entities/booking.entity';
import { BookingLocationEntity } from '../../database/entities/booking-location.entity';
import { BookingStatus } from '../../shared/enums/booking-status.enum';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CreateBookingDto } from './dto';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(BookingEntity) private readonly bookings: Repository<BookingEntity>,
    @InjectRepository(BookingLocationEntity) private readonly locations: Repository<BookingLocationEntity>,
    private readonly realtime: RealtimeGateway,
  ) {}

  async createBooking(customerId: string, dto: CreateBookingDto) {
    const booking = this.bookings.create({
      customerId,
      status: BookingStatus.Created,
      scheduledPickupAt: dto.scheduledPickupAt ? new Date(dto.scheduledPickupAt) : null,
      notes: dto.notes ?? null,
      currency: 'GBP',
    });

    const created = await this.bookings.save(booking);

    const location = this.locations.create({
      bookingId: created.id,
      pickupAddress: dto.pickupAddress,
      dropoffAddress: dto.dropoffAddress,
      pickupPoint: { type: 'Point', coordinates: [dto.pickupLon, dto.pickupLat] },
      dropoffPoint: { type: 'Point', coordinates: [dto.dropoffLon, dto.dropoffLat] },
      pickupNotes: dto.pickupNotes ?? null,
      dropoffNotes: dto.dropoffNotes ?? null,
    });

    await this.locations.save(location);

    this.realtime.server?.to('admins').emit('new.booking.alert', {
      bookingId: created.id,
      customerId,
      pickupAddress: dto.pickupAddress,
      dropoffAddress: dto.dropoffAddress,
      createdAt: created.createdAt,
    });

    return {
      ...created,
      location,
    };
  }

  async getBooking(id: string) {
    const booking = await this.bookings.findOne({ where: { id } });
    if (!booking) throw new NotFoundException('Booking not found');

    const location = await this.locations.findOne({ where: { bookingId: id } });

    return {
      ...booking,
      location,
    };
  }

  async listBookingsForCustomer(customerId: string, limit = 50, offset = 0) {
    const safeLimit = Math.min(Math.max(limit, 1), 200);
    const safeOffset = Math.max(offset, 0);

    const bookings = await this.bookings.find({
      where: { customerId },
      order: { createdAt: 'DESC' },
      take: safeLimit,
      skip: safeOffset,
    });

    const ids = bookings.map((b) => b.id);
    const locations = ids.length
      ? await this.locations.find({ where: { bookingId: In(ids) } })
      : [];
    const byBookingId = new Map(locations.map((l) => [l.bookingId, l] as const));

    return bookings.map((b) => ({ ...b, location: byBookingId.get(b.id) ?? null }));
  }

  async listBookingsForAdmin(limit = 50, offset = 0) {
    const safeLimit = Math.min(Math.max(limit, 1), 200);
    const safeOffset = Math.max(offset, 0);

    const bookings = await this.bookings.find({
      order: { createdAt: 'DESC' },
      take: safeLimit,
      skip: safeOffset,
    });

    const ids = bookings.map((b) => b.id);
    const locations = ids.length
      ? await this.locations.find({ where: { bookingId: In(ids) } })
      : [];
    const byBookingId = new Map(locations.map((l) => [l.bookingId, l] as const));

    return bookings.map((b) => ({ ...b, location: byBookingId.get(b.id) ?? null }));
  }
}
