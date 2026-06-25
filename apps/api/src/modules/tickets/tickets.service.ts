import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TicketStatus, TicketPriority } from '@prisma/client';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTicketDto, createdById: string) {
    // Verify customer exists
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
    });
    if (!customer) {
      throw new NotFoundException(`Customer with ID "${dto.customerId}" not found`);
    }

    // Verify creator exists
    const creator = await this.prisma.user.findUnique({
      where: { id: createdById },
    });
    if (!creator) {
      throw new NotFoundException(`Creator User with ID "${createdById}" not found`);
    }

    // Verify assignee if provided
    if (dto.assignedToId) {
      const assignee = await this.prisma.user.findUnique({
        where: { id: dto.assignedToId },
      });
      if (!assignee) {
        throw new NotFoundException(`Assigned User with ID "${dto.assignedToId}" not found`);
      }
    }

    return this.prisma.ticket.create({
      data: {
        title: dto.title,
        description: dto.description,
        priority: dto.priority || TicketPriority.MEDIUM,
        status: dto.assignedToId ? TicketStatus.ASSIGNED : TicketStatus.OPEN,
        customerId: dto.customerId,
        createdById,
        assignedToId: dto.assignedToId || null,
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });
  }

  async findAll(filters: {
    status?: TicketStatus;
    priority?: TicketPriority;
    assignedToId?: string;
    customerId?: string;
  }) {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;
    if (filters.assignedToId) where.assignedToId = filters.assignedToId;
    if (filters.customerId) where.customerId = filters.customerId;

    return this.prisma.ticket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });
  }

  async findMy(assignedToId: string) {
    return this.prisma.ticket.findMany({
      where: { assignedToId },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            addressLine: true,
            locality: true,
            municipality: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID "${id}" not found`);
    }

    return ticket;
  }

  async update(id: string, dto: UpdateTicketDto) {
    const ticket = await this.findOne(id);

    const updateData: any = { ...dto };

    if (dto.assignedToId) {
      const assignee = await this.prisma.user.findUnique({
        where: { id: dto.assignedToId },
      });
      if (!assignee) {
        throw new NotFoundException(`Assigned User with ID "${dto.assignedToId}" not found`);
      }
      // If status is OPEN and we assign a technician, update status to ASSIGNED
      if (ticket.status === TicketStatus.OPEN && !dto.status) {
        updateData.status = TicketStatus.ASSIGNED;
      }
    }

    if (dto.status) {
      if (dto.status === TicketStatus.RESOLVED) {
        updateData.resolvedAt = new Date();
      } else if (dto.status === TicketStatus.CLOSED) {
        updateData.closedAt = new Date();
        if (!ticket.resolvedAt) {
          updateData.resolvedAt = new Date();
        }
      }
    }

    return this.prisma.ticket.update({
      where: { id },
      data: updateData,
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true },
        },
        createdBy: {
          select: { id: true, name: true, role: true },
        },
        assignedTo: {
          select: { id: true, name: true, role: true },
        },
      },
    });
  }

  async addComment(ticketId: string, authorId: string, dto: CreateCommentDto) {
    await this.findOne(ticketId); // verify exists

    const author = await this.prisma.user.findUnique({
      where: { id: authorId },
    });
    if (!author) {
      throw new NotFoundException(`User with ID "${authorId}" not found`);
    }

    return this.prisma.ticketComment.create({
      data: {
        ticketId,
        authorId,
        body: dto.body,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });
  }

  async getCustomerTickets(customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer) {
      throw new NotFoundException(`Customer with ID "${customerId}" not found`);
    }

    return this.prisma.ticket.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: {
          select: { id: true, name: true, role: true },
        },
        assignedTo: {
          select: { id: true, name: true, role: true },
        },
      },
    });
  }
}
