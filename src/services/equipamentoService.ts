// src/services/equipamentoService.ts
import api from './apiService';
import { EquipamentoHost } from '@/interfaces/equipamentoHostInterface';

type EquipamentoResponse = {
  success: boolean;
  locations?: EquipamentoHost[];
  message?: string;
};

const EquipamentoService = {
  async getEquipamentos(): Promise<EquipamentoHost[]> {
    try {
      // aqui o <EquipamentoResponse> tipa o response.data
      const response = await api.post<EquipamentoResponse>('/Conecta/GetEquipamentos');

      if (response.data.success && response.data.locations) {
        return response.data.locations;
      } else {
        throw new Error(response.data.message || 'Erro ao buscar equipamentos.');
      }
    } catch (error: any) {
      console.error('[getEquipamentos] Erro:', error.message || error);
      throw error;
    }
  },
};

export default EquipamentoService;
