import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from '../../common/decorators/current-user.decorator';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async validateUser(
    companyId: string,
    email: string,
    password: string,
  ): Promise<{ id: string; email: string; companyId: string; role: string; name: string } | null> {
    const user = await this.prisma.user.findFirst({
      where: {
        companyId,
        email: email.toLowerCase(),
        isActive: true,
        deletedAt: null,
      },
    });
    if (!user) return null;
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return null;
    return {
      id: user.id,
      email: user.email,
      companyId: user.companyId,
      role: user.role,
      name: user.name,
    };
  }

  async login(dto: LoginDto): Promise<{ access_token: string; user: unknown }> {
    const company = await this.prisma.company.findFirst({
      where: { slug: dto.companySlug, deletedAt: null },
    });
    if (!company) {
      throw new UnauthorizedException('Invalid company or credentials');
    }
    const user = await this.validateUser(
      company.id,
      dto.email,
      dto.password,
    );
    if (!user) {
      throw new UnauthorizedException('Invalid company or credentials');
    }
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      companyId: user.companyId,
      role: user.role,
    };
    const access_token = this.jwt.sign(payload, {
      expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
    });
    return {
      access_token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: user.companyId,
        companyName: company.name,
      },
    };
  }
}
