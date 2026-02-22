import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { JwtPayload } from '../decorators/current-user.decorator';

/**
 * Injeta companyId no request a partir do token JWT.
 * Todas as rotas protegidas devem usar este guard para garantir multi-tenancy.
 */
@Injectable()
export class CompanyContextGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload | undefined;
    if (!user) return true;
    if (!user.companyId) {
      throw new ForbiddenException('Company context is required');
    }
    request.companyId = user.companyId;
    return true;
  }
}
