import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { UsuarioInterfaceProps } from '@/interfaces/usuarioInterface';
import { OperadorItem } from '@/interfaces/ti400Interface';
import ti400Service from '@/services/ti400Service';

interface Props {
  visible: boolean;
  linhaNome: string;
  loading: boolean;
  usuario: UsuarioInterfaceProps;
  podeAtribuirOperador: boolean;
  onConfirmar: (lote: number, idColaborador: number) => void;
  onCancelar: () => void;
}

export default function ModalIniciarSessao({ visible, linhaNome, loading, usuario, podeAtribuirOperador, onConfirmar, onCancelar }: Props) {
  const [lote, setLote] = useState('');
  const [colaborador, setColaborador] = useState('');
  const [operadores, setOperadores] = useState<OperadorItem[]>([]);
  const [operadorNome, setOperadorNome] = useState('');
  const [abrirOperadores, setAbrirOperadores] = useState(false);
  const operadorPadrao = String(usuario.id);

  useEffect(() => {
    if (!visible) {
      setLote('');
      setColaborador('');
    } else if (!podeAtribuirOperador) {
      setColaborador(operadorPadrao);
      setOperadorNome(usuario.dsPessoa);
    } else {
      ti400Service.getOperadores().then(setOperadores).catch(() => setOperadores([]));
    }
  }, [visible, podeAtribuirOperador, operadorPadrao, usuario.dsPessoa]);

  const loteNum  = parseInt(lote, 10);
  const colNum   = parseInt(colaborador, 10);
  const valido   = !isNaN(loteNum) && loteNum > 0 && !isNaN(colNum) && colNum > 0;

  function confirmar() {
    if (!valido) return;
    onConfirmar(loteNum, colNum);
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <View style={{ backgroundColor: '#f0ead6', borderRadius: 12, padding: 20 }}>
          <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 18, color: '#163029', marginBottom: 2 }}>
            Iniciar Sessão
          </Text>
          <Text style={{ fontFamily: 'Sina-Nova-Regular', fontSize: 14, color: '#2F4B44', marginBottom: 20 }}>
            {linhaNome}
          </Text>

          <Text style={label}>OP / Lote</Text>
          <TextInput
            value={lote}
            onChangeText={setLote}
            keyboardType="numeric"
            placeholder="Ex: 42"
            placeholderTextColor="#9ca3af"
            style={input}
            editable={!loading}
          />

          <Text style={[label, { marginTop: 14 }]}>Matrícula do Colaborador</Text>
          {podeAtribuirOperador ? (
            <>
              <Pressable onPress={() => setAbrirOperadores((v) => !v)} disabled={loading} style={[input, { flexDirection: 'row', justifyContent: 'space-between' }]}>
                <Text style={{ color: operadorNome ? '#163029' : '#9ca3af', fontFamily: 'Sina-Nova-Regular' }}>
                  {operadorNome || 'Selecione um operador'}
                </Text>
                <Feather name={abrirOperadores ? 'chevron-up' : 'chevron-down'} size={18} color="#163029" />
              </Pressable>
              {abrirOperadores && (
                <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#ccc', borderRadius: 8, maxHeight: 150 }}>
                  {operadores.map((item) => (
                    <Pressable key={item.id} onPress={() => { setColaborador(String(item.id)); setOperadorNome(item.nome); setAbrirOperadores(false); }} style={{ padding: 11, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
                      <Text style={{ color: '#163029', fontFamily: 'Sina-Nova-Regular' }}>{item.nome}</Text>
                    </Pressable>
                  ))}
                  {operadores.length === 0 && <Text style={{ padding: 11, color: '#6b7280' }}>Nenhum operador disponÃ­vel</Text>}
                </View>
              )}
            </>
          ) : (
          <TextInput
            value={usuario.dsPessoa}
            onChangeText={setColaborador}
            keyboardType="numeric"
            placeholder="Ex: 1234"
            placeholderTextColor="#9ca3af"
            style={[input, !podeAtribuirOperador && { backgroundColor: '#e5e2d8', color: '#6b7280' }]}
            editable={!loading && podeAtribuirOperador}
          />
          )}

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 24 }}>
            <Pressable
              onPress={onCancelar}
              disabled={loading}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 6,
                borderWidth: 1,
                borderColor: '#163029',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 15, color: '#163029' }}>
                Cancelar
              </Text>
            </Pressable>

            <Pressable
              onPress={confirmar}
              disabled={!valido || loading}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 6,
                backgroundColor: valido && !loading ? '#163029' : '#9ca3af',
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {loading
                ? <ActivityIndicator color="#d1ccbd" size="small" />
                : (
                  <>
                    <Feather name="play" size={15} color="#d1ccbd" />
                    <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 15, color: '#d1ccbd' }}>
                      Iniciar
                    </Text>
                  </>
                )
              }
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const label = {
  fontFamily: 'Sina-Nova-Bold' as const,
  fontSize: 14,
  color: '#163029',
  marginBottom: 6,
};

const input = {
  backgroundColor: '#fff',
  borderRadius: 8,
  paddingVertical: 12,
  paddingHorizontal: 14,
  fontSize: 16,
  fontFamily: 'Sina-Nova-Regular' as const,
  color: '#163029',
  borderWidth: 1,
  borderColor: '#ccc',
};
