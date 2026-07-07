import axios from 'axios';
import * as Print from 'expo-print';
import { EquipamentoHost } from '@/interfaces/equipamentoHostInterface';

interface PrintResponse {
  success: boolean;
  message?: string;
}

class PrintService {
  private async enviarPdfBase(
    equipamento: EquipamentoHost,
    pdfBase64: string,
    tipo: 'grande' | 'pequena'
  ): Promise<boolean> {
    const protocolos = ['http', 'https']; 

    for (const protocolo of protocolos) {
      try {
        const baseUrl = `${protocolo}://${equipamento.DsIpHost}:${protocolo === 'http' ? equipamento.CdPortaHttp : equipamento.CdPortaHttps}/api`;

        const formData = new FormData();
        formData.append('pdfFile', {
          uri: `data:application/pdf;base64,${pdfBase64}`,
          type: 'application/pdf',
          name: 'etiqueta.pdf',
        } as any);

        formData.append('idEquipamento', String(equipamento.IdEquipamento));

        const response = await axios.post<PrintResponse>(
          `${baseUrl}/Print/pdf/${tipo}`,
          formData,
          {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 10000,
          }
        );

        return response.status === 200 && response.data?.success !== false;
      } catch (error: any) {
        console.error(`❌ [PrintService] Erro usando ${protocolo.toUpperCase()} (${tipo})`);

        if (error.response) {
          console.error('🔻 Erro de resposta:', {
            status: error.response.status,
            headers: error.response.headers,
            data: error.response.data,
          });
        } else if (error.request) {
          console.error('🔻 Nenhuma resposta recebida do servidor:', error.request);
        } else {
          console.error('🔻 Erro de configuração da requisição:', error.message);
        }

        try {
          console.error(
            '🔍 Detalhes completos do erro:',
            JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
          );
        } catch (jsonErr) {
          console.error('❌ Falha ao serializar erro:', jsonErr);
        }
      }
    }

    return false; // Falhou nos dois protocolos
  }

  // ==============================
  // Métodos públicos
  // ==============================

  async enviarPdfGrande(equipamento: EquipamentoHost, pdfBase64: string): Promise<boolean> {
    return this.enviarPdfBase(equipamento, pdfBase64, 'grande');
  }

  async enviarPdfPequena(equipamento: EquipamentoHost, pdfBase64: string): Promise<boolean> {
    return this.enviarPdfBase(equipamento, pdfBase64, 'pequena');
  }

  async gerarPdfBase64(html: string): Promise<string> {
    const { base64 } = await Print.printToFileAsync({
      html,
      base64: true,
    });

    if (!base64) throw new Error('Erro ao gerar PDF em base64');
    return base64;
  }
}

export default new PrintService();
