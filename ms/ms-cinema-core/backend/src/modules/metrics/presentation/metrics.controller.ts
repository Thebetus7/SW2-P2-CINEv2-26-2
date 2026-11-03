import { Controller, Get, Headers, HttpCode, HttpStatus } from '@nestjs/common';
import { ComputeKpisUseCase, OccupancyMetricsResponse } from '../application/compute-kpis.use-case';

@Controller('api/v1/metrics')
export class MetricsController {
  constructor(private readonly computeKpisUseCase: ComputeKpisUseCase) {}

  /**
   * Endpoint de Métricas de Ocupación consumido por MS IA-MCP (IC-02.2)
   */
  @Get('occupancy')
  @HttpCode(HttpStatus.OK)
  async getOccupancyMetrics(
    @Headers('X-Internal-Service') internalService?: string,
  ): Promise<OccupancyMetricsResponse> {
    return await this.computeKpisUseCase.execute();
  }
}
