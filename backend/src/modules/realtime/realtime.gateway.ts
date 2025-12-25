import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { DriverLocationsService } from '../drivers/driver-locations.service';
import { Role } from '../../shared/enums/roles.enum';

// Events (per spec):
// DRIVER_EVENTS: driver.online, driver.location.update, driver.status.change, ...
// CUSTOMER_EVENTS: booking.created, driver.assigned, ...
// ADMIN_EVENTS: new.booking.alert, ...

@WebSocketGateway({
  cors: {
    origin: (process.env.CORS_ORIGINS ?? '').split(',').filter(Boolean),
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    private readonly jwt: JwtService,
    private readonly driverLocations: DriverLocationsService,
  ) {}

  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    const token =
      (typeof client.handshake.auth?.token === 'string' && client.handshake.auth.token) ||
      (typeof client.handshake.headers?.authorization === 'string' &&
        client.handshake.headers.authorization.replace(/^Bearer\s+/i, ''));

    if (!token) {
      client.emit('system.alert', { type: 'unauthorized' });
      client.disconnect(true);
      return;
    }

    try {
      const payload = this.jwt.verify<{ sub: string; email?: string; role?: string }>(token, {
        secret: process.env.JWT_SECRET,
      });

      client.data.user = { id: payload.sub, email: payload.email, role: payload.role };

      if (payload.role === Role.Admin || payload.role === Role.SuperAdmin) client.join('admins');
      if (payload.role === Role.Driver) client.join('drivers');
      if (payload.role === Role.Customer) client.join('customers');

      client.emit('system.alert', { type: 'connected' });
    } catch {
      client.emit('system.alert', { type: 'unauthorized' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    client.removeAllListeners();
  }

  @SubscribeMessage('driver.online')
  driverOnline(@ConnectedSocket() client: Socket) {
    client.join('drivers');
    this.server.to('admins').emit('driver.status.change', { status: 'online' });
    return { ok: true };
  }

  @SubscribeMessage('driver.location.update')
  async driverLocationUpdate(
    @MessageBody() body: { lat: number; lon: number; heading?: number; speed?: number },
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user as { id: string; role?: string } | undefined;
    if (!user?.id || user.role !== Role.Driver) return { ok: false };

    await this.driverLocations.record(user.id, {
      lat: body.lat,
      lon: body.lon,
      headingDegrees: body.heading,
      speedMps: body.speed,
    });

    this.server.to('admins').emit('driver.location.update', {
      driverId: user.id,
      ...body,
    });
    return { ok: true };
  }

  @SubscribeMessage('booking.created')
  bookingCreated(@MessageBody() body: unknown) {
    this.server.to('admins').emit('new.booking.alert', body);
    return { ok: true };
  }
}
