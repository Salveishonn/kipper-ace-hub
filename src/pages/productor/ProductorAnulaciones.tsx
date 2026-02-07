import { useState } from "react";
import { FileX, Calendar, Search } from "lucide-react";
import { usePolicies } from "@/hooks/usePolicies";
import { useAuth } from "@/hooks/useAuth";
import { format, startOfMonth, endOfMonth, isWithinInterval, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ProductorAnulaciones = () => {
  const { user } = useAuth();
  const { data: allPolicies = [], isLoading } = usePolicies();
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [searchTerm, setSearchTerm] = useState('');

  // Filter policies for current productor
  const myPolicies = allPolicies.filter(p => p.assigned_productor_id === user?.id);

  // Get cancellations for selected month
  const [year, month] = selectedMonth.split('-').map(Number);
  const monthStart = startOfMonth(new Date(year, month - 1));
  const monthEnd = endOfMonth(new Date(year, month - 1));

  const cancellations = myPolicies.filter(p => 
    p.status === 'anulada' &&
    isWithinInterval(new Date(p.updated_at), { start: monthStart, end: monthEnd })
  );

  const filteredCancellations = cancellations.filter(p =>
    p.policy_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.vehicle_brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.vehicle_model?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Generate month options (last 12 months)
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return {
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy', { locale: es })
    };
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Anulaciones</h1>
          <p className="text-muted-foreground">Pólizas anuladas por mes</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-full">
            <FileX size={18} />
            <span className="font-bold">{filteredCancellations.length}</span>
            <span className="text-sm">anulaciones</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input
            placeholder="Buscar por número, marca o modelo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[200px]">
            <Calendar size={16} className="mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {filteredCancellations.length === 0 ? (
        <div className="bg-card rounded-2xl shadow-soft p-12 text-center">
          <FileX size={48} className="mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-foreground mb-2">Sin anulaciones</p>
          <p className="text-muted-foreground">No hay pólizas anuladas en este período</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl shadow-soft overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Póliza</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Ramo</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Detalle</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Aseguradora</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Fecha Anulación</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Motivo</th>
              </tr>
            </thead>
            <tbody>
              {filteredCancellations.map((policy) => (
                <tr key={policy.id} className="border-t border-border hover:bg-muted/30">
                  <td className="p-4 font-medium text-foreground">
                    {policy.policy_number || policy.id.slice(0, 8)}
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium capitalize">
                      {policy.policy_type}
                    </span>
                  </td>
                  <td className="p-4 text-muted-foreground">
                    {policy.vehicle_brand && policy.vehicle_model 
                      ? `${policy.vehicle_brand} ${policy.vehicle_model}`
                      : '-'}
                  </td>
                  <td className="p-4 text-muted-foreground">
                    {policy.insurance_company?.name || '-'}
                  </td>
                  <td className="p-4 text-muted-foreground">
                    {format(new Date(policy.updated_at), 'dd/MM/yyyy')}
                  </td>
                  <td className="p-4 text-muted-foreground">
                    {policy.notes || 'Sin especificar'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ProductorAnulaciones;
