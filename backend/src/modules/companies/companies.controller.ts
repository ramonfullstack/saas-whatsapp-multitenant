import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CompaniesService } from './companies.service';
import { CompanyId } from '../../common/decorators';

@ApiTags('companies')
@ApiBearerAuth('JWT')
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  @Get('me')
  @ApiOperation({ summary: 'Dados da empresa do usuário logado' })
  getMe(@CompanyId() companyId: string) {
    return this.companies.findByCompanyId(companyId);
  }
}
