import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions } from '@react-navigation/native';

const SettingsScreen = ({ navigation }) => {
  const [m3uUrl, setM3uUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  const [useCache, setUseCache] = useState(true);
  const [channelCount, setChannelCount] = useState(0);
  const [cacheSize, setCacheSize] = useState('0 MB');

  useEffect(() => {
    loadSettings();
    loadStats();
  }, []);

  const loadSettings = async () => {
    try {
      const url = await AsyncStorage.getItem('m3u_url');
      const autoPlaySetting = await AsyncStorage.getItem('auto_play');
      const cacheSetting = await AsyncStorage.getItem('use_cache');

      setM3uUrl(url || '');
      setAutoPlay(autoPlaySetting !== 'false');
      setUseCache(cacheSetting !== 'false');
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  const loadStats = async () => {
    try {
      const channels = await AsyncStorage.getItem('channels');
      if (channels) {
        const parsedChannels = JSON.parse(channels);
        setChannelCount(parsedChannels.length);
      }

      // Calcular tamanho aproximado do cache
      const keys = ['channels', 'recent_channels', 'favorite_channels'];
      let totalSize = 0;
      
      for (const key of keys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          totalSize += new Blob([data]).size;
        }
      }
      
      setCacheSize(`${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const saveM3UUrl = async () => {
    if (!m3uUrl.trim()) {
      Alert.alert('Erro', 'Por favor, insira uma URL válida');
      return;
    }

    if (!m3uUrl.startsWith('http://') && !m3uUrl.startsWith('https://')) {
      Alert.alert('Erro', 'A URL deve começar com http:// ou https://');
      return;
    }

    setLoading(true);

    try {
      await AsyncStorage.setItem('m3u_url', m3uUrl.trim());
      
      // Recarregar canais
      const response = await fetch(m3uUrl.trim());
      const content = await response.text();
      const parsedChannels = parseM3U(content);
      
      await AsyncStorage.setItem('channels', JSON.stringify(parsedChannels));
      setChannelCount(parsedChannels.length);
      
      Alert.alert('Sucesso', 'Lista M3U atualizada com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar URL:', error);
      Alert.alert('Erro', 'Não foi possível carregar a nova lista M3U');
    } finally {
      setLoading(false);
    }
  };

  const parseM3U = (content) => {
    const lines = content.split('\n');
    const channels = [];
    let currentChannel = {};
    let channelIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('#EXTINF:')) {
        const info = line.substring(8);
        const nameMatch = info.match(/,(.+)$/);
        const logoMatch = info.match(/tvg-logo="([^"]+)"/);
        const groupMatch = info.match(/group-title="([^"]+)"/);
        
        currentChannel = {
          id: `channel_${channelIndex}_${Date.now()}`, // ID único
          name: nameMatch ? nameMatch[1].trim() : 'Canal sem nome',
          logo: logoMatch ? logoMatch[1] : null,
          group: groupMatch ? groupMatch[1] : 'Outros',
        };
        channelIndex++;
      } else if (line.startsWith('http')) {
        if (currentChannel.name) {
          currentChannel.url = line;
          channels.push({ ...currentChannel });
          currentChannel = {};
        }
      }
    }

    return channels;
  };

  const toggleAutoPlay = async (value) => {
    setAutoPlay(value);
    await AsyncStorage.setItem('auto_play', value.toString());
  };

  const toggleUseCache = async (value) => {
    setUseCache(value);
    await AsyncStorage.setItem('use_cache', value.toString());
  };

  const clearCache = async () => {
    Alert.alert(
      'Limpar Cache',
      'Isso irá remover todos os dados salvos (canais recentes, favoritos, etc.). Deseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove([
                'channels',
                'recent_channels',
                'favorite_channels'
              ]);
              setCacheSize('0 MB');
              setChannelCount(0);
              Alert.alert('Sucesso', 'Cache limpo com sucesso!');
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível limpar o cache');
            }
          }
        }
      ]
    );
  };

  const resetApp = async () => {
    Alert.alert(
      'Redefinir Aplicativo',
      'Isso irá remover todas as configurações e dados salvos. O app será reiniciado na tela de configuração inicial.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Redefinir',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: 'Setup' }],
                })
              );
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível redefinir o aplicativo');
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Lista M3U</Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>URL da Lista M3U</Text>
          <TextInput
            style={styles.input}
            placeholder="https://exemplo.com/lista.m3u"
            placeholderTextColor="#666"
            value={m3uUrl}
            onChangeText={setM3uUrl}
            autoCapitalize="none"
            keyboardType="url"
          />
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={saveM3UUrl}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="save" size={20} color="#fff" />
              <Text style={styles.buttonText}>Atualizar Lista</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferências</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Ionicons name="play" size={20} color="#007AFF" />
            <View style={styles.settingTexts}>
              <Text style={styles.settingTitle}>Reproduzir Automaticamente</Text>
              <Text style={styles.settingDescription}>
                Iniciar reprodução automaticamente ao selecionar canal
              </Text>
            </View>
          </View>
          <Switch
            value={autoPlay}
            onValueChange={toggleAutoPlay}
            trackColor={{ false: '#767577', true: '#007AFF' }}
            thumbColor={autoPlay ? '#fff' : '#f4f3f4'}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Ionicons name="archive" size={20} color="#007AFF" />
            <View style={styles.settingTexts}>
              <Text style={styles.settingTitle}>Usar Cache</Text>
              <Text style={styles.settingDescription}>
                Salvar dados localmente para acesso offline
              </Text>
            </View>
          </View>
          <Switch
            value={useCache}
            onValueChange={toggleUseCache}
            trackColor={{ false: '#767577', true: '#007AFF' }}
            thumbColor={useCache ? '#fff' : '#f4f3f4'}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Estatísticas</Text>
        
        <View style={styles.statItem}>
          <Ionicons name="tv" size={20} color="#007AFF" />
          <Text style={styles.statText}>Canais Carregados: {channelCount}</Text>
        </View>

        <View style={styles.statItem}>
          <Ionicons name="archive" size={20} color="#007AFF" />
          <Text style={styles.statText}>Tamanho do Cache: {cacheSize}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Manutenção</Text>
        
        <TouchableOpacity style={styles.actionButton} onPress={clearCache}>
          <Ionicons name="trash" size={20} color="#FF6B6B" />
          <Text style={[styles.actionButtonText, { color: '#FF6B6B' }]}>
            Limpar Cache
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={resetApp}>
          <Ionicons name="refresh" size={20} color="#FF6B6B" />
          <Text style={[styles.actionButtonText, { color: '#FF6B6B' }]}>
            Redefinir Aplicativo
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sobre</Text>
        <Text style={styles.aboutText}>
          IPTV Pro v1.0.0{'\n'}
          Desenvolvido para reprodução de listas M3U
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  section: {
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  inputContainer: {
    marginBottom: 15,
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
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingTexts: {
    marginLeft: 12,
    flex: 1,
  },
  settingTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  settingDescription: {
    color: '#666',
    fontSize: 14,
    marginTop: 2,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  statText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  aboutText: {
    color: '#666',
    fontSize: 14,
    lineHeight: 20,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
  },
});

export default SettingsScreen;