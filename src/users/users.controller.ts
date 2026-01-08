import {
    Controller,
    Get,
    Put,
    Post,
    Body,
    UseGuards,
    Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateProfileDto, ChangePasswordDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser } from '../auth/decorators';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
    constructor(private usersService: UsersService) { }

    @Get('me')
    async getProfile(@CurrentUser('id') userId: string) {
        return this.usersService.getProfile(userId);
    }

    @Put('me')
    async updateProfile(
        @CurrentUser('id') userId: string,
        @Body() updateDto: UpdateProfileDto,
    ) {
        return this.usersService.updateProfile(userId, updateDto);
    }

    @Post('me/change-password')
    async changePassword(
        @CurrentUser('id') userId: string,
        @Body() changePasswordDto: ChangePasswordDto,
    ) {
        return this.usersService.changePassword(userId, changePasswordDto);
    }

    @Get('me/points')
    async getPointBalance(@CurrentUser('id') userId: string) {
        const balance = await this.usersService.getPointBalance(userId);
        return { balance };
    }

    @Get('me/points/history')
    async getPointHistory(
        @CurrentUser('id') userId: string,
        @Query('limit') limit?: string,
    ) {
        const history = await this.usersService.getPointHistory(
            userId,
            limit ? parseInt(limit) : 20,
        );
        return { data: history };
    }
}
