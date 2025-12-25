import { Controller, Get, Header } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import * as client from 'prom-client';

const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });

@ApiExcludeController()
@Controller('metrics')
export class MetricsController {
  @Get()
  @Header('Content-Type', registry.contentType)
  async metrics() {
    return registry.metrics();
  }
}
