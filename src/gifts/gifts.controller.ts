import {
    Controller,
    Get,
    Post,
    Put,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    ParseUUIDPipe,
} from '@nestjs/common';
import { GiftsService } from './gifts.service';
import {
    CreateGiftDto,
    UpdateGiftDto,
    GiftQueryDto,
    RedeemGiftDto,
    RedeemMultipleDto,
    RatingDto,
} from './dto';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { Roles, CurrentUser } from '../auth/decorators';

@Controller('gifts')
export class GiftsController {
    constructor(private giftsService: GiftsService) { }

    @Get()
    async findAll(@Query() query: GiftQueryDto) {
        return this.giftsService.findAll(query);
    }

    @Get('categories')
    async getCategories() {
        return this.giftsService.getCategories();
    }

    @Get(':id')
    async findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.giftsService.findOne(id);
    }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin', 'support')
    async create(@Body() createDto: CreateGiftDto) {
        return this.giftsService.create(createDto);
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin', 'support')
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateDto: UpdateGiftDto,
    ) {
        return this.giftsService.update(id, updateDto);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin', 'support')
    async partialUpdate(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateDto: UpdateGiftDto,
    ) {
        return this.giftsService.update(id, updateDto);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    async remove(@Param('id', ParseUUIDPipe) id: string) {
        return this.giftsService.remove(id);
    }

    @Post(':id/redeem')
    @UseGuards(JwtAuthGuard)
    async redeem(
        @CurrentUser('id') userId: string,
        @Param('id', ParseUUIDPipe) giftId: string,
        @Body() redeemDto: RedeemGiftDto,
    ) {
        return this.giftsService.redeem(userId, giftId, redeemDto);
    }

    @Post('redeem/multiple')
    @UseGuards(JwtAuthGuard)
    async redeemMultiple(
        @CurrentUser('id') userId: string,
        @Body() redeemDto: RedeemMultipleDto,
    ) {
        return this.giftsService.redeemMultiple(userId, redeemDto.items);
    }

    @Post(':id/rating')
    @UseGuards(JwtAuthGuard)
    async addRating(
        @CurrentUser('id') userId: string,
        @Param('id', ParseUUIDPipe) giftId: string,
        @Body() ratingDto: RatingDto,
    ) {
        return this.giftsService.addRating(userId, giftId, ratingDto);
    }
}
