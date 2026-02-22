import { Controller, Get } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CompanyId } from '../../common/decorators';

@Controller('companies')
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  @Get('me')
  getMe(@CompanyId() companyId: string) {
    return this.companies.findByCompanyId(companyId);
  }
}
