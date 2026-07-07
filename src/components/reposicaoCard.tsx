import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Pressable, TextInput, ActivityIndicator, Image, Modal, TouchableOpacity } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import Toast from 'react-native-toast-message';
import { Reposicao } from '@/interfaces/reposicaoInterface';
import buscaService from '@/services/buscaService';
import reposicaoService from '@/services/reposicaoService';
import { LocalOuProduto } from '@/interfaces/buscaInterface';
import { useUser } from '@/contexts/UserContext';
import { Feather, Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';

const statusColors: { [key: number]: string } = {
  44: '#e7f1ff',
  45: '#f8d7da',
  48: '#fff3cd',
};

interface Props {
  reposicao: Reposicao;
  onFinalizada: () => void;
}

export default function ReposicaoCard({ reposicao, onFinalizada }: Props) {
  const { usuario } = useUser();
  const [loading, setLoading] = useState(false);
  const [locais, setLocais] = useState<LocalOuProduto[]>([]);
  const [local, setLocal] = useState<string | null>(null);
  const [quantidade, setQuantidade] = useState('');
  const [imagemModal, setImagemModal] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (reposicao.IdStatus === 48) abrirReposicao();
  }, [reposicao.IdStatus]);

  async function abrirReposicao() {
    try {
      const lista = await buscaService.getLocais();
      setLocais(lista);
      const localAtual = lista.find(loc => loc.label.includes(reposicao.DsLocal));
      setLocal(localAtual?.value ?? null);
      setQuantidade(String(reposicao.QtQuantidade ?? ''));
    } catch {
      Toast.show({ type: 'error', text1: 'Erro ao carregar locais' });
    }
  }

  async function iniciar() {
    try {
      setLoading(true);
      await reposicaoService.iniciarReposicao(reposicao.IdReposicao, usuario.id);
      await abrirReposicao();
      Toast.show({ type: 'success', text1: 'Reposição iniciada' });
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Erro ao iniciar', text2: err.message });
    } finally {
      setLoading(false);
    }
  }

  async function finalizar() {
    try {
      setLoading(true);
      await reposicaoService.finalizarReposicao(reposicao.IdReposicao, usuario.id);
      Toast.show({ type: 'success', text1: 'Reposição finalizada' });
      onFinalizada();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Erro ao finalizar', text2: err.message });
    } finally {
      setLoading(false);
    }
  }

  async function repor() {
    if (!local || !quantidade.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Campos obrigatórios',
        text2: 'Preencha local e quantidade',
      });
      return;
    }

    try {
      setLoading(true);
      await buscaService.transferirProduto(reposicao.CdProduto, local, Number(quantidade), 'WH03ATC');
      await finalizar();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Erro na reposição', text2: err.message });
    } finally {
      setLoading(false);
    }
  }

  async function solicitarAtacado() {
    try {
      setLoading(true);
      await reposicaoService.inserirReposicao(reposicao.IdProduto, reposicao.IdLocal, reposicao.QtQuantidade, usuario.id);
      Toast.show({ type: 'success', text1: 'Reposição solicitada ao atacado' });
      onFinalizada();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Erro ao solicitar', text2: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{
      backgroundColor: statusColors[reposicao.IdStatus] || '#fff',
      padding: 12,
      borderRadius: 8,
      marginBottom: 12,
      borderColor: '#163029',
      borderWidth: 0,
      flexDirection: 'row',
      gap: 12,
    }}>
      <TouchableOpacity onPress={() => setImagemModal(true)}>
        <Image source={{ uri: reposicao.DsUrlImage }} style={{ width: 80, height: 80, borderRadius: 8, backgroundColor: '#eee' }} resizeMode="cover" />
      </TouchableOpacity>

      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 16, color: '#163029' }}>{reposicao.DsProduto}</Text>
        <Text style={info}><Feather name="tag" size={14} /> Código: {reposicao.CdProduto}</Text>
        <Text style={info}><Feather name="map-pin" size={14} /> Local: {reposicao.DsLocal || '---'}</Text>
        <Text style={info}><Feather name="hash" size={14} /> Quantidade: {reposicao.QtQuantidade}</Text>
        <Text style={info}><Ionicons name="person-outline" size={14} /> Solicitado por: {reposicao.DsUsuario || '---'}</Text>
        {reposicao.DsStatusRelacionado !== 'Não Solicitado' && (
          <Text style={[info, { fontWeight: 'bold', color: '#b30000' }]}>
            <Feather name="alert-circle" size={14} /> Status Atacado: {reposicao.DsStatusRelacionado}
          </Text>
        )}

        {reposicao.IdStatus === 44 && (
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
            <Pressable onPress={iniciar} style={[botao, { flex: 1 }]} disabled={loading}>
              <Ionicons name="play" size={16} color="#fff" />
              <Text style={textoBotao}>Iniciar</Text>
            </Pressable>
            <Pressable onPress={finalizar} style={[botao, { flex: 1, backgroundColor: '#ccc' }]} disabled={loading}>
              <Feather name="check" size={16} color="#000" />
              <Text style={[textoBotao, { color: '#000' }]}>Finalizar</Text>
            </Pressable>
          </View>
        )}

        {reposicao.IdStatus === 48 && (
          <View style={{ marginTop: 12 }}>
            <DropDownPicker
              open={dropOpen}
              setOpen={setDropOpen}
              value={local}
              setValue={setLocal}
              searchable
              searchPlaceholder="Digite ou bip o produto"
              items={locais.map(loc => ({ label: loc.label, value: loc.value }))}
              placeholder="Selecione o local"
              style={{ marginBottom: 12, borderColor: '#163029' }}
              textStyle={{ fontFamily: 'Sina-Nova-Regular', color: '#163029' }}
              listMode="MODAL"
              modalProps={{ animationType: 'slide' }}
              closeAfterSelecting
            />
            <TextInput
              ref={inputRef}
              value={quantidade}
              onChangeText={setQuantidade}
              keyboardType="numeric"
              placeholder="Quantidade"
              style={{
                backgroundColor: '#fff',
                borderRadius: 8,
                padding: 12,
                fontSize: 16,
                fontFamily: 'Sina-Nova-Regular',
                color: '#163029',
                marginBottom: 12,
                borderWidth: 1,
                borderColor: '#163029',
              }}
            />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable onPress={repor} style={[botao, { flex: 1 }]} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <Feather name="box" size={16} color="#fff" />
                    <Text style={textoBotao}>Confirmar Reposição</Text>
                  </>
                )}
              </Pressable>
              {reposicao.DsStatusRelacionado === 'Não Solicitado' && (
                <Pressable onPress={solicitarAtacado} style={[botao, { flex: 1, backgroundColor: '#bbb' }]}>
                  <MaterialIcons name="local-shipping" size={16} color="#fff" />
                  <Text style={[textoBotao, { color: '#fff' }]}>Solicitar Atacado</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}
      </View>

      <Modal visible={imagemModal} transparent animationType="fade">
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.9)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={() => setImagemModal(false)}
        >
          <Image source={{ uri: reposicao.DsUrlImage }} style={{ width: '90%', height: '70%' }} resizeMode="contain" />
        </Pressable>
      </Modal>
    </View>
  );
}

const info = {
  fontFamily: 'Sina-Nova-Regular',
  fontSize: 14,
  color: '#333',
  flexDirection: 'row' as const,
  gap: 4,
};

const botao = {
  backgroundColor: '#163029',
  paddingVertical: 10,
  paddingHorizontal: 14,
  borderRadius: 6,
  alignItems: 'center' as const,
  flexDirection: 'row' as const,
  justifyContent: 'center' as const,
  gap: 6,
};

const textoBotao = {
  fontFamily: 'Sina-Nova-Bold',
  fontSize: 14,
  color: '#fff',
};
