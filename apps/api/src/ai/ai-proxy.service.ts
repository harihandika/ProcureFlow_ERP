import { HttpService } from '@nestjs/axios';
import { Injectable, InternalServerErrorException, NotFoundException, ServiceUnavailableException, HttpException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditPrResponseDto } from './dto/audit-pr.dto';
import { catchError, lastValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

@Injectable()
export class AiProxyService {
  private readonly logger = new Logger(AiProxyService.name);
  private readonly pythonAiUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.pythonAiUrl = this.configService.get<string>('PYTHON_AI_SERVICE_URL') || 'http://localhost:8000';
  }

  async auditPr(prId: string): Promise<AuditPrResponseDto> {
    const serviceKey = this.configService.get<string>('AI_SERVICE_API_KEY');
    if (!serviceKey) throw new ServiceUnavailableException('AI service authentication is not configured.');
    const url = `${this.pythonAiUrl}/ai/audit-pr`;
    
    try {
      const response = await lastValueFrom(
        this.httpService.post<AuditPrResponseDto>(
          url,
          { prId },
          { timeout: 35000, headers: { 'X-AI-Service-Key': serviceKey } }
        ).pipe(
          catchError((error: AxiosError) => {
            this.logger.error(`AI Service Request Failed: ${error.message}`, error.stack);
            
            if (error.code === 'ECONNREFUSED') {
              throw new ServiceUnavailableException('Layanan AI sedang tidak tersedia');
            }
            if (error.response) {
              const status = error.response.status;
              const data: unknown = error.response.data;
              const detail = typeof data === 'object' && data !== null && 'detail' in data && typeof data.detail === 'string'
                ? data.detail : 'Error dari layanan AI';
              if (status === 404) {
                throw new NotFoundException(detail);
              }
              if (status === 429) {
                throw new HttpException('Kuota AI harian tercapai. Silakan coba lagi besok.', 429);
              }
              throw new HttpException(detail, status);
            }
            throw new InternalServerErrorException('Terjadi kesalahan pada layanan AI');
          }),
        ),
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}
