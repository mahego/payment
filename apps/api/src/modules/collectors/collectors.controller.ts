import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
} from '@nestjs/swagger';
import { Role, User } from '@prisma/client';
import { CollectorsService } from './collectors.service';
import { CreateCollectorDto } from './dto/create-collector.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

class CreateCollectorRequest {
  user: CreateUserDto;
  profile: CreateCollectorDto;
}

@ApiTags('collectors')
@ApiBearerAuth()
@Controller('collectors')
export class CollectorsController {
  constructor(private readonly service: CollectorsService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'List all collectors' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Get collector by userId' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Create user + collector profile' })
  create(@Body() body: CreateCollectorRequest, @CurrentUser() actor: User) {
    return this.service.create(body.user, body.profile ?? {}, actor);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Update collector profile' })
  update(
    @Param('id') id: string,
    @Body() dto: CreateCollectorDto,
    @CurrentUser() actor: User,
  ) {
    return this.service.update(id, dto, actor);
  }

  @Get(':id/payments')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: "List collector's payments" })
  getPayments(@Param('id') id: string) {
    return this.service.getPayments(id);
  }

  @Get(':id/customers')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: "List collector's assigned customers" })
  getCustomers(@Param('id') id: string) {
    return this.service.getCustomers(id);
  }
}
