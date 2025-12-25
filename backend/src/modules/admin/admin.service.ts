import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcrypt';
import { Repository } from 'typeorm';

import { UserEntity } from '../../database/entities/user.entity';
import { BookingEntity } from '../../database/entities/booking.entity';
import { TripEntity } from '../../database/entities/trip.entity';
import { Role } from '../../shared/enums/roles.enum';
import { UserStatus } from '../../shared/enums/user-status.enum';
import { BookingStatus } from '../../shared/enums/booking-status.enum';
import { TripStatus } from '../../shared/enums/trip-status.enum';
import { BootstrapDto, CreateUserDto } from './dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(UserEntity) private readonly users: Repository<UserEntity>,
    @InjectRepository(BookingEntity) private readonly bookings: Repository<BookingEntity>,
    @InjectRepository(TripEntity) private readonly trips: Repository<TripEntity>,
  ) {}

  async bootstrapSuperadmin(dto: BootstrapDto) {
    const expected = process.env.BOOTSTRAP_TOKEN;
    if (!expected || dto.token !== expected) throw new UnauthorizedException('Invalid bootstrap token');

    const existingSuperadmins = await this.users.count({ where: { role: Role.SuperAdmin } });
    if (existingSuperadmins > 0) throw new BadRequestException('Superadmin already exists');

    const email = dto.email.trim().toLowerCase();
    const existing = await this.users.findOne({ where: { email } });
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = this.users.create({
      email,
      passwordHash,
      role: Role.SuperAdmin,
      status: UserStatus.Active,
      emailVerifiedAt: new Date(),
    });

    return this.users.save(user);
  }

  async createUser(dto: CreateUserDto) {
    const email = dto.email.trim().toLowerCase();

    const existing = await this.users.findOne({ where: { email } });
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = this.users.create({
      email,
      phoneE164: dto.phoneE164 ?? null,
      passwordHash,
      role: dto.role,
      status: UserStatus.Active,
    });

    return this.users.save(user);
  }

  async listUsers(role?: Role) {
    const where = role ? { role } : {};
    return this.users.find({
      where,
      order: { createdAt: 'DESC' },
      take: 200,
      select: ['id', 'email', 'phoneE164', 'role', 'status', 'createdAt', 'lastLoginAt'],
    });
  }

  async listBookings() {
    return this.bookings.find({
      order: { createdAt: 'DESC' },
      take: 200,
    });
  }

  async listTrips(status?: TripStatus) {
    const where = status ? { status } : {};
    return this.trips.find({
      where,
      order: { createdAt: 'DESC' },
      take: 200,
    });
  }

  async listDrivers() {
    return this.listUsers(Role.Driver);
  }

  async listCustomerBookings(customerId: string) {
    return this.bookings.find({
      where: { customerId },
      order: { createdAt: 'DESC' },
      take: 200,
    });
  }

  async listDriverTrips(driverId: string) {
    return this.trips.find({
      where: { driverId },
      order: { createdAt: 'DESC' },
      take: 200,
    });
  }

  async setBookingStatus(bookingId: string, status: BookingStatus) {
    const booking = await this.bookings.findOne({ where: { id: bookingId } });
    if (!booking) throw new BadRequestException('Booking not found');

    booking.status = status;
    return this.bookings.save(booking);
  }
}
