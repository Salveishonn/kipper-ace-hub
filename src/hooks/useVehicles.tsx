import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface VehicleBrand {
  id: string;
  name: string;
  type: string;
  created_at: string;
}

export interface VehicleModel {
  id: string;
  brand_id: string;
  name: string;
  year_start: number | null;
  year_end: number | null;
  created_at: string;
}

export function useVehicleBrands(type?: string) {
  return useQuery({
    queryKey: ['vehicle-brands', type],
    queryFn: async () => {
      let query = supabase
        .from('vehicle_brands')
        .select('*')
        .order('name', { ascending: true });
      
      if (type) {
        query = query.eq('type', type);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as VehicleBrand[];
    }
  });
}

export function useVehicleModels(brandId?: string) {
  return useQuery({
    queryKey: ['vehicle-models', brandId],
    queryFn: async () => {
      if (!brandId) return [];

      const { data, error } = await supabase
        .from('vehicle_models')
        .select('*')
        .eq('brand_id', brandId)
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data as VehicleModel[];
    },
    enabled: !!brandId
  });
}
