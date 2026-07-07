import api from './apiService';
import { Reposicao } from '@/interfaces/reposicaoInterface';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

const ReposicaoService = {
  async getReposicoes(): Promise<Reposicao[]> {
    const response = await api.post<ApiResponse<Reposicao[]>>('/Localizacao/GetReposicoes');

    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.message || 'Erro ao buscar reposições.');
    }
  },

  async iniciarReposicao(idReposicao: number, idUsuario: number): Promise<void> {
    const response = await api.post<ApiResponse<null>>('/Localizacao/IniciarReposicao', {
      idReposicao,
      idUsuario,
    });

    if (!response.data.success) {
      throw new Error(response.data.message || 'Erro ao iniciar reposição.');
    }
  },

  async finalizarReposicao(idReposicao: number, idUsuario: number): Promise<void> {
    const response = await api.post<ApiResponse<null>>('/Localizacao/FinalizarReposicao', {
      idReposicao,
      idUsuario,
    });

    if (!response.data.success) {
      throw new Error(response.data.message || 'Erro ao finalizar reposição.');
    }
  },

  async inserirReposicao(   idProduto: number,  idLocal: number,  quantidade: number,  idSys: number ): Promise<void> {
  try {
    const response = await api.post<ApiResponse<null>>('/Localizacao/InserirReposicao', {
      idProduto,      idLocal,      qtQuantidade: quantidade,      idSys,     });
    if (!response.data.success) {
      console.warn('[inserirReposicao] Erro na resposta:', response.data.message);
      throw new Error(response.data.message || 'Erro ao inserir reposição.');
    }
  } catch (error: any) {
    console.error('[inserirReposicao] Erro durante a chamada:', error);
    throw error;
  }
}



};

export default ReposicaoService;
