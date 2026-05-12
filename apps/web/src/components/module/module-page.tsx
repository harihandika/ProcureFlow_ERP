import { EnterpriseDataTable } from '@/components/data/enterprise-data-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { ModuleConfig } from '@/lib/dummy-data';

export function ModulePage({ config }: { config: ModuleConfig }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-normal text-slate-950">{config.title}</h1>
        <p className="max-w-3xl text-sm text-slate-600">{config.description}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {config.metrics.map((metric) => (
          <Card key={metric.label}>
            <CardHeader className="pb-2">
              <CardDescription>{metric.label}</CardDescription>
              <CardTitle className="text-2xl">{metric.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-500">{metric.caption}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <EnterpriseDataTable config={config} />
    </div>
  );
}
