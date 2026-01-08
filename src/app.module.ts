import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { DatabaseModule } from './database';
import { AuthModule } from './auth';
import { UsersModule } from './users';
import { GiftsModule } from './gifts';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'node_modules/bootstrap/dist'),
      serveRoot: '/libs/bootstrap',
      serveStaticOptions: {
        index: false,
      },
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'node_modules/bootstrap-icons'),
      serveRoot: '/libs/bootstrap-icons',
      serveStaticOptions: {
        index: false,
      },
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'public'),
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    GiftsModule,
  ],
})
export class AppModule { }
