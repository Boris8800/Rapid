import { Controller, Get, Optional } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    @Optional() private readonly db?: TypeOrmHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    if (process.env.SKIP_DB === 'true' || !this.db) {
      return this.health.check([]);
    }

    return this.health.check([async () => this.db!.pingCheck('postgres')]);
  }
}
