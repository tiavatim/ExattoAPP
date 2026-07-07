import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Pressable, ActivityIndicator, StatusBar } from 'react-native';
import DrawerSceneWrapper from '@/components/drawer';
import Header from '@/components/header';
import Toast from 'react-native-toast-message';
import DropDownPicker from 'react-native-dropdown-picker';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

import { EquipamentoHost } from '@/interfaces/equipamentoHostInterface';
import EquipamentoService from '@/services/equipamentoService';
import PrintService from '@/services/printService';
import localService from '@/services/localService';
import { LocalDetalhado } from '@/interfaces/localDetalhadoInterface';

// 🔹 Imports para captura
import ViewShot from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';

export default function EtiquetaLocal() {
    const [locais, setLocais] = useState<LocalDetalhado[]>([]);
    const [localSelecionado, setLocalSelecionado] = useState<LocalDetalhado | null>(null);
    const [equipamentos, setEquipamentos] = useState<EquipamentoHost[]>([]);
    const [equipamentoSelecionado, setEquipamentoSelecionado] = useState<EquipamentoHost | null>(null);
    const [openLocal, setOpenLocal] = useState(false);
    const [openEquip, setOpenEquip] = useState(false);
    const [valor, setValor] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);

    // 🔹 Ref para captura
    const viewShotRef = useRef<ViewShot>(null);

    const handlePrint = async () => {
        try {
            if (!viewShotRef.current) return;

            const uri = await viewShotRef.current.capture();
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                Toast.show({ type: 'error', text1: 'Permissão negada', text2: 'Ative acesso à galeria.' });
                return;
            }
            await MediaLibrary.saveToLibraryAsync(uri);
            Toast.show({ type: 'success', text1: '📸 Print salvo na galeria!' });
        } catch (err: any) {
            Toast.show({ type: 'error', text1: 'Erro ao salvar print', text2: err.message || 'Tente novamente.' });
        }
    };

    useEffect(() => {
  async function carregar() {
    try {
      const listaLocais = await localService.getLocaisDetalhadoAtacado();
      setLocais(listaLocais);

      const listaEquip = await EquipamentoService.getEquipamentos();

      // 🔹 Filtra somente impressoras
      const apenasImpressoras = listaEquip.filter(
        (e: any) => e.TpEquipamento === 'IMPRESSORA'
      );

      setEquipamentos(apenasImpressoras);

      if (apenasImpressoras.length > 0) {
        setEquipamentoSelecionado(apenasImpressoras[0]);
        setValor(apenasImpressoras[0].IdEquipamento);
      }
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Erro ao carregar dados',
        text2: err.message || 'Tente novamente.',
      });
    }
  }
  carregar();
}, []);


    const imprimirEtiqueta = async () => {
        if (!localSelecionado || !equipamentoSelecionado) {
            Toast.show({ type: 'error', text1: 'Selecione o local e a impressora.' });
            return;
        }
        try {
            setLoading(true);

            const barcodeUrl = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${localSelecionado.Code}&scale=3&height=10`;

            const pdfDoc = await PDFDocument.create();
            const pageWidth = 283; // 100mm
            const pageHeight = 99; // 35mm
            const page = pdfDoc.addPage([pageWidth, pageHeight]);
            const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

            // Texto no topo (Label_Code)
            const textSize = 22;
            const textWidth = font.widthOfTextAtSize(localSelecionado.Label_Code, textSize);
            const textX = (pageWidth - textWidth) / 2;
            const textY = pageHeight - 25;
            page.drawText(localSelecionado.Label_Code, {
                x: textX,
                y: textY,
                size: textSize,
                font,
                color: rgb(0, 0, 0),
            });

            // Barcode (usando Code)
            const barcodeBytes = await fetch(barcodeUrl).then(res => res.arrayBuffer());
            const barcodeImage = await pdfDoc.embedPng(barcodeBytes);

            const targetWidth = pageWidth - 40;
            const scale = targetWidth / barcodeImage.width;
            const targetHeight = barcodeImage.height * scale;

            const imgX = (pageWidth - targetWidth) / 2;
            const imgY = (pageHeight - targetHeight) / 2 - 10;

            page.drawImage(barcodeImage, {
                x: imgX,
                y: imgY,
                width: targetWidth,
                height: targetHeight,
            });

            // Salva PDF em base64
            const pdfBase64 = await pdfDoc.saveAsBase64({ dataUri: false });

            // Envia para impressora
            const ok = await PrintService.enviarPdfPequena(equipamentoSelecionado, pdfBase64);
            if (ok) {
                Toast.show({ type: 'success', text1: 'Etiqueta enviada para impressão!' });
            } else {
                Toast.show({
                    type: 'error',
                    text1: 'Falha ao imprimir etiqueta',
                    text2: equipamentoSelecionado?.DsEquipamento || '',
                });
            }

        } catch (err: any) {
            console.error('❌ Erro ao imprimir etiqueta local:', err);
            Toast.show({ type: 'error', text1: 'Erro ao gerar etiqueta', text2: err.message || 'Tente novamente.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <DrawerSceneWrapper>
            {/* 🔹 Envolve toda a tela para print */}
            <ViewShot ref={viewShotRef} style={{ flex: 1 }}>
                <View style={{ flex: 1, backgroundColor: '#d1ccbd' }}>
                    <StatusBar backgroundColor="#d1ccbd" barStyle="light-content" />
                    <Header onPrint={handlePrint} />
                    <View style={{ padding: 16 }}>
                        <Text style={{ fontSize: 22, fontFamily: 'Sina-Nova-Bold', color: '#163029', marginBottom: 16 }}>
                            🏷️ Imprimir Etiqueta de Local
                        </Text>

                        {/* Dropdown de Locais */}
                        <DropDownPicker
                            open={openLocal}
                            setOpen={setOpenLocal}
                            value={localSelecionado?.Code || null}
                            setValue={(callback) => {
                                const code = callback(localSelecionado?.Code || null) as string;
                                const encontrado = locais.find(l => l.Code === code);
                                setLocalSelecionado(encontrado ?? null);
                            }}
                            items={(locais || []).map(l => ({
                                label: `${l.Label_Code} (${l.Code})`,
                                value: l.Code,
                            }))}
                            placeholder="Selecione o local"
                            style={{ borderColor: '#163029', marginBottom: 24 }}
                            textStyle={{ fontFamily: 'Sina-Nova-Regular', color: '#163029' }}
                            searchable
                            searchPlaceholder="Digite ou bip o local"
                            zIndex={2000}
                            zIndexInverse={1000}
                        />

                        {/* Dropdown de Impressoras */}
                        <DropDownPicker
                            open={openEquip}
                            setOpen={setOpenEquip}
                            value={valor}
                            setValue={callback => {
                                const id = callback(valor) as number;
                                setValor(id);
                                const encontrado = equipamentos.find(e => e.IdEquipamento === id);
                                if (encontrado) setEquipamentoSelecionado(encontrado);
                            }}
                            items={(equipamentos || []).map(e => ({
                                label: `${e.DsCategoriaEquipamento} (${e.DsLocalEquipamento}) - ${e.DsHost}`,
                                value: e.IdEquipamento,
                            }))}
                            placeholder="Selecione a impressora"
                            style={{ borderColor: '#163029' }}
                            textStyle={{ fontFamily: 'Sina-Nova-Regular', color: '#163029' }}
                            searchable
                            searchPlaceholder="Digite para procurar impressora"
                            zIndex={1000}
                            zIndexInverse={2000}
                        />



                        <Pressable
                            onPress={imprimirEtiqueta}
                            disabled={loading}
                            style={{
                                backgroundColor: '#2F4B44',
                                paddingVertical: 12,
                                paddingHorizontal: 20,
                                borderRadius: 6,
                                marginTop: 24,
                                alignItems: 'center',
                            }}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={{ color: '#fff', fontFamily: 'Sina-Nova-Bold' }}>🖨️ Imprimir Etiqueta</Text>
                            )}
                        </Pressable>
                    </View>
                </View>
            </ViewShot>
        </DrawerSceneWrapper>
    );
}
