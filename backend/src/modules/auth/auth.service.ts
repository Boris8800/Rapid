import { ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { randomBytes, randomUUID } from 'crypto';
import { Role } from '../../shared/enums/roles.enum';
import { UserStatus } from '../../shared/enums/user-status.enum';
import { UserEntity } from '../../database/entities/user.entity';
import { REDIS_CLIENT, type RedisLike } from '../../shared/redis/redis.constants';
import { parseExpiresInToSeconds } from '../../utils/duration';
import { LoginDto, MagicLinkConsumeDto, MagicLinkRequestDto, RefreshDto, RegisterDto } from './dto';

type PublicUser = {
  id: string;
  email: string;
  role: Role;
};

type RefreshPayload = {
  sub: string;
  typ: 'refresh';
  jti: string;
  iat?: number;
  exp?: number;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    @InjectRepository(UserEntity) private readonly users: Repository<UserEntity>,
    @Inject(REDIS_CLIENT) private readonly redis: RedisLike,
  ) {}

  me(user: unknown) {
    return user;
  }

  async registerWithPassword(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();

    const existing = await this.users.findOne({ where: { email } });
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = this.users.create({
      email,
      passwordHash,
      role: Role.Customer,
      status: UserStatus.Active,
    });

    const created = await this.users.save(user);
    return this.issueTokens({ id: created.id, email: created.email ?? email, role: created.role });
  }

  async loginWithPassword(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();

    const user = await this.users.findOne({ where: { email } });
    if (!user || !user.passwordHash) throw new UnauthorizedException('Invalid credentials');
    if (user.status !== UserStatus.Active) throw new UnauthorizedException('User is not active');

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    user.lastLoginAt = new Date();
    await this.users.save(user);

    return this.issueTokens({ id: user.id, email: user.email ?? email, role: user.role });
  }

  async requestMagicLink(dto: MagicLinkRequestDto) {
    const email = dto.email.trim().toLowerCase();
    const tenant = dto.tenant ?? 'customer';

    // Do not leak whether the user exists.
    const genericResponse: { ok: true; message: string; link?: string } = {
      ok: true,
      message: 'If the email exists, a sign-in link will be sent.',
    };

    const user = await this.users.findOne({ where: { email } });
    if (!user || user.status !== UserStatus.Active) return genericResponse;

    const token = randomBytes(32).toString('hex');
    const ttlSeconds = parseExpiresInToSeconds(process.env.MAGIC_LINK_TTL ?? '15m', 15 * 60);
    await this.redis.set(this.magicKey(token), user.id, 'EX', ttlSeconds);

    // Build a safe default link (no open redirect).
    const domainRoot = (process.env.DOMAIN_ROOT ?? process.env.DOMAIN ?? 'rapidroad.uk').trim();
    const hostPrefix = tenant === 'admin' ? 'admin.' : tenant === 'driver' ? 'driver.' : '';
    const link = `https://${hostPrefix}${domainRoot}/magic?token=${encodeURIComponent(token)}`;

    // For local/testing, optionally include the link in the response.
    if (process.env.MAGIC_LINK_RETURN_URL === 'true' || process.env.NODE_ENV !== 'production') {
      genericResponse.link = link;
    }

    // TODO: enqueue email sending (BullMQ) with the link.
    return genericResponse;
  }

  async consumeMagicLink(dto: MagicLinkConsumeDto) {
    const token = dto.token.trim();
    const key = this.magicKey(token);

    const userId = await this.redis.get(key);
    if (!userId) throw new UnauthorizedException('Invalid or expired magic link');

    // One-time token: delete first to prevent replay.
    await this.redis.del(key);

    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Invalid or expired magic link');
    if (user.status !== UserStatus.Active) throw new UnauthorizedException('User is not active');

    user.lastLoginAt = new Date();
    await this.users.save(user);

    return this.issueTokens({ id: user.id, email: user.email ?? '', role: user.role });
  }

  async refresh(dto: RefreshDto) {
    if (!dto.refreshToken) throw new UnauthorizedException('Missing refresh token');

    let payload: RefreshPayload;
    try {
      payload = this.jwt.verify<RefreshPayload>(dto.refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.typ !== 'refresh' || !payload.sub || !payload.jti) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const key = this.refreshKey(payload.sub, payload.jti);
    const exists = await this.redis.get(key);
    if (!exists) throw new UnauthorizedException('Refresh token revoked');

    // rotate
    await this.redis.del(key);

    const user = await this.users.findOne({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException('User not found');
    if (user.status !== UserStatus.Active) throw new UnauthorizedException('User is not active');

    return this.issueTokens({ id: user.id, email: user.email ?? '', role: user.role });
  }

  private issueTokens(user: PublicUser) {
    const accessToken = this.jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRATION ?? '15m',
      },
    );

    const refreshJti = randomUUID();
    const refreshExpiresIn = process.env.REFRESH_TOKEN_EXPIRATION ?? '7d';
    const refreshToken = this.jwt.sign(
      { sub: user.id, typ: 'refresh', jti: refreshJti },
      {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: refreshExpiresIn,
      },
    );

    const ttlSeconds = parseExpiresInToSeconds(refreshExpiresIn, 7 * 24 * 60 * 60);
    void this.redis.set(this.refreshKey(user.id, refreshJti), '1', 'EX', ttlSeconds);

    return { accessToken, refreshToken };
  }

  private refreshKey(userId: string, jti: string) {
    return `refresh:${userId}:${jti}`;
  }

  private magicKey(token: string) {
    return `magic:${token}`;
  }
}
