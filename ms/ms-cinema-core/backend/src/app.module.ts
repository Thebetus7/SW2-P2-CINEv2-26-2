import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dataSourceOptions } from './database/ormconfig';
import { HallsModule } from './modules/halls/halls.module';
import { MoviesModule } from './modules/movies/movies.module';
import { ShowtimesModule } from './modules/showtimes/showtimes.module';
import { MetricsModule } from './modules/metrics/metrics.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      ...dataSourceOptions,
      autoLoadEntities: true,
    }),
    HallsModule,
    MoviesModule,
    ShowtimesModule,
    MetricsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
