import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Role, PaymentMethod, User } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @Get()
  @Roles(
    Role.SUPER_ADMIN,
    Role.ADMIN,
    Role.SUPERVISOR,
    Role.COLLECTOR,
    Role.TECHNICIAN,
    Role.VIEWER,
  )
  @ApiOperation({ summary: 'List all payments' })
  @ApiQuery({ name: 'customerId', required: false, type: String })
  @ApiQuery({ name: 'query', required: false, type: String, description: 'Search by folio, notes, or customer name' })
  @ApiQuery({ name: 'method', required: false, enum: PaymentMethod })
  findAll(
    @Query('customerId') customerId?: string,
    @Query('query') query?: string,
    @Query('method') method?: PaymentMethod,
  ) {
    return this.service.findAll({ customerId, query, method });
  }

  @Get(':id')
  @Roles(
    Role.SUPER_ADMIN,
    Role.ADMIN,
    Role.SUPERVISOR,
    Role.COLLECTOR,
    Role.TECHNICIAN,
    Role.VIEWER,
  )
  @ApiOperation({ summary: 'Get payment by ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SUPERVISOR, Role.COLLECTOR)
  @ApiOperation({ summary: 'Record a new payment' })
  create(@Body() dto: CreatePaymentDto, @CurrentUser() actor: User) {
    return this.service.create(dto, actor.id);
  }
}
