import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../shared/enums/roles.enum';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto';

@ApiTags('bookings')
@ApiBearerAuth()
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Customer)
  async create(@Req() req: Request & { user?: unknown }, @Body() dto: CreateBookingDto) {
    const user = req.user as { id: string };
    return this.bookings.createBooking(user.id, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Customer, Role.Admin, Role.SuperAdmin)
  async list(
    @Req() req: Request & { user?: unknown },
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const user = req.user as { id: string; role?: Role };
    const take = limit ? Number(limit) : 50;
    const skip = offset ? Number(offset) : 0;

    if (user.role === Role.Admin || user.role === Role.SuperAdmin) {
      return this.bookings.listBookingsForAdmin(take, skip);
    }

    return this.bookings.listBookingsForCustomer(user.id, take, skip);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async get(@Param('id') id: string) {
    return this.bookings.getBooking(id);
  }
}
