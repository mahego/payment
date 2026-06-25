import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Role, TicketStatus, TicketPriority, User } from '@prisma/client';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('tickets')
@ApiBearerAuth()
@Controller()
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post('tickets')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SUPERVISOR, Role.COLLECTOR, Role.TECHNICIAN)
  @ApiOperation({ summary: 'Create a new ticket' })
  create(@Body() dto: CreateTicketDto, @CurrentUser() user: User) {
    return this.ticketsService.create(dto, user.id);
  }

  @Get('tickets')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'List all tickets with filters' })
  @ApiQuery({ name: 'status', required: false, enum: TicketStatus })
  @ApiQuery({ name: 'priority', required: false, enum: TicketPriority })
  @ApiQuery({ name: 'assignedToId', required: false, type: String })
  @ApiQuery({ name: 'customerId', required: false, type: String })
  findAll(
    @Query('status') status?: TicketStatus,
    @Query('priority') priority?: TicketPriority,
    @Query('assignedToId') assignedToId?: string,
    @Query('customerId') customerId?: string,
  ) {
    return this.ticketsService.findAll({ status, priority, assignedToId, customerId });
  }

  @Get('tickets/my')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SUPERVISOR, Role.COLLECTOR, Role.TECHNICIAN)
  @ApiOperation({ summary: 'List tickets assigned to the logged user' })
  findMy(@CurrentUser() user: User) {
    return this.ticketsService.findMy(user.id);
  }

  @Get('tickets/:id')
  @Roles(
    Role.SUPER_ADMIN,
    Role.ADMIN,
    Role.SUPERVISOR,
    Role.COLLECTOR,
    Role.TECHNICIAN,
    Role.VIEWER,
  )
  @ApiOperation({ summary: 'Get details of a ticket including comments' })
  findOne(@Param('id') id: string) {
    return this.ticketsService.findOne(id);
  }

  @Patch('tickets/:id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Update ticket (status, priority, assignment)' })
  update(@Param('id') id: string, @Body() dto: UpdateTicketDto) {
    return this.ticketsService.update(id, dto);
  }

  @Post('tickets/:id/comments')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SUPERVISOR, Role.COLLECTOR, Role.TECHNICIAN)
  @ApiOperation({ summary: 'Add a comment to a ticket' })
  addComment(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: CreateCommentDto,
  ) {
    return this.ticketsService.addComment(id, user.id, dto);
  }

  @Get('customers/:id/tickets')
  @Roles(
    Role.SUPER_ADMIN,
    Role.ADMIN,
    Role.SUPERVISOR,
    Role.COLLECTOR,
    Role.TECHNICIAN,
    Role.VIEWER,
  )
  @ApiOperation({ summary: 'Get ticket history for a customer' })
  getCustomerTickets(@Param('id') id: string) {
    return this.ticketsService.getCustomerTickets(id);
  }
}
