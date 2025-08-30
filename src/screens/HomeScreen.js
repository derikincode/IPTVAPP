import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HomeScreen = ({ navigation }) => {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recentChannels, setRecentChannels] = useState([]);
  const [recentMovies, setRecentMovies] = useState([]);
  const [recentSeries, setRecentSeries] = useState([]);
  const [favoriteChannels, setFavoriteChannels] = useState([]);
  const [favoriteMovies, setFavoriteMovies] = useState([]);
  const [favoriteSeries, setFavoriteSeries] = useState([]);
  const [totalChannelsCount, setTotalChannelsCount] = useState(0);

  useEffect(() => {
    loadChannels();
    loadRecentChannels();
    loadRecentMovies();
    loadRecentSeries();
    loadFavoriteChannels();
    loadFavoriteMovies();
    loadFavoriteSeries();
    loadTotalCount();
  }, []);

  const loadTotalCount = async () => {
    try {
      const totalCount = await AsyncStorage.getItem('total_channels_count');
      if (totalCount) {
        setTotalChannelsCount(parseInt(totalCount));
      }
    } catch (error) {
      console.error('Erro ao carregar contagem total:', error);
    }
  };

  const loadChannels = async () => {
    try {
      const m3uUrl = await AsyncStorage.getItem('m3u_url');
      console.log('URL M3U carregada:', m3uUrl);
      
      if (!m3uUrl) return;

      console.log('Fazendo fetch da URL...');
      const response = await fetch(m3uUrl);
      const content = await response.text();
      
      console.log('Conteúdo recebido (primeiras 500 chars):', content.substring(0, 500));
      
      const allChannels = parseM3U(content);
      console.log('Total de canais encontrados:', allChannels.length);
      
      // Estratégia: Carregar apenas os primeiros 2000 canais inicialmente
      const displayChannels = allChannels.slice(0, 2000);
      console.log('Canais carregados para exibição:', displayChannels.length);
      
      setChannels(displayChannels);
      
      try {
        // Salvar apenas uma amostra representativa no cache
        const sampleChannels = allChannels.slice(0, 500);
        await AsyncStorage.setItem('channels', JSON.stringify(sampleChannels));
        await AsyncStorage.setItem('total_channels_count', allChannels.length.toString());
        
        // Salvar grupos únicos para filtros
        const uniqueGroups = [...new Set(allChannels.map(ch => ch.group))].slice(0, 50);
        await AsyncStorage.setItem('channel_groups', JSON.stringify(uniqueGroups));
        
        console.log('Cache otimizado salvo com sucesso');
      } catch (storageError) {
        console.warn('Aviso: Não foi possível salvar no cache, continuando sem cache:', storageError);
      }
      
    } catch (error) {
      console.error('Erro ao carregar canais:', error);
      // Tentar carregar do cache local
      try {
        const cachedChannels = await AsyncStorage.getItem('channels');
        if (cachedChannels) {
          console.log('Carregando do cache...');
          setChannels(JSON.parse(cachedChannels));
        }
      } catch (cacheError) {
        console.error('Erro ao carregar cache:', cacheError);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadRecentChannels = async () => {
    try {
      const recent = await AsyncStorage.getItem('recent_channels');
      if (recent) {
        setRecentChannels(JSON.parse(recent));
      }
    } catch (error) {
      console.error('Erro ao carregar canais recentes:', error);
    }
  };

  const loadRecentMovies = async () => {
    try {
      const recent = await AsyncStorage.getItem('recent_movies');
      if (recent) {
        setRecentMovies(JSON.parse(recent));
      }
    } catch (error) {
      console.error('Erro ao carregar filmes recentes:', error);
    }
  };

  const loadRecentSeries = async () => {
    try {
      const recent = await AsyncStorage.getItem('recent_series');
      if (recent) {
        setRecentSeries(JSON.parse(recent));
      }
    } catch (error) {
      console.error('Erro ao carregar séries recentes:', error);
    }
  };

  const loadFavoriteChannels = async () => {
    try {
      const favorites = await AsyncStorage.getItem('favorite_channels');
      if (favorites) {
        setFavoriteChannels(JSON.parse(favorites));
      }
    } catch (error) {
      console.error('Erro ao carregar favoritos:', error);
    }
  };

  const loadFavoriteMovies = async () => {
    try {
      const favorites = await AsyncStorage.getItem('favorite_movies');
      if (favorites) {
        setFavoriteMovies(JSON.parse(favorites));
      }
    } catch (error) {
      console.error('Erro ao carregar filmes favoritos:', error);
    }
  };

  const loadFavoriteSeries = async () => {
    try {
      const favorites = await AsyncStorage.getItem('favorite_series');
      if (favorites) {
        setFavoriteSeries(JSON.parse(favorites));
      }
    } catch (error) {
      console.error('Erro ao carregar séries favoritas:', error);
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
        // Extrair informações do canal
        const info = line.substring(8);
        const nameMatch = info.match(/,(.+)$/);
        const logoMatch = info.match(/tvg-logo="([^"]+)"/i);
        const groupMatch = info.match(/group-title="([^"]+)"/i);
        
        currentChannel = {
          id: `channel_${channelIndex}_${Date.now()}`, // ID único
          name: nameMatch ? nameMatch[1].trim() : 'Canal sem nome',
          logo: logoMatch ? logoMatch[1] : null,
          group: groupMatch ? groupMatch[1] : 'Sem Categoria',
        };
        channelIndex++;
      } else if (line.startsWith('http') || line.startsWith('rtmp') || line.startsWith('rtsp')) {
        if (currentChannel.name) {
          currentChannel.url = line;
          channels.push({ ...currentChannel });
          currentChannel = {};
        }
      }
    }

    console.log(`Parser M3U: ${channels.length} canais encontrados`);
    return channels;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadChannels();
    setRefreshing(false);
  };

  const playChannel = async (channel) => {
    // Adicionar aos recentes
    const newRecent = [channel, ...recentChannels.filter(c => c.id !== channel.id)].slice(0, 10);
    setRecentChannels(newRecent);
    await AsyncStorage.setItem('recent_channels', JSON.stringify(newRecent));
    
    // Navegar para o player
    navigation.navigate('Player', { channel });
  };

  const renderChannelItem = (channel) => (
    <TouchableOpacity
      key={channel.id}
      style={styles.channelItem}
      onPress={() => playChannel(channel)}
    >
      {channel.logo ? (
        <Image source={{ uri: channel.logo }} style={styles.channelLogo} />
      ) : (
        <View style={styles.channelLogoPlaceholder}>
          <Ionicons name="tv" size={24} color="#007AFF" />
        </View>
      )}
      <Text style={styles.channelName} numberOfLines={2}>{channel.name}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Carregando canais...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <LinearGradient
        colors={['#1a1a2e', '#16213e']}
        style={styles.header}
      >
        <Text style={styles.welcomeText}>Bem-vindo de volta!</Text>
        <Text style={styles.statsText}>
          {totalChannelsCount > 0 
            ? `${totalChannelsCount.toLocaleString()} canais disponíveis`
            : `${channels.length} canais carregados`
          }
        </Text>
      </LinearGradient>

      {recentChannels.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Canais Assistidos Recentemente</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.horizontalList}>
              {recentChannels.slice(0, 10).map(renderChannelItem)}
            </View>
          </ScrollView>
        </View>
      )}

      {recentMovies.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Filmes Assistidos Recentemente</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.horizontalList}>
              {recentMovies.slice(0, 10).map(renderChannelItem)}
            </View>
          </ScrollView>
        </View>
      )}

      {recentSeries.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Séries Assistidas Recentemente</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.horizontalList}>
              {recentSeries.slice(0, 10).map(renderChannelItem)}
            </View>
          </ScrollView>
        </View>
      )}

      {favoriteChannels.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Canais Favoritos</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.horizontalList}>
              {favoriteChannels.slice(0, 10).map(renderChannelItem)}
            </View>
          </ScrollView>
        </View>
      )}

      {favoriteMovies.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Filmes Favoritos</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.horizontalList}>
              {favoriteMovies.slice(0, 10).map(renderChannelItem)}
            </View>
          </ScrollView>
        </View>
      )}

      {favoriteSeries.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Séries Favoritas</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.horizontalList}>
              {favoriteSeries.slice(0, 10).map(renderChannelItem)}
            </View>
          </ScrollView>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Explore por Categoria</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.horizontalList}>
            <TouchableOpacity
              style={styles.categoryCard}
              onPress={() => navigation.navigate('Channels')}
            >
              <Ionicons name="tv" size={32} color="#007AFF" />
              <Text style={styles.categoryCardText}>Canais TV</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.categoryCard}
              onPress={() => navigation.navigate('Movies')}
            >
              <Ionicons name="film" size={32} color="#FF6B35" />
              <Text style={styles.categoryCardText}>Filmes</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.categoryCard}
              onPress={() => navigation.navigate('Series')}
            >
              <Ionicons name="library" size={32} color="#7B68EE" />
              <Text style={styles.categoryCardText}>Séries</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.categoryCard}
              onPress={() => navigation.navigate('Channels')}
            >
              <Ionicons name="football" size={32} color="#32CD32" />
              <Text style={styles.categoryCardText}>Esportes</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.categoryCard}
              onPress={() => navigation.navigate('Channels')}
            >
              <Ionicons name="happy" size={32} color="#FFD700" />
              <Text style={styles.categoryCardText}>Infantil</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.categoryCard}
              onPress={() => navigation.navigate('Channels')}
            >
              <Ionicons name="newspaper" size={32} color="#DC143C" />
              <Text style={styles.categoryCardText}>Notícias</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.actionButton, { borderColor: '#007AFF' }]}
          onPress={() => navigation.navigate('Channels')}
        >
          <Ionicons name="tv" size={24} color="#007AFF" />
          <Text style={[styles.actionText, { color: '#007AFF' }]}>Canais</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, { borderColor: '#FF6B35' }]}
          onPress={() => navigation.navigate('Movies')}
        >
          <Ionicons name="film" size={24} color="#FF6B35" />
          <Text style={[styles.actionText, { color: '#FF6B35' }]}>Filmes</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { borderColor: '#7B68EE' }]}
          onPress={() => navigation.navigate('Series')}
        >
          <Ionicons name="library" size={24} color="#7B68EE" />
          <Text style={[styles.actionText, { color: '#7B68EE' }]}>Séries</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.quickActions}>        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Settings')}
        >
          <Ionicons name="settings" size={24} color="#666" />
          <Text style={styles.actionText}>Configurações</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  header: {
    padding: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  statsText: {
    fontSize: 16,
    color: '#ccc',
  },
  section: {
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginHorizontal: 20,
    marginBottom: 15,
  },
  horizontalList: {
    flexDirection: 'row',
    paddingHorizontal: 20,
  },
  channelItem: {
    width: 120,
    marginRight: 15,
    alignItems: 'center',
  },
  channelLogo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 8,
  },
  channelLogoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  channelName: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginVertical: 10,
  },
  actionButton: {
    backgroundColor: '#2a2a2a',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
    borderWidth: 2,
    borderColor: '#444',
  },
  actionText: {
    color: '#fff',
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  categoryCard: {
    width: 100,
    height: 100,
    backgroundColor: '#2a2a2a',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    borderWidth: 1,
    borderColor: '#444',
  },
  categoryCardText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default HomeScreen;