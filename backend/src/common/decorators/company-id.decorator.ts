import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extrai companyId do contexto (request.companyId injetado pelo guard).
 * NUNCA confie em parâmetros da URL/body para companyId - sempre do token/context.
 */
export const CompanyId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const companyId = request.companyId as string;
    if (!companyId) {
      throw new Error('CompanyId not found in request context');
    }
    return companyId;
  },
);
