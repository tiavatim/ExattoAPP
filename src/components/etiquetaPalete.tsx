import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import EquipamentoService from '@/services/equipamentoService';
import PrintService from '@/services/printService';
import { EquipamentoHost } from '@/interfaces/equipamentoHostInterface';
import DropDownPicker from 'react-native-dropdown-picker';
import Toast from 'react-native-toast-message';
import QRCode from 'react-native-qrcode-svg';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

interface Props {
  numberCode: string;
  idLocation: string;
}

export default function EtiquetaPalete({ numberCode, idLocation }: Props) {
  const [equipamentos, setEquipamentos] = useState<EquipamentoHost[]>([]);
  const [equipamentoSelecionado, setEquipamentoSelecionado] = useState<EquipamentoHost | null>(null);
  const [open, setOpen] = useState(false);
  const [valor, setValor] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const qrRef = useRef<any>(null);

  useEffect(() => {
    carregarEquipamentos();
  }, []);

  async function carregarEquipamentos() {
    try {
      const lista = await EquipamentoService.getEquipamentos();
      setEquipamentos(lista);
      if (lista.length > 0) {
        setEquipamentoSelecionado(lista[0]);
        setValor(lista[0].IdEquipamento);
      }
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Erro ao carregar impressoras',
        text2: err.message || '',
      });
    }
  }

  async function gerarEtiquetaPDF() {
    if (!equipamentoSelecionado) {
      Toast.show({ type: 'error', text1: 'Selecione uma impressora' });
      return;
    }
    try {
      setLoading(true);

      // Gerar QRCode em Base64
      const svgData = await new Promise<string>((resolve, reject) => {
        if (!qrRef.current) return reject(new Error("QR Ref não encontrado"));
        qrRef.current.toDataURL((data: string) => resolve(data));
      });

      // Converter Base64 → Uint8Array
      const qrImageBytes = Uint8Array.from(atob(svgData), (c) => c.charCodeAt(0));

      // Criar PDF 100x120mm → 283pt x 340pt
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([283, 340]);
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // Adicionar código no topo
      page.drawText(numberCode, {
        x: 20,
        y: 300,
        size: 48,
        font,
        color: rgb(0, 0, 0),
      });

      // Adicionar QRCode
      const qrImage = await pdfDoc.embedPng(qrImageBytes);
      const qrDims = qrImage.scaleToFit(250, 250);
      page.drawImage(qrImage, {
        x: 15,
        y: 20,
        width: qrDims.width,
        height: qrDims.height,
      });

      // Salvar em Base64 (PDF válido)
      const pdfBase64 = await pdfDoc.saveAsBase64({ dataUri: false });

      // 🔹 Enviar direto para impressora
      const ok = await PrintService.enviarPdfGrande(equipamentoSelecionado, pdfBase64);

      if (ok) {
        Toast.show({ type: 'success', text1: 'Etiqueta enviada para impressão' });
      } else {
        console.error("❌ Falha ao imprimir etiqueta", { equipamento: equipamentoSelecionado });
        Toast.show({
          type: 'error',
          text1: 'Falha ao imprimir etiqueta',
          text2: `Equipamento: ${equipamentoSelecionado?.DsEquipamento || 'desconhecido'}`,
        });
      }
    } catch (err: any) {
      console.error("❌ Erro ao gerar ou enviar etiqueta:", err);
      Toast.show({
        type: 'error',
        text1: 'Erro ao imprimir',
        text2: err.message || JSON.stringify(err),
        autoHide: false,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <View>
      {/* QR invisível apenas para gerar base64 */}
      <QRCode
        value={idLocation}
        size={150}
        getRef={(c) => (qrRef.current = c)}
        quietZone={0}
      />

      <DropDownPicker
        open={open}
        setOpen={setOpen}
        value={valor}
        setValue={(callback) => {
          const id = callback(valor) as number;
          setValor(id);
          const encontrado = equipamentos.find((e) => e.IdEquipamento === id);
          if (encontrado) setEquipamentoSelecionado(encontrado);
        }}
        items={(equipamentos || []).map((e) => ({
          label: `${e.DsEquipamento} (${e.DsLocalEquipamento})`,
          value: e.IdEquipamento,
        }))}
        multiple={false}
        placeholder="Selecione uma impressora"
        style={{ marginTop: 16, borderColor: '#163029' }}
        textStyle={{ fontFamily: 'Sina-Nova-Regular', color: '#163029' }}
      />

      <Pressable
        onPress={gerarEtiquetaPDF}
        disabled={loading}
        style={{
          backgroundColor: '#2F4B44',
          paddingVertical: 12,
          paddingHorizontal: 20,
          borderRadius: 6,
          marginTop: 16,
          alignItems: 'center',
        }}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: '#fff', fontFamily: 'Sina-Nova-Bold' }}>
            🖨️ Imprimir Etiqueta
          </Text>
        )}
      </Pressable>
    </View>
  );
}
