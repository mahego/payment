import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentMethod, Prisma } from '@prisma/client';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { v4 as uuidv4 } from 'uuid';
import { MikrotikService } from '../mikrotik/mikrotik.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mikrotikService: MikrotikService,
  ) {}

  async findAll(filters?: { customerId?: string; query?: string; method?: PaymentMethod }) {
    const where: Prisma.PaymentWhereInput = {};

    if (filters?.customerId) {
      where.customerId = filters.customerId;
    }

    if (filters?.method) {
      where.method = filters.method;
    }

    if (filters?.query) {
      const q = filters.query.trim();
      where.OR = [
        { folio: { contains: q, mode: 'insensitive' } },
        { notes: { contains: q, mode: 'insensitive' } },
        {
          customer: {
            OR: [
              { firstName: { contains: q, mode: 'insensitive' } },
              { lastName: { contains: q, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const payments = await this.prisma.payment.findMany({
      where,
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        createdBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { paidAt: 'desc' },
    });

    return payments.map((p) => ({
      ...p,
      amount: Number(p.amount),
    }));
  }

  async findOne(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        customer: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    return {
      ...payment,
      amount: Number(payment.amount),
    };
  }

  async create(dto: CreatePaymentDto, userId: string) {
    // Generate or use clientRequestId for idempotency check
    const clientRequestId = dto.clientRequestId ?? `PAY-dashboard-${uuidv4()}`;

    // 1. Idempotency Check: if clientRequestId already exists, return the existing payment
    const existingPayment = await this.prisma.payment.findUnique({
      where: { clientRequestId },
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (existingPayment) {
      console.log(`Payment already registered (idempotency triggered) for clientRequestId: ${clientRequestId}`);
      return {
        ...existingPayment,
        amount: Number(existingPayment.amount),
      };
    }

    // Check if customer exists
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
    });
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${dto.customerId} not found`);
    }

    // Generate a unique folio
    let folio = '';
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 10) {
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      folio = `FOL-${dateStr}-${randomSuffix}`;

      const existingFolio = await this.prisma.payment.findUnique({
        where: { folio },
      });
      if (!existingFolio) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      throw new BadRequestException('Could not generate a unique folio, please try again.');
    }

    const paidAt = dto.paidAt ? new Date(dto.paidAt) : new Date();

    // 2. Transaction: save payment and discount the customer balance
    const result = await this.prisma.$transaction(async (tx) => {
      // Create Payment
      const payment = await tx.payment.create({
        data: {
          customerId: dto.customerId,
          createdById: userId,
          folio,
          clientRequestId,
          method: dto.method,
          amount: dto.amount,
          paidAt,
          notes: dto.notes ?? null,
        },
        include: {
          customer: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      // Update Customer currentBalance (currentBalance - paymentAmount)
      const updatedCustomer = await tx.customer.update({
        where: { id: dto.customerId },
        data: {
          currentBalance: {
            decrement: dto.amount,
          },
        },
      });

      return {
        payment,
        newBalance: Number(updatedCustomer.currentBalance),
        oldStatus: updatedCustomer.status,
      };
    });

    // Reactivate client if their balance is now 0 or negative
    if (result.newBalance <= 0 && (result.oldStatus === 'SUSPENDIDO' || result.oldStatus === 'MOROSO')) {
      this.mikrotikService.reactivateCustomer(dto.customerId).catch((err) => {
        console.error(`Auto-reactivation failed for customer ${dto.customerId}:`, err);
      });
    }

    return {
      ...result.payment,
      amount: Number(result.payment.amount),
    };
  }
}
