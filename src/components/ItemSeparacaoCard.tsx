import React, {  useState } from 'react';
import { View, Text, Image, TouchableOpacity, Modal, TextInput, Pressable, ScrollView } from 'react-native';
import { ProdutoSeparacao } from 'src/interfaces/produtoSeparacao';
import { LocalDetalhado } from 'src/interfaces/localDetalhadoInterface';
import { Feather, Ionicons, Entypo } from '@expo/vector-icons';
import PedidoService from 'src/services/pedidoService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapaSeparacao from './mapaSeparacao';
import reposicaoService from 'src/services/reposicaoService';

interface Props {
  item: ProdutoSeparacao;
  onAtualizarLista: () => void;
  onAtualizarSeparacaoAtiva?: () => void;
  onPular?: () => void;
  locais: LocalDetalhado[];
  itensSeparacao: ProdutoSeparacao[];
}

export default function ItemSeparacaoCard({
  item,
  onAtualizarLista,
  onAtualizarSeparacaoAtiva,
  onPular,
  locais,
  itensSeparacao,
}: Props) {


  const [modalVisible, setModalVisible] = useState(false);
  const [modalSeparar, setModalSeparar] = useState(false);
  const [modalMapaVisible, setModalMapaVisible] = useState(false);
  const [qtSeparar, setQtSeparar] = useState(String(item.QtVendida ?? 0));
  const [loadingSeparar, setLoadingSeparar] = useState(false);
  const [loadingPular, setLoadingPular] = useState(false);
  const [oculto, setOculto] = useState(false);

  const estoqueNegativo = item.StockQuantity < 0;
  const localVazio = !item.DsLocalizacao;
  const quantidadeOk = item.QtSeparada >= item.QtVendida;




  function converterProdutoParaItemSeparacao(produto: ProdutoSeparacao) {
    return {
      produto: produto.DsProduto,
      codigo: produto.CdProduto,
      idProduto: produto.IdProdutoPedido,
      quantidade: produto.QtVendida,
      separado: produto.QtSeparada >= produto.QtVendida,
      local: {
        aisle: produto.AisleCode,
        rack: Number(produto.RackCode),
        shelf: Number(produto.ShelfCode),
        bin: produto.BinCode,
        pickingOrder: produto.PickingOrder,
        ds_LocalProduto: produto.DsLocalizacao,
        idLocalProduto: produto.IdLocalizacao,
        urlImagem: produto.ImageUrl,
      },
    };
  }

  async function confirmarSeparacao() {
    const qt = Number(qtSeparar);
    if (!qt || qt <= 0) return;
    setOculto(true);
    setLoadingSeparar(true);
    setModalSeparar(false);
    try {
      const usuarioStr = await AsyncStorage.getItem('@user');
      const usuario = usuarioStr ? JSON.parse(usuarioStr) : null;
      const resultado = await PedidoService.inserirProdutoSeparacao(
        item.IdSeparacao,
        item.IdProdutoPedido,
        qt,
        item.QtVendida,  // qtEsperada
        item.IdLocalizacao,
        999,             // idOrdem
        usuario?.id
      );
      if (resultado?.success) {
        onAtualizarLista();
        onAtualizarSeparacaoAtiva?.();
      } else {
        setOculto(false);
        alert(resultado?.message || 'Erro ao separar item');
      }
    } catch {
      setOculto(false);
      alert('Falha de comunicação ao separar item');
    } finally {
      setLoadingSeparar(false);
    }
  }

  async function pularItem() {
    setOculto(true);
    setLoadingPular(true);
    try {
      const usuarioStr = await AsyncStorage.getItem('@user');
      const usuario = usuarioStr ? JSON.parse(usuarioStr) : null;

      // 1. Pular separação (qt = 0)
      const resultado = await PedidoService.inserirProdutoSeparacao(
        item.IdSeparacao,
        item.IdProdutoPedido,
        0,
        item.QtVendida,
        item.IdLocalizacao,
        999,
        usuario?.id
      );

      if (!resultado?.success) {
        setOculto(false);
        alert(resultado?.message || 'Erro ao pular item');
        return;
      }

 
      // 2. Inserir reposição
      await reposicaoService.inserirReposicao(
        item.IdProdutoPedido,
        item.IdLocalizacao,
        item.QtVendida,
        usuario.id 
      );

      // 3. Atualizar listas
      onAtualizarLista();
      onAtualizarSeparacaoAtiva?.();
      onPular?.();

    } catch {
      setOculto(false);
      alert('Falha de comunicação ao pular item');
    } finally {
      setLoadingPular(false);
    }
  }


  if (oculto) return null;

  return (
    <>
      <View style={{ backgroundColor: '#fff', borderRadius: 8, padding: 12, marginHorizontal: 12, marginBottom: 8 }}>
        <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 14, color: '#163029', marginBottom: 8 }}>
          <Feather name="box" size={14} /> {item.CdProduto} - {item.DsProduto}
        </Text>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity onPress={() => setModalVisible(true)}>
            <Image source={{ uri: item.ImageUrl }} style={{ width: 90, height: 90, borderRadius: 6, backgroundColor: '#eee' }} resizeMode="cover" />
          </TouchableOpacity>

          <View style={{ flex: 1, justifyContent: 'space-between' }}>
            <Text><Ionicons name="pricetag-outline" size={14} /> Qtde: {item.QtVendida}</Text>
            <Text style={{ backgroundColor: localVazio ? '#fdd' : 'transparent' }}>
              <Entypo name="location-pin" size={14} /> {localVazio ? 'Sem local' : `Local: ${item.DsLocalizacao}`}
            </Text>
            <Text style={{ backgroundColor: estoqueNegativo ? '#fdd' : 'transparent' }}>
              <Feather name="database" size={14} /> Estoque: {item.StockQuantity}
            </Text>
            <Text style={{ color: quantidadeOk ? 'green' : 'red' }}>
              <Feather name="check" size={14} /> Qtde Separada: {item.QtSeparada ?? 0}
            </Text>
          </View>

          <View style={{ justifyContent: 'center', gap: 6 }}>
            {!quantidadeOk && (
              <TouchableOpacity
                onPress={() => setModalSeparar(true)}
                disabled={loadingSeparar || loadingPular}
                style={{ backgroundColor: '#2F4B44', padding: 6, borderRadius: 6, opacity: (loadingSeparar || loadingPular) ? 0.7 : 1 }}
              >
                <Text style={{ color: '#fff' }}><Feather name="check-circle" size={14} /> Separar</Text>
              </TouchableOpacity>
            )}

            {!quantidadeOk && (
              <TouchableOpacity
                onPress={pularItem}
                disabled={loadingSeparar || loadingPular}
                style={{ backgroundColor: '#bbb', padding: 6, borderRadius: 6, opacity: (loadingSeparar || loadingPular) ? 0.7 : 1 }}
              >
                <Text style={{ color: '#fff' }}><Feather name="skip-forward" size={14} /> {loadingPular ? 'Pulando...' : 'Pular'}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => setModalMapaVisible(true)}
              disabled={localVazio || loadingSeparar || loadingPular}
              style={{ backgroundColor: localVazio ? '#ccc' : '#4169E1', padding: 6, borderRadius: 6, opacity: (loadingSeparar || loadingPular) ? 0.7 : 1 }}
            >
              <Text style={{ color: '#fff' }}><Ionicons name="map-outline" size={14} /> Mapa</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <Modal visible={modalVisible} transparent animationType="fade">
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' }}
          onPress={() => setModalVisible(false)}
        >
          <Image source={{ uri: item.ImageUrl }} style={{ width: '90%', height: '70%', resizeMode: 'contain' }} />
        </TouchableOpacity>
      </Modal>

      <Modal visible={modalSeparar} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', padding: 24, borderRadius: 8, width: '80%' }}>
            <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 16, marginBottom: 12 }}>Separar Produto</Text>
            <TextInput
              value={qtSeparar}
              onChangeText={setQtSeparar}
              keyboardType="numeric"
              style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 10, marginBottom: 16 }}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <TouchableOpacity
                onPress={() => setModalSeparar(false)}
                disabled={loadingSeparar}
                style={{ backgroundColor: '#bbb', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 6, opacity: loadingSeparar ? 0.7 : 1 }}
              >
                <Text style={{ color: '#fff', fontFamily: 'Sina-Nova-Bold' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmarSeparacao}
                style={{ backgroundColor: '#2F4B44', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 6 }}
                disabled={loadingSeparar}
              >
                <Text style={{ color: '#fff', fontFamily: 'Sina-Nova-Bold' }}>{loadingSeparar ? 'Salvando...' : 'Confirmar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={modalMapaVisible} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: '#f8f8f8', paddingTop: 32 }}>
          <Pressable onPress={() => setModalMapaVisible(false)} style={{ padding: 12, backgroundColor: '#d1ccbd' }}>
            <Text style={{ color: '#163029', fontFamily: 'Sina-Nova-Bold' }}>⬅ Fechar Mapa</Text>
          </Pressable>
          <ScrollView>
            <MapaSeparacao
              locais={locais}
              itensSeparacao={itensSeparacao.map(converterProdutoParaItemSeparacao)}
              itemAtual={{
                produto: item.DsProduto,
                codigo: item.CdProduto,
                idProduto: item.IdProdutoPedido,
                quantidade: item.QtVendida,
                separado: item.QtSeparada >= item.QtVendida,
                local: {
                  aisle: item.AisleCode,
                  rack: Number(item.RackCode),
                  shelf: Number(item.ShelfCode),
                  bin: item.BinCode,
                  pickingOrder: item.PickingOrder,
                  ds_LocalProduto: item.DsLocalizacao,
                  idLocalProduto: item.IdLocalizacao,
                  urlImagem: item.ImageUrl,
                },
              }}
            />
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}
