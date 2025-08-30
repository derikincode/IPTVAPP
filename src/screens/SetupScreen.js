import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions } from '@react-navigation/native';
import XtreamCodeClient from 'xtream_code_client';

const SetupScreen = ({ navigation }) => {
  const [inputType, setInputType] = useState('xtream');
  const [m3uUrl, setM3uUrl] = useState('');
  const [xtreamHost, setXtreamHost] = useState('');
  const [xtreamUsername, setXtreamUsername] = useState('');
  const [xtreamPassword, setXtreamPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const parseXtreamFromUrl = (url) => {
    try {
      const urlObj = new URL(url);
      const params = new URLSearchParams(urlObj.search);
      
      if (params.get('username') && params.get('password')) {
        return {
          host: `${urlObj.protocol}//${urlObj.host}`,
          username: params.get('username'),
          password: params.get('password')
        };
      }
      
      const pathParts = urlObj.pathname.split('/');
      if (pathParts.length >= 4 && pathParts[1] === 'c') {
        return {
          host: `${urlObj.protocol}//${urlObj.host}`,
          username: pathParts[2],
          password: pathParts[3]
        };
      }
      
      return null;
    } catch (error) {
      return null;
    }
  };

  const testXtreamConnection = async (host, username, password) => {
    try {
      console.log('🔌 Testando conexão Xtream...');
      
      const client = new XtreamCodeClient({
        serverUrl: host,
        username: username,
        password: password
      });
      
      const accountInfo = await client.getAccountInfo();
      
      if (accountInfo && accountInfo.user_info && accountInfo.user_info.status === 'Active') {
        console.log('✅ Conexão bem-sucedida');
        
        return {
          success: true,
          userInfo: accountInfo.user_info,
          serverInfo: accountInfo.server_info
        };
      } else {
        return { success: false, error: 'Conta inativa ou credenciais inválidas' };
      }
    } catch (error) {
      console.error('❌ Erro no teste:', error);
      
      const errorMsg = error.message.toLowerCase();
      if (errorMsg.includes('network') || errorMsg.includes('timeout')) {
        return { success: false, error: 'Erro de conexão - verifique a URL e sua internet' };
      } else if (errorMsg.includes('unauthorized') || errorMsg.includes('401')) {
        return { success: false, error: 'Usuário ou senha incorretos' };
      } else if (errorMsg.includes('not found') || errorMsg.includes('404')) {
        return { success: false, error: 'Servidor não encontrado - verifique a URL' };
      } else {
        return { success: false, error: 'Erro de conexão: ' + error.message };
      }
    }
  };

  const handleM3uSetup = async () => {
    if (!m3uUrl.trim()) {
      Alert.alert('Erro', 'Por favor, insira a URL da lista M3U');
      return;
    }

    if (!m3uUrl.startsWith('http://') && !m3uUrl.startsWith('https://')) {
      Alert.alert('Erro', 'Por favor, insira uma URL válida (http:// ou https://)');
      return;
    }

    setLoading(true);

    try {
      const xtreamData = parseXtreamFromUrl(m3uUrl);
      
      if (xtreamData) {
        Alert.alert(
          'Xtream Codes Detectado!',
          'Esta URL é de um servidor Xtream Codes. Deseja configurar como Xtream para melhor organização?',
          [
            {
              text: 'Usar como M3U',
              style: 'cancel',
              onPress: () => saveM3uConfiguration()
            },
            {
              text: 'Configurar como Xtream',
              onPress: () => {
                setInputType('xtream');
                setXtreamHost(xtreamData.host);
                setXtreamUsername(xtreamData.username);
                setXtreamPassword(xtreamData.password);
                setLoading(false);
                Alert.alert('Dados Preenchidos!', 'Agora clique em "Conectar ao Xtream"');
              }
            }
          ]
        );
      } else {
        await saveM3uConfiguration();
      }
    } catch (error) {
      setLoading(false);
      Alert.alert('Erro', 'Não foi possível validar a URL');
    }
  };

  const saveM3uConfiguration = async () => {
    try {
      await AsyncStorage.multiSet([
        ['connection_type', 'm3u'],
        ['m3u_url', m3uUrl.trim()]
      ]);
      
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        })
      );
    } catch (error) {
      setLoading(false);
      Alert.alert('Erro', 'Não foi possível salvar a configuração');
    }
  };

  const handleXtreamSetup = async () => {
    if (!xtreamHost.trim() || !xtreamUsername.trim() || !xtreamPassword.trim()) {
      Alert.alert('Campos Obrigatórios', 'Por favor, preencha todos os campos');
      return;
    }

    let host = xtreamHost.trim();
    if (!host.startsWith('http://') && !host.startsWith('https://')) {
      host = 'http://' + host;
    }

    setLoading(true);

    try {
      const testResult = await testXtreamConnection(host, xtreamUsername.trim(), xtreamPassword.trim());
      
      if (testResult.success) {
        await AsyncStorage.multiSet([
          ['connection_type', 'xtream'],
          ['xtream_host', host],
          ['xtream_username', xtreamUsername.trim()],
          ['xtream_password', xtreamPassword.trim()],
          ['xtream_user_info', JSON.stringify(testResult.userInfo)],
          ['xtream_server_info', JSON.stringify(testResult.serverInfo)]
        ]);

        const expDate = new Date(testResult.userInfo.exp_date * 1000);
        const daysLeft = Math.ceil((expDate - new Date()) / (1000 * 60 * 60 * 24));

        Alert.alert(
          'Conectado com Sucesso!', 
          `Usuário: ${testResult.userInfo.username}\nExpira em: ${expDate.toLocaleDateString()}\nFaltam: ${daysLeft} dias`,
          [{ 
            text: 'Começar a usar!', 
            onPress: () => {
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: 'Main' }],
                })
              );
            }
          }]
        );
      } else {
        Alert.alert('Erro de Conexão', testResult.error);
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível conectar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderM3uForm = () => (
    <>
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>URL da Lista M3U</Text>
        <TextInput
          style={styles.input}
          placeholder="https://exemplo.com/lista.m3u"
          placeholderTextColor="#999"
          value={m3uUrl}
          onChangeText={setM3uUrl}
          autoCapitalize="none"
          keyboardType="url"
        />
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleM3uSetup}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Ionicons name="link" size={20} color="#fff" />
            <Text style={styles.buttonText}>Configurar M3U</Text>
          </>
        )}
      </TouchableOpacity>
    </>
  );

  const renderXtreamForm = () => (
    <>
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Servidor</Text>
        <TextInput
          style={styles.input}
          placeholder="http://exemplo.com:8080"
          placeholderTextColor="#999"
          value={xtreamHost}
          onChangeText={setXtreamHost}
          autoCapitalize="none"
          keyboardType="url"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Usuário</Text>
        <TextInput
          style={styles.input}
          placeholder="seu_usuario"
          placeholderTextColor="#999"
          value={xtreamUsername}
          onChangeText={setXtreamUsername}
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Senha</Text>
        <TextInput
          style={styles.input}
          placeholder="sua_senha"
          placeholderTextColor="#999"
          value={xtreamPassword}
          onChangeText={setXtreamPassword}
          secureTextEntry
        />
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleXtreamSetup}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Ionicons name="server" size={20} color="#fff" />
            <Text style={styles.buttonText}>Conectar ao Xtream</Text>
          </>
        )}
      </TouchableOpacity>
    </>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.gradient}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Ionicons name="tv" size={80} color="#007AFF" />
            </View>
            
            <Text style={styles.title}>Bem-vindo ao IPTV Pro</Text>
            <Text style={styles.subtitle}>
              Configure seu provedor IPTV para começar
            </Text>

            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[styles.typeButton, inputType === 'xtream' && styles.typeButtonActive]}
                onPress={() => setInputType('xtream')}
              >
                <Ionicons name="server" size={20} color={inputType === 'xtream' ? '#fff' : '#666'} />
                <Text style={[styles.typeButtonText, inputType === 'xtream' && styles.typeButtonTextActive]}>
                  Xtream Codes
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.typeButton, inputType === 'm3u' && styles.typeButtonActive]}
                onPress={() => setInputType('m3u')}
              >
                <Ionicons name="link" size={20} color={inputType === 'm3u' ? '#fff' : '#666'} />
                <Text style={[styles.typeButtonText, inputType === 'm3u' && styles.typeButtonTextActive]}>
                  Lista M3U
                </Text>
              </TouchableOpacity>
            </View>

            {inputType === 'xtream' ? renderXtreamForm() : renderM3uForm()}

            <View style={styles.infoContainer}>
              <Text style={styles.infoTitle}>
                {inputType === 'xtream' ? 'Vantagens do Xtream Codes:' : 'Sobre Lista M3U:'}
              </Text>
              {inputType === 'xtream' ? (
                <>
                  <Text style={styles.infoText}>• Filmes organizados automaticamente</Text>
                  <Text style={styles.infoText}>• Séries com temporadas e episódios</Text>
                  <Text style={styles.infoText}>• Canais de TV separados do VOD</Text>
                  <Text style={styles.infoText}>• Informações ricas (rating, ano, plot)</Text>
                  <Text style={styles.infoText}>• Cache inteligente e performance</Text>
                </>
              ) : (
                <>
                  <Text style={styles.infoText}>• URL direta para arquivo .m3u</Text>
                  <Text style={styles.infoText}>• Todos os canais em uma lista</Text>
                  <Text style={styles.infoText}>• Organização básica por grupos</Text>
                </>
              )}
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 4,
    marginBottom: 30,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  typeButtonActive: {
    backgroundColor: '#007AFF',
  },
  typeButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#444',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  infoContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 20,
  },
  infoTitle: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 5,
    lineHeight: 20,
  },
});

export default SetupScreen;