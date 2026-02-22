import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId: string) {
    return this.prisma.contact.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(companyId: string, id: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!contact) throw new NotFoundException('Contact not found');
    return contact;
  }

  async findByPhone(companyId: string, phone: string) {
    return this.prisma.contact.findFirst({
      where: { companyId, phone, deletedAt: null },
    });
  }

  async findOrCreate(
    companyId: string,
    phone: string,
    data?: { name?: string; profilePic?: string },
  ) {
    let contact = await this.findByPhone(companyId, phone);
    if (!contact) {
      contact = await this.prisma.contact.create({
        data: {
          companyId,
          phone,
          name: data?.name ?? phone,
          profilePic: data?.profilePic,
        },
      });
    } else if (data?.name || data?.profilePic) {
      contact = await this.prisma.contact.update({
        where: { id: contact.id },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.profilePic && { profilePic: data.profilePic }),
        },
      });
    }
    return contact;
  }

  async create(companyId: string, dto: CreateContactDto) {
    return this.prisma.contact.create({
      data: {
        companyId,
        phone: dto.phone,
        name: dto.name ?? dto.phone,
        email: dto.email,
      },
    });
  }

  async update(companyId: string, id: string, dto: UpdateContactDto) {
    await this.findOne(companyId, id);
    return this.prisma.contact.update({
      where: { id },
      data: dto,
    });
  }

  async remove(companyId: string, id: string) {
    await this.findOne(companyId, id);
    await this.prisma.contact.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { success: true };
  }
}
