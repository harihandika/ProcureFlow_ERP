import { HttpService } from '@nestjs/axios';
import { Injectable, InternalServerErrorException, NotFoundException, ServiceUnavailableException, HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditPrResponseDto } from './dto/audit-pr.dto';
import { catchError, lastValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

@Injectable()
export class AiProxyService {
  private readonly pythonAiUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.pythonAiUrl = this.configService.get<string>('PYTHON_AI_SERVICE_URL') || 'http://localhost:8000';
  }

  async auditPr(prId: string): Promise<AuditPrResponseDto> {
    const url = `${this.pythonAiUrl}/ai/audit-pr`;
    
    try {
      const response = await lastValueFrom(
        this.httpService.post<AuditPrResponseDto>(
          url,
          { prId },
          { timeout: 35000 }
        ).pipe(
          catchError((error: AxiosError) => {
            if (error.code === 'ECONNREFUSED') {
              throw new ServiceUnavailableException('Layanan AI sedang tidak tersedia');
            }
            if (error.response) {
              const status = error.response.status;
              const detail = (error.response.data as any)?.detail || 'Error dari layanan AI';
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
