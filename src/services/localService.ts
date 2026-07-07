import api from './apiService';
import { ApiResponse } from 'src/interfaces/apiResponse';
import { LocalDetalhado } from 'src/interfaces/localDetalhadoInterface';

async function getLocaisDetalhados(): Promise<LocalDetalhado[]> {
  const response = await api.post<ApiResponse<LocalDetalhado[]>>('/Localizacao/GetLocaisDetalhado');

  if (response.data.success) {

    return response.data.data;
  } else {
    throw new Error(response.data.message || 'Erro ao buscar locais detalhados');
  }
}

async function getLocaisDetalhadoPaletes(): Promise<LocalDetalhado[]> {
  const response = await api.post<ApiResponse<LocalDetalhado[]>>('/Localizacao/GetLocaisDetalhadoPaletes');

  if (response.data.success) {
    return response.data.data;
  } else {
    throw new Error(response.data.message || 'Erro ao buscar paletes');
  }
}

async function getLocaisDetalhadoAtacado(): Promise<LocalDetalhado[]> {
  const response = await api.post<ApiResponse<LocalDetalhado[]>>('/Localizacao/GetLocaisDetalhadoAtacado');

  if (response.data.success) {
    return response.data.data;
  } else {
    throw new Error(response.data.message || 'Erro ao buscar Locais Atacado');
  }
}

async function inserirPalete(idUsuario: number): Promise<LocalDetalhado | null> {
  
  try {
    const response = await api.post<ApiResponse<LocalDetalhado>>('/Localizacao/InserirPalete', {
      idUsuario,
    });



    if (response.data.success) {

      return response.data.data;
    } else {
     
      throw new Error(response.data.message || 'Erro ao criar palete');
    }
  } catch (error: any) {
    console.error('❌ Erro ao criar palete (try/catch):', error.message || error);
    return null;
  }
}


async function associarProdutoPalete(
  locationId: number,
  productId: number,
  quantity: number
): Promise<boolean> {
  try {
    const response = await api.post<ApiResponse<null>>('/Localizacao/AssociarProdutoPalete', null, {
  params: {
    ilocation: locationId,
    iproduct: productId,
    quantity,
  },
});


    return response.data.success === true;
  } catch (error: any) {
    if (error.response) {
      console.error('❌ Erro na resposta da API:');
    } else {
      console.error('❌ Erro inesperado:', error.message || error);
    }
    return false;
  }
}

async function atualizarParentLocation(idLocation: number, idParentLocation: number): Promise<boolean> {
  try {
    const params = {
      ilocation: idLocation,
      iparenttLocation: idParentLocation,
    };

    const response = await api.post<ApiResponse<null>>('/Localizacao/AtualizarParentLocationAsync', null, {
      params,
    });

    if (response.data.success) {
      return true;
    } else {
      throw new Error(response.data.message || 'Erro ao atualizar localização do palete.');
    }
  } catch (error: any) {
    if (error.response) {
      console.error('❌ Erro na resposta da API:');
    } else if (error.request) {
      console.error('❌ Erro na requisição (sem resposta):');
      console.error(error.request);
    } else {
      console.error('❌ Erro inesperado:', error.message || error);
    }

    throw new Error('Falha ao comunicar com a API (AtualizarParentLocation)');
  }
}

export default {
  getLocaisDetalhados,
  getLocaisDetalhadoPaletes,
  inserirPalete,
  associarProdutoPalete,
  atualizarParentLocation,
  getLocaisDetalhadoAtacado
};
