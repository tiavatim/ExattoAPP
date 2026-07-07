import api from './apiService';
import { ApiResponse } from 'src/interfaces/apiResponse';
import { ProdutoSeparacao } from 'src/interfaces/produtoSeparacao';
import { Separacao } from 'src/interfaces/separacao';

class PedidoService {
  async getSeparacoes(idUsuario: number): Promise<Separacao[]> {
    try {
      const response = await api.post<ApiResponse<Separacao[]>>('/Localizacao/GetSeparacoes', {
        id_Usuario: idUsuario,
      });

      if (response.data.success) {
        return response.data.data;
      } else {
        console.error('Erro ao buscar separações:', response.data.message);
        return [];
      }
    } catch (error: any) {
      console.error('Erro ao buscar separações:', error.message || error);
      return [];
    }
  }

  async getItensSeparacao(idSeparacao: number): Promise<ProdutoSeparacao[]> {
    try {
      const response = await api.post<ApiResponse<ProdutoSeparacao[]>>('/Localizacao/GetItensSeparacao', {
        id_Separacao: idSeparacao,
      });

      if (response.data.success) {
        return response.data.data;
      } else {
        console.error('Erro ao buscar itens:', response.data.message);
        return [];
      }
    } catch (error: any) {
      console.error('Erro ao buscar itens separação:', error.message || error);
      return [];
    }
  }

  async pausarSeparacao(idSeparacao: number): Promise<boolean> {
    try {
      const response = await api.post<ApiResponse<null>>('/Localizacao/PausarSeparacao', { idSeparacao });
      return response.data.success === true;
    } catch (error: any) {
      console.error('Erro ao pausar separação:', error.message || error);
      return false;
    }
  }

  async retomarSeparacao(idSeparacao: number): Promise<boolean> {
    try {
      const response = await api.post<ApiResponse<null>>('/Localizacao/RetomarSeparacao', { idSeparacao });
      return response.data.success === true;
    } catch (error: any) {
      console.error('Erro ao retomar separação:', error.message || error);
      return false;
    }
  }

  async finalizarSeparacao(idSeparacao: number): Promise<boolean> {
    try {
      const response = await api.post<ApiResponse<null>>('/Localizacao/FinalizarSeparacao', { idSeparacao });
      return response.data.success === true;
    } catch (error: any) {
      console.error('Erro ao finalizar separação:', error.message || error);
      return false;
    }
  }

 async inserirProdutoSeparacao(
  idSeparacao: number,
  idProduto: number,
  qtSeparada: number,
  qtEsperada: number,
  idLocalizacao: number,
  idOrdem: number,
  idUsuario: number
): Promise<{ success: boolean; message?: string }> {
  try {
    const response = await api.post<ApiResponse<null>>('/Localizacao/InserirProdutoSeparacao', {
      idSeparacao,
      idProduto,
      qtSeparada,
      qtEsperada,
      idLocalizacao,
      idOrdem,
      idUsuario,
    });


    if (response.data.success) {
      return { success: true };
    } else {
      return { success: false, message: response.data.message || 'Erro desconhecido da API' };
    }
  } catch (error: any) {
    console.error('Erro ao inserir item de separação:', error.message || error);
    return { success: false, message: 'Erro de rede ou servidor' };
  }
}





}

export default new PedidoService();
