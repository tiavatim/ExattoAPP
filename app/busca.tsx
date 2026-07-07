import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Pressable, ActivityIndicator, FlatList, StatusBar, Image, Modal, Keyboard, } from 'react-native';
import DrawerSceneWrapper from 'src/components/drawer';
import Header from 'src/components/header';
import buscaService from 'src/services/buscaService';
import { LocalOuProduto, ResultadoBusca } from 'src/interfaces/buscaInterface';
import ViewShot from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import Toast from 'react-native-toast-message';
import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import BuscaDropdown from '@/components/buscaDropdown';

export default function Busca() {
  const [tipoBusca, setTipoBusca] = useState<'local' | 'sku'>('local');
  const [itens, setItens] = useState<LocalOuProduto[]>([]);
  const [valorSelecionado, setValorSelecionado] = useState<string>('');
  const [resultado, setResultado] = useState<ResultadoBusca[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [imagemSelecionada, setImagemSelecionada] = useState<string | null>(null);

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
    carregarItens();
  }, [tipoBusca]);

  const carregarItens = async () => {
    try {
      setErro(null);
      setValorSelecionado('');
      const dados = tipoBusca === 'local' ? await buscaService.getLocais() : await buscaService.getProdutos();
      setItens(dados);
    } catch (err: any) {
      console.error('Erro em carregarItens:', err);
      setErro('Erro ao carregar opções de busca.');
    }
  };

  useEffect(() => {
    if (valorSelecionado) executarBusca();
  }, [valorSelecionado]);

  const executarBusca = async () => {
    if (!valorSelecionado) {
      setErro(`Selecione um ${tipoBusca === 'local' ? 'local' : 'produto'}.`);
      return;
    }
    try {
      setErro(null);
      setLoading(true);
      const dados = await buscaService.buscar(tipoBusca, valorSelecionado);
      setResultado(dados);
    } catch (err: any) {
      setErro(err.message || 'Erro na requisição.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DrawerSceneWrapper>
      <ViewShot ref={viewShotRef} style={{ flex: 1 }}>
        <View className="flex-1 items-center bg-[#d1ccbd]">
          <StatusBar backgroundColor="#d1ccbd" barStyle="light-content" />
          <Header onPrint={handlePrint} />

          <View className="w-full px-4 py-4">
            <Text className="text-center mb-4" style={{ fontSize: 24, color: '#163029', fontFamily: 'Sina-Nova-Bold' }}>🔎 Buscar Itens</Text>

            <View className="flex-row justify-around mb-4">
              <Pressable onPress={() => setTipoBusca('local')} className={`px-4 py-2 rounded-full ${tipoBusca === 'local' ? 'bg-[#163029]' : 'bg-[#a1a1a1]'}`}>
                <Text style={{ color: '#fff', fontFamily: 'Sina-Nova-Bold' }}>Por Local</Text>
              </Pressable>
              <Pressable onPress={() => setTipoBusca('sku')} className={`px-4 py-2 rounded-full ${tipoBusca === 'sku' ? 'bg-[#163029]' : 'bg-[#a1a1a1]'}`}>
                <Text style={{ color: '#fff', fontFamily: 'Sina-Nova-Bold' }}>Por Produto</Text>
              </Pressable>
            </View>

            <BuscaDropdown
              label={tipoBusca === 'local' ? 'Selecione o local' : 'Selecione o produto'}
              dados={itens || []}  
              valorSelecionado={valorSelecionado}
              aoSelecionar={setValorSelecionado}
            />

            <Pressable onPress={executarBusca} className="bg-[#163029] rounded-lg py-3 items-center mb-4">
              <Text style={{ color: '#fff', fontFamily: 'Sina-Nova-Bold', fontSize: 16 }}>Buscar</Text>
            </Pressable>

            {erro && <Text style={{ color: '#b91c1c', textAlign: 'center', marginBottom: 8 }}>{erro}</Text>}

            {loading && <ActivityIndicator size="large" color="#163029" />}

            {!loading && resultado.length > 0 && (
              <FlatList
                data={resultado}
                keyExtractor={(_, i) => i.toString()}
                className="mt-2"
                contentContainerStyle={{ paddingBottom: 350 }}
                renderItem={({ item }) => (
                  <View className="bg-white rounded-lg p-3 mb-2 flex-row justify-between items-center">
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={{ fontFamily: 'Sina-Nova-Bold', color: '#163029', marginBottom: 4 }}>{item.ProductName}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                        <Feather name="tag" size={16} color="#2f4b44" />
                        <Text style={{ fontFamily: 'Sina-Nova-Regular', color: '#2f4b44', marginLeft: 6 }}>SKU: {item.Sku}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                        <Ionicons name="location-outline" size={16} color="#2f4b44" />
                        <Text style={{ fontFamily: 'Sina-Nova-Regular', color: '#2f4b44', marginLeft: 6 }}>Local: {item.LocationLabel}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <MaterialIcons name="inventory-2" size={16} color="#2f4b44" />
                        <Text style={{ fontFamily: 'Sina-Nova-Regular', color: '#2f4b44', marginLeft: 6 }}>Qtd: {item.Quantity}</Text>
                      </View>
                    </View>
                    {item.Ds_UrlImage && (
                      <Pressable onPress={() => setImagemSelecionada(item.Ds_UrlImage)}>
                        <Image source={{ uri: item.Ds_UrlImage }} style={{ width: 80, height: 80, borderRadius: 8 }} resizeMode="cover" />
                      </Pressable>
                    )}
                  </View>
                )}
              />
            )}

            <Modal visible={!!imagemSelecionada} transparent animationType="fade">
              <Pressable onPress={() => setImagemSelecionada(null)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
                <Image source={{ uri: imagemSelecionada! }} style={{ width: '100%', height: '70%', borderRadius: 16 }} resizeMode="contain" />
              </Pressable>
            </Modal>
          </View>
        </View>
      </ViewShot>
    </DrawerSceneWrapper>
  );
}
