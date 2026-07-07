import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, Pressable, TextInput, ActivityIndicator, StatusBar, Platform, KeyboardAvoidingView,
} from 'react-native';
import Header from 'src/components/header';
import DrawerSceneWrapper from 'src/components/drawer';
import buscaService from 'src/services/buscaService';
import Toast from 'react-native-toast-message';
import { LocalOuProduto } from 'src/interfaces/buscaInterface';
import BuscaDropdown from 'src/components/buscaDropdown';
import ViewShot from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';


export default function Transferencia() {
  const [produtos, setProdutos] = useState<LocalOuProduto[]>([]);
  const [locais, setLocais] = useState<LocalOuProduto[]>([]);
  const [produto, setProduto] = useState('');
  const [localOrigem, setLocalOrigem] = useState('');
  const [localDestino, setLocalDestino] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const inputQuantidadeRef = useRef<TextInput>(null);
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
    carregarCampos();
  }, []);

  const carregarCampos = async () => {
    try {
      setErro(null);
      const listaProdutos = await buscaService.getProdutos();
      const listaLocais = await buscaService.getLocais();
      setProdutos(listaProdutos);
      setLocais(listaLocais);
    } catch {
      setErro('Erro ao carregar produtos ou locais.');
    }
  };

  const enviarTransferencia = async () => {
    if (!produto || !localOrigem || !localDestino || !quantidade.trim()) {
      Toast.show({ type: 'error', text1: 'Atenção', text2: 'Preencha todos os campos.' });
      return;
    }

    try {
      setLoading(true);
      const retorno = await buscaService.transferirProduto(produto, localOrigem, Number(quantidade), localDestino);
      Toast.show({ type: 'success', text1: 'Transferência realizada', text2: `Retorno: ${retorno}` });
      setProduto('');
      setLocalOrigem('');
      setLocalDestino('');
      setQuantidade('');
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Erro', text2: err.message || 'Falha na requisição.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DrawerSceneWrapper>
      <ViewShot ref={viewShotRef} style={{ flex: 1 }}>
        <KeyboardAvoidingView
          className="flex-1 bg-[#d1ccbd]"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}
        >
          <StatusBar backgroundColor="#d1ccbd" barStyle="light-content" />
          <Header onPrint={handlePrint} />

          <View className="flex-1 w-full px-4 pt-4">
            <Text className="text-center mb-4" style={{ fontSize: 24, color: '#163029', fontFamily: 'Sina-Nova-Bold' }}>
              🔁 Transferência
            </Text>

            <BuscaDropdown
              label="Produto"
              dados={produtos}
              valorSelecionado={produto}
              aoSelecionar={(val) => {
                setProduto(val);
                setTimeout(() => inputQuantidadeRef.current?.blur(), 100);
              }}
              autoAvancar={() => setTimeout(() => inputQuantidadeRef.current?.blur(), 100)}
            />

       
            <BuscaDropdown
              label="Local de Origem"
              dados={locais}
              valorSelecionado={localDestino}
              aoSelecionar={(val) => {
                setLocalDestino(val);
                setTimeout(() => inputQuantidadeRef.current?.focus(), 100);
              }}
            />

                 <BuscaDropdown
              label="Local de Destino"
              dados={locais}
              valorSelecionado={localOrigem}
              aoSelecionar={(val) => {
                setLocalOrigem(val);
                setTimeout(() => inputQuantidadeRef.current?.blur(), 100);
              }}
              autoAvancar={() => setTimeout(() => inputQuantidadeRef.current?.blur(), 100)}
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

            <Pressable onPress={enviarTransferencia} disabled={loading} className="bg-[#163029] rounded-lg py-3 items-center mb-4">
              {loading ? (
                <ActivityIndicator color="#d1ccbd" />
              ) : (
                <Text style={{ color: '#fff', fontFamily: 'Sina-Nova-Bold', fontSize: 16 }}>
                  Transferir
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
