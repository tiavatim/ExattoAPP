// src/services/notificacaoService.ts
import api from './apiService';
import { ApiResponse } from 'src/interfaces/apiResponse';
import { Notificacao } from 'src/interfaces/notificacaoInterface';

class NotificacaoService {

  async getNotificacoes(idUsuario: number): Promise<Notificacao[]> {
    try {
      const response = await api.post<ApiResponse<Notificacao[]>>(
        '/ExattoApp/GetNotificacaoApp',
        { idUsuario }
      );
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Erro ao buscar notificações');
      }
    } catch (error: any) {
      console.error('❌ Erro getNotificacoes:', error.message || error);
      return [];
    }
  }


  async inserirNotificacao(
    idUsuarioOrigem: number,
    idUsuarioDestino: number,
    dsAssunto: string,
    dsTexto: string,
    idSys: number,
    dsLink?: string,
    dtNotificar?: string
  ): Promise<number | null> {
    try {
      const response = await api.post<ApiResponse<{ id: number }>>(
        '/ExattoApp/InserirNotificacaoApp',
        {
          idUsuarioOrigem,
          idUsuarioDestino,
          assunto: dsAssunto,
          texto: dsTexto,
          link: dsLink,
          idSys,
          dtNotificar,
        }
      );

      if (response.data.success) {
        return (response.data as any).id ?? null;
      } else {
        throw new Error(response.data.message || 'Erro ao inserir notificação');
      }
    } catch (error: any) {
      console.error('❌ Erro inserirNotificacao:', error.message || error);
      return null;
    }
  }


  async visualizarNotificacao(idNotificacao: number): Promise<Notificacao | null> {
    try {
      const response = await api.post<ApiResponse<Notificacao>>(
        '/ExattoApp/VisualizarNotificacaoApp',
        { idNotificacao }
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Erro ao visualizar notificação');
      }
    } catch (error: any) {
      console.error('❌ Erro visualizarNotificacao:', error.message || error);
      return null;
    }
  }
}

export default new NotificacaoService();
