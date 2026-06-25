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
import { ZonesService } from './zones.service';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('zones')
@ApiBearerAuth()
@Controller('zones')
export class ZonesController {
  constructor(private readonly zonesService: ZonesService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Create a new zone' })
  create(@Body() dto: CreateZoneDto) {
    return this.zonesService.create(dto);
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
  @ApiOperation({ summary: 'List all zones' })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean, description: 'Filter active only' })
  findAll(@Query('activeOnly') activeOnly?: string) {
    const active = activeOnly === undefined ? true : activeOnly === 'true';
    return this.zonesService.findAll(active);
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
  @ApiOperation({ summary: 'Get details of a zone' })
  findOne(@Param('id') id: string) {
    return this.zonesService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Update a zone' })
  update(@Param('id') id: string, @Body() dto: UpdateZoneDto) {
    return this.zonesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete a zone' })
  remove(@Param('id') id: string) {
    return this.zonesService.remove(id);
  }

  @Get(':id/customers')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'List customers in a zone' })
  getCustomers(@Param('id') id: string) {
    return this.zonesService.getCustomers(id);
  }
}
