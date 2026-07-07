import React, { useEffect, useRef, useState } from 'react';
import {  View,  Text,  Pressable,  TextInput,  ActivityIndicator,  StatusBar,  Platform,  KeyboardAvoidingView,} from 'react-native';
import Header from '@/components/header';
import DrawerSceneWrapper from '@/components/drawer';
import buscaService from '@/services/buscaService';
import Toast from 'react-native-toast-message';
import { LocalOuProduto } from '@/interfaces/buscaInterface';
import BuscaDropdown from '@/components/buscaDropdown';


// 🔹 Importações para print
import ViewShot from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';

export default function ReporVarejo() {
  const [produtos, setProdutos] = useState<LocalOuProduto[]>([]);
  const [locais, setLocais] = useState<LocalOuProduto[]>([]);

  const [produto, setProduto] = useState<string>('');
  const [local, setLocal] = useState<string>('');
  const [quantidade, setQuantidade] = useState('');

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const inputQuantidadeRef = useRef<TextInput>(null);

  // 🔹 Ref para captura de tela
  const viewShotRef = useRef<ViewShot>(null);

  const handlePrint = async () => {
    try {
      if (!viewShotRef.current) return;

      const uri = await viewShotRef.current.capture();

      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({
          type: 'error',
          text1: 'Permissão negada',
          text2: 'Ative acesso à galeria.',
        });
        return;
      }

      await MediaLibrary.saveToLibraryAsync(uri);
      Toast.show({ type: 'success', text1: '📸 Print salvo na galeria!' });
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Erro ao salvar print',
        text2: err.message || 'Tente novamente.',
      });
    }
  };

  useEffect(() => {
    carregarCampos();
  }, []);

  const carregarCampos = async () => {
    try {
      setErro(null);
      const listaProdutos = await buscaService.getProdutos();
      const listaLocais = await buscaService.getLocais();
      setProdutos(listaProdutos);
      setLocais(listaLocais);
    } catch (err) {
      setErro('Erro ao carregar produtos ou locais.');
    }
  };

  const enviarReposicao = async () => {
    if (!produto || !local || !quantidade.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Atenção',
        text2: 'Preencha todos os campos.',
        autoHide: false,
      });
      return;
    }

    try {
      setLoading(true);
      const retorno = await buscaService.transferirProduto(
        produto,
        local,
        Number(quantidade),
        'WH03ATC'
      );
      Toast.show({
        type: 'success',
        text1: 'Reposição realizada',
        text2: `Retorno: ${retorno}`,
        autoHide: false,
      });

      setProduto('');
      setLocal('');
      setQuantidade('');
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Erro',
        text2: err.message || 'Falha na requisição.',
        autoHide: false,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DrawerSceneWrapper>
      {/* 🔹 Envolve toda a tela para print */}
      <ViewShot ref={viewShotRef} style={{ flex: 1 }}>
        <KeyboardAvoidingView
          className="flex-1 bg-[#d1ccbd]"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}
        >
          <StatusBar backgroundColor="#d1ccbd" barStyle="light-content" />
          {/* 🔹 Header com botão de print */}
          <Header onPrint={handlePrint} />

          <View className="flex-1 w-full px-4 pt-4">
            <Text
              className="text-center mb-4"
              style={{ fontSize: 24, color: '#163029', fontFamily: 'Sina-Nova-Bold' }}
            >
              📦 Reposição Varejo
            </Text>

            <BuscaDropdown
              label="Selecione o produto"
              dados={produtos}
              valorSelecionado={produto}
              aoSelecionar={(val) => {
                setProduto(val);
                setTimeout(() => inputQuantidadeRef.current?.focus(), 300);
              }}
            />

            <BuscaDropdown
              label="Selecione o local de destino"
              dados={locais}
              valorSelecionado={local}
              aoSelecionar={(val) => {
                setLocal(val);
                setTimeout(() => inputQuantidadeRef.current?.focus(), 300);
              }}
            />

            <TextInput
              ref={inputQuantidadeRef}
              value={quantidade}
              onChangeText={setQuantidade}
              keyboardType="numeric"
              placeholder="Digite a quantidade"
              style={{
                backgroundColor: '#fff',
                borderRadius: 8,
                padding: 12,
                fontSize: 16,
                fontFamily: 'Sina-Nova-Regular',
                color: '#163029',
                marginBottom: 16,
                borderWidth: 1,
                borderColor: '#163029',
              }}
            />

            <Pressable
              onPress={enviarReposicao}
              disabled={loading}
              className="bg-[#163029] rounded-lg py-3 items-center mb-4"
            >
              {loading ? (
                <ActivityIndicator color="#d1ccbd" />
              ) : (
                <Text style={{ color: '#fff', fontFamily: 'Sina-Nova-Bold', fontSize: 16 }}>
                  Repor
                </Text>
              )}
            </Pressable>

            {erro && <Text className="text-red-700 text-center">{erro}</Text>}
          </View>
        </KeyboardAvoidingView>
      </ViewShot>
    </DrawerSceneWrapper>
  );
}
