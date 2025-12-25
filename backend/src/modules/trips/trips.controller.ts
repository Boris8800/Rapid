import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../shared/enums/roles.enum';
import { TripStatus } from '../../shared/enums/trip-status.enum';
import { AssignDriverDto, CompleteTripDto } from './dto';
import { TripsService } from './trips.service';

@ApiTags('trips')
@ApiBearerAuth()
@Controller('trips')
export class TripsController {
  constructor(private readonly trips: TripsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Driver, Role.Admin, Role.SuperAdmin)
  async list(
    @Req() req: Request & { user?: unknown },
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('status') status?: TripStatus,
  ) {
    const user = req.user as { id: string; role?: Role };
    const take = limit ? Number(limit) : 50;
    const skip = offset ? Number(offset) : 0;

    if (user.role === Role.Admin || user.role === Role.SuperAdmin) {
      return this.trips.listTripsForAdmin(take, skip, status);
    }

    return this.trips.listTripsForDriver(user.id, take, skip, status);
  }

  // Admin dispatch
  @Post('dispatch/:bookingId/assign-driver')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.SuperAdmin)
  async assignDriver(
    @Req() req: Request & { user?: unknown },
    @Param('bookingId') bookingId: string,
    @Body() dto: AssignDriverDto,
  ) {
    const admin = req.user as { id: string };
    return this.trips.assignDriver(admin.id, bookingId, dto.driverId);
  }

  // Driver actions
  @Post(':tripId/accept')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Driver)
  async accept(@Req() req: Request & { user?: unknown }, @Param('tripId') tripId: string) {
    const driver = req.user as { id: string };
    return this.trips.acceptTrip(driver.id, tripId);
  }

  @Post(':tripId/start')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Driver)
  async start(@Req() req: Request & { user?: unknown }, @Param('tripId') tripId: string) {
    const driver = req.user as { id: string };
    return this.trips.startTrip(driver.id, tripId);
  }

  @Post(':tripId/complete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Driver)
  async complete(
    @Req() req: Request & { user?: unknown },
    @Param('tripId') tripId: string,
    @Body() dto: CompleteTripDto,
  ) {
    const driver = req.user as { id: string };
    return this.trips.completeTrip(driver.id, tripId, dto.distanceM, dto.durationS);
  }

  @Get(':tripId')
  @UseGuards(JwtAuthGuard)
  async get(@Param('tripId') tripId: string) {
    return this.trips.getTrip(tripId);
  }
}
