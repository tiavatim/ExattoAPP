import api from './apiService';

class LoginService {
  async Login(user: string, password: string): Promise<any> {
    try {
      const response = await api.post('Conta/LoginApp', {
        usuario: user,
        senha: password,
      });

      return response;
    } catch (error: any) {
      console.error('Erro ao realizar login:', error.message || error);
      return error.response;
    }
  }

  async ObterAcessosExattoAppPorUsuario(idUsuario: number): Promise<any> {
    try {
      const response = await api.post('Acesso/ObterAcessosExattoAppPorUsuario', {
        idUsuario,
      });
      return response.data;
    } catch (error: any) {
      console.error('Erro ao obter acessos:', error.message || error);
      return error.response?.data;
    }
  }

  async UsuarioTemAcessoExattoApp(idUsuario: number, dsUrl: string): Promise<any> {
    try {
      const response = await api.post('Acesso/UsuarioTemAcessoExattoApp', {
        idUsuario,
        dsUrl,
      });
      return response.data;
    } catch (error: any) {
      console.error('Erro ao validar acesso:', error.message || error);
      return error.response?.data;
    }
  }

  async ObterUrlsExattoApp(idUsuario: number): Promise<any> {
    try {
      const response = await api.post('Acesso/ObterUrlsExattoApp', {
        idUsuario,
      });
      return response.data;
    } catch (error: any) {
      console.error('Erro ao obter URLs:', error.message || error);
      return error.response?.data;
    }
  }
}

export default new LoginService();
