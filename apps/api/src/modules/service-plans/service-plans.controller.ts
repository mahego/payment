import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ServicePlansService } from './service-plans.service';
import { CreateServicePlanDto } from './dto/create-service-plan.dto';
import { UpdateServicePlanDto } from './dto/update-service-plan.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('service-plans')
@ApiBearerAuth()
@Controller('service-plans')
export class ServicePlansController {
  constructor(private readonly servicePlansService: ServicePlansService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Create a new service plan' })
  create(@Body() dto: CreateServicePlanDto) {
    return this.servicePlansService.create(dto);
  }

  @Get()
  @Roles(
    Role.SUPER_ADMIN,
    Role.ADMIN,
    Role.SUPERVISOR,
    Role.COLLECTOR,
    Role.TECHNICIAN,
    Role.VIEWER,
  )
  @ApiOperation({ summary: 'List all service plans' })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean, description: 'Filter active only' })
  @ApiQuery({ name: 'zoneId', required: false, type: String, description: 'Filter by zone ID' })
  findAll(
    @Query('activeOnly') activeOnly?: string,
    @Query('zoneId') zoneId?: string,
  ) {
    const active = activeOnly === undefined ? true : activeOnly === 'true';
    return this.servicePlansService.findAll(active, zoneId);
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
  @ApiOperation({ summary: 'Get details of a service plan' })
  findOne(@Param('id') id: string) {
    return this.servicePlansService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Update a service plan' })
  update(@Param('id') id: string, @Body() dto: UpdateServicePlanDto) {
    return this.servicePlansService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete a service plan' })
  remove(@Param('id') id: string) {
    return this.servicePlansService.remove(id);
  }
}
