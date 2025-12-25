import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../shared/enums/roles.enum';
import { TripStatus } from '../../shared/enums/trip-status.enum';
import { AdminService } from './admin.service';
import { BootstrapDto, CreateUserDto } from './dto';

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Post('bootstrap')
  async bootstrap(@Body() dto: BootstrapDto) {
    return this.admin.bootstrapSuperadmin(dto);
  }

  @ApiBearerAuth()
  @Post('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.SuperAdmin)
  async createUser(@Body() dto: CreateUserDto) {
    return this.admin.createUser(dto);
  }

  @ApiBearerAuth()
  @Get('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.SuperAdmin)
  async listUsers(@Query('role') role?: Role) {
    return this.admin.listUsers(role);
  }

  @ApiBearerAuth()
  @Get('drivers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.SuperAdmin)
  async listDrivers() {
    return this.admin.listDrivers();
  }

  @ApiBearerAuth()
  @Get('bookings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.SuperAdmin)
  async listBookings() {
    return this.admin.listBookings();
  }

  @ApiBearerAuth()
  @Get('trips')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.SuperAdmin)
  async listTrips(@Query('status') status?: TripStatus) {
    return this.admin.listTrips(status);
  }

  @ApiBearerAuth()
  @Get('me/bookings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Customer)
  async myBookings(@Req() req: Request & { user?: unknown }) {
    const user = req.user as { id: string };
    return this.admin.listCustomerBookings(user.id);
  }

  @ApiBearerAuth()
  @Get('me/trips')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Driver)
  async myTrips(@Req() req: Request & { user?: unknown }) {
    const user = req.user as { id: string };
    return this.admin.listDriverTrips(user.id);
  }
}
