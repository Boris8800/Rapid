import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../shared/enums/roles.enum';
import { DriverLocationsService } from './driver-locations.service';
import { UpdateDriverLocationDto } from './dto';

@ApiTags('drivers')
@ApiBearerAuth()
@Controller('drivers')
export class DriversController {
  constructor(private readonly driverLocations: DriverLocationsService) {}

  @Post('location')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Driver)
  async updateLocation(@Req() req: Request & { user?: unknown }, @Body() dto: UpdateDriverLocationDto) {
    const user = req.user as { id: string };
    return this.driverLocations.record(user.id, dto);
  }
}
