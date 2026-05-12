import { MasterDataPage } from '@/components/master-data/master-data-page';
import { masterDataConfigs } from '@/lib/master-data';

export default function WarehousesPage() {
  return <MasterDataPage config={masterDataConfigs.warehouses} />;
}
