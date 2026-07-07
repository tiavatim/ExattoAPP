import React, { useEffect, useRef, useState } from 'react';
import {  Modal,  View,  Text,  TextInput,  Pressable,  KeyboardAvoidingView,  Platform,  ActivityIndicator,
} from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import localService from 'src/services/localService';
import buscaService from 'src/services/buscaService';
import { ProdutoCompleto } from 'src/interfaces/produtoCompletoInterface';
import Toast from 'react-native-toast-message';

interface Props {
  visible: boolean;
  onClose: () => void;
  locationId: number;
  onSucesso?: () => void;
}

export default function ModalAssociarProduto({
  visible,
  onClose,
  locationId,
  onSucesso,
}: Props) {
  const [produtos, setProdutos] = useState<ProdutoCompleto[]>([]);
  const [produtoId, setProdutoId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [quantidade, setQuantidade] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      carregarProdutos();
      setProdutoId(null);
      setQuantidade('');
    }
  }, [visible]);

  const carregarProdutos = async () => {
    try {
      const lista = await buscaService.getProdutosCompletos();
      setProdutos(lista);
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Erro ao carregar produtos',
      });
    }
  };

  const associar = async () => {
    if (!produtoId || !quantidade.trim()) {
      Toast.show({ type: 'error', text1: 'Preencha todos os campos' });
      return;
    }

    setLoading(true);
    try {
      const sucesso = await localService.associarProdutoPalete(
        locationId,
        produtoId,
        Number(quantidade)
      );

      if (sucesso) {
        Toast.show({ type: 'success', text1: 'Produto associado' });
        onClose();
        onSucesso?.();
      } else {
        Toast.show({ type: 'error', text1: 'Erro ao associar produto' });
      }
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Erro ao comunicar com o servidor',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.6)',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <View style={{ backgroundColor: '#fff', padding: 24, borderRadius: 8, width: '85%' }}>
          <Text
            style={{
              fontSize: 18,
              fontFamily: 'Sina-Nova-Bold',
              color: '#163029',
              marginBottom: 12,
            }}
          >
            Associar Produto ao Palete
          </Text>

          <DropDownPicker
            open={open}
            setOpen={setOpen}
            value={produtoId}
            setValue={setProdutoId}
            items={produtos.map((p) => ({
              label: p.Ds_Produto,
              value: p.Id_Produto,
            }))}
            placeholder="Selecione ou bip o produto"
            searchable
            listMode="MODAL"
            onChangeSearchText={(texto) => {
              const encontrado = produtos.find(
                (p) => p.Cd_Produto.toLowerCase() === texto.trim().toLowerCase()
              );
              if (encontrado) {
                setProdutoId(encontrado.Id_Produto);
                setOpen(false);
                setTimeout(() => inputRef.current?.focus(), 100);
              }
            }}
            style={{ borderColor: '#163029', marginBottom: 12 }}
            textStyle={{ fontFamily: 'Sina-Nova-Regular', color: '#163029' }}
          />

          <TextInput
            ref={inputRef}
            keyboardType="numeric"
            placeholder="Quantidade"
            value={quantidade}
            onChangeText={setQuantidade}
            style={{
              borderWidth: 1,
              borderColor: '#ccc',
              borderRadius: 8,
              padding: 10,
              fontFamily: 'Sina-Nova-Regular',
              marginBottom: 16,
              color: '#163029',
            }}
          />

          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
            <Pressable onPress={onClose}>
              <Text style={{ color: '#8b0000', fontFamily: 'Sina-Nova-Bold' }}>Cancelar</Text>
            </Pressable>
            <Pressable onPress={associar} disabled={loading}>
              <Text style={{ color: '#2F4B44', fontFamily: 'Sina-Nova-Bold' }}>
                {loading ? <ActivityIndicator color="#2F4B44" /> : 'Confirmar'}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
