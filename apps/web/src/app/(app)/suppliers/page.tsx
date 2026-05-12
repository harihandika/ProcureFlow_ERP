import { MasterDataPage } from '@/components/master-data/master-data-page';
import { masterDataConfigs } from '@/lib/master-data';

export default function SuppliersPage() {
  return <MasterDataPage config={masterDataConfigs.suppliers} />;
}
