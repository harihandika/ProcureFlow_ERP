'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertCircle, AlertTriangle, CheckCircle, Info, Loader2, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { auditPr } from '@/lib/ai-api';
import { formatCurrency } from '@/lib/utils';
import { getApiErrorMessage } from '@/lib/api-error';

interface AiAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  prId: string;
  prTitle: string;
}

export function AiAuditModal({ isOpen, onClose, prId, prTitle }: AiAuditModalProps) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['ai-audit', prId],
    queryFn: () => auditPr(prId),
    enabled: isOpen && Boolean(prId),
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    retry: 1,
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-violet-700">
            <Sparkles className="h-5 w-5" />
            AI Risk Audit
          </DialogTitle>
          <DialogDescription>{prTitle}</DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-violet-100">
                <Sparkles className="h-8 w-8 animate-pulse text-violet-600" />
                <div className="absolute inset-0 rounded-full border-4 border-violet-200 border-t-violet-600 animate-spin"></div>
              </div>
              <p className="text-sm font-medium text-slate-500 animate-pulse">Sedang menganalisis risiko PR ini...</p>
            </div>
          ) : isError ? (
            <div className="rounded-md bg-red-50 p-4 border border-red-200">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Analisis Gagal</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{getApiErrorMessage(error, 'Gagal menghubungi server AI. Pastikan API key sudah diset dan kuota tersedia.')}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : data ? (
            <div className="space-y-6">
              {/* Score Card */}
              <div className={`rounded-xl border p-5 flex items-center justify-between ${
                data.riskLevel === 'LOW' ? 'bg-green-50 border-green-200' :
                data.riskLevel === 'MEDIUM' ? 'bg-yellow-50 border-yellow-200' :
                'bg-red-50 border-red-200'
              }`}>
                <div>
                  <h4 className={`text-sm font-semibold uppercase tracking-wider ${
                    data.riskLevel === 'LOW' ? 'text-green-700' :
                    data.riskLevel === 'MEDIUM' ? 'text-yellow-700' :
                    'text-red-700'
                  }`}>
                    {data.riskLevel} RISK
                  </h4>
                  <p className="text-xs mt-1 text-slate-600">Berdasarkan kalkulasi dampak budget & anomali harga</p>
                </div>
                <div className="text-center">
                  <span className={`text-4xl font-bold ${
                    data.riskLevel === 'LOW' ? 'text-green-600' :
                    data.riskLevel === 'MEDIUM' ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {data.riskScore}
                  </span>
                  <span className="text-xs text-slate-500 block">/ 100</span>
                </div>
              </div>

              {/* Budget Impact */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                  Dampak Budget
                </h3>
                <div className="rounded-lg border bg-white p-4 text-sm">
                  <div className="flex justify-between mb-2">
                    <span className="text-slate-500">Sisa Sebelum PR:</span>
                    <span className="font-medium">{formatCurrency(data.budgetImpact.remainingBefore)}</span>
                  </div>
                  <div className="flex justify-between mb-4">
                    <span className="text-slate-500">Sisa Setelah PR:</span>
                    <span className="font-medium text-red-600">{formatCurrency(data.budgetImpact.remainingAfter)}</span>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500">Kapasitas Budget Terpakai</span>
                      <span className="font-medium">{data.budgetImpact.usagePercentage.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          data.budgetImpact.usagePercentage > 90 ? 'bg-red-500' :
                          data.budgetImpact.usagePercentage > 75 ? 'bg-yellow-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min(data.budgetImpact.usagePercentage, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Findings */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-violet-500"></div>
                  Temuan AI ({data.findings.length})
                </h3>
                <div className="space-y-3">
                  {data.findings.length === 0 ? (
                    <div className="text-sm text-slate-500 italic p-3 border rounded-md">Tidak ada anomali atau risiko yang ditemukan.</div>
                  ) : (
                    data.findings.map((finding, idx) => (
                      <div key={idx} className="flex items-start gap-3 rounded-lg border p-3 text-sm">
                        {finding.severity === 'CRITICAL' ? (
                          <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                        ) : finding.severity === 'WARNING' ? (
                          <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                        ) : (
                          <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <div className="font-semibold text-slate-800">
                            {finding.severity} &mdash; {finding.category.replace('_', ' ')}
                          </div>
                          <p className="mt-1 text-slate-600 leading-relaxed">{finding.message}</p>
                          {finding.affectedItemSku && (
                            <div className="mt-2 inline-block px-2 py-1 bg-slate-100 text-xs text-slate-600 rounded">
                              SKU: {finding.affectedItemSku}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Recommendation */}
              <div className="rounded-lg border bg-slate-50 p-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  Rekomendasi Tindakan: <span className="text-violet-700">{data.recommendation.action}</span>
                </h3>
                <p className="text-sm text-slate-600 italic">
                  &quot;{data.recommendation.justification}&quot;
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
