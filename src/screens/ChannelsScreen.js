import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ChannelsScreen = ({ navigation }) => {
  const [channels, setChannels] = useState([]);
  const [channelGroups, setChannelGroups] = useState([]);
  const [filteredGroups, setFilteredGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [channelsInGroup, setChannelsInGroup] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [favoriteChannels, setFavoriteChannels] = useState([]);
  const [totalChannelsCount, setTotalChannelsCount] = useState(0);

  useEffect(() => {
    loadChannels();
    loadFavoriteChannels();
  }, []);

  useEffect(() => {
    filterGroups();
  }, [channelGroups, searchQuery]);

  const loadChannels = async () => {
    try {
      const cachedChannels = await AsyncStorage.getItem('channels');
      const totalCount = await AsyncStorage.getItem('total_channels_count');
      
      if (cachedChannels) {
        const parsedChannels = JSON.parse(cachedChannels);
        setChannels(parsedChannels);
        setTotalChannelsCount(parseInt(totalCount) || parsedChannels.length);
        
        // Organizar canais por grupos (pastas)
        const groupedChannels = organizeChannelsByGroups(parsedChannels);
        setChannelGroups(groupedChannels);
      }
    } catch (error) {
      console.error('Erro ao carregar canais:', error);
    } finally {
      setLoading(false);
    }
  };

  const organizeChannelsByGroups = (channels) => {
    const groups = {};
    
    channels.forEach(channel => {
      const groupName = channel.group || 'Sem Categoria';
      
      if (!groups[groupName]) {
        groups[groupName] = {
          name: groupName,
          channels: [],
          channelCount: 0
        };
      }
      
      groups[groupName].channels.push(channel);
      groups[groupName].channelCount++;
    });

    // Converter para array e ordenar alfabeticamente
    return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
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

  const filterGroups = () => {
    let filtered = channelGroups;

    if (searchQuery.trim()) {
      // Buscar tanto no nome do grupo quanto nos canais dentro do grupo
      filtered = channelGroups.filter(group => {
        const groupMatch = group.name.toLowerCase().includes(searchQuery.toLowerCase());
        const channelMatch = group.channels.some(channel => 
          channel.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
        return groupMatch || channelMatch;
      });
    }

    setFilteredGroups(filtered);
  };

  const openGroup = (group) => {
    setSelectedGroup(group);
    
    // Se há busca ativa, filtrar os canais do grupo pela busca
    let channelsToShow = group.channels;
    if (searchQuery.trim()) {
      channelsToShow = group.channels.filter(channel =>
        channel.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    setChannelsInGroup(channelsToShow);
  };

  const goBackToGroups = () => {
    setSelectedGroup(null);
    setChannelsInGroup([]);
  };

  const getGroupIcon = (groupName) => {
    const name = groupName.toLowerCase();
    
    if (name.includes('sport') || name.includes('esport')) return 'football';
    if (name.includes('movie') || name.includes('film') || name.includes('cinema')) return 'film';
    if (name.includes('news') || name.includes('notíc')) return 'newspaper';
    if (name.includes('music') || name.includes('música')) return 'musical-notes';
    if (name.includes('kids') || name.includes('infantil') || name.includes('cartoon')) return 'happy';
    if (name.includes('adult') || name.includes('+18')) return 'lock-closed';
    if (name.includes('religious') || name.includes('religios')) return 'home';
    if (name.includes('international') || name.includes('usa') || name.includes('uk')) return 'globe';
    if (name.includes('discovery') || name.includes('documentary')) return 'library';
    if (name.includes('series') || name.includes('série')) return 'tv';
    
    return 'folder';
  };

  const toggleFavorite = async (channel) => {
    try {
      const isFavorite = favoriteChannels.some(fav => fav.id === channel.id);
      let newFavorites;

      if (isFavorite) {
        newFavorites = favoriteChannels.filter(fav => fav.id !== channel.id);
      } else {
        newFavorites = [...favoriteChannels, channel];
      }

      setFavoriteChannels(newFavorites);
      await AsyncStorage.setItem('favorite_channels', JSON.stringify(newFavorites));
    } catch (error) {
      console.error('Erro ao salvar favorito:', error);
      Alert.alert('Erro', 'Não foi possível salvar o favorito');
    }
  };

  const playChannel = async (channel) => {
    try {
      // Adicionar aos canais recentes
      const recentChannels = await AsyncStorage.getItem('recent_channels');
      const recent = recentChannels ? JSON.parse(recentChannels) : [];
      const newRecent = [channel, ...recent.filter(c => c.id !== channel.id)].slice(0, 10);
      await AsyncStorage.setItem('recent_channels', JSON.stringify(newRecent));
      
      // Navegar para o player
      navigation.navigate('Player', { channel });
    } catch (error) {
      console.error('Erro ao reproduzir canal:', error);
      Alert.alert('Erro', 'Não foi possível reproduzir o canal');
    }
  };

  const renderGroupItem = ({ item }) => (
    <TouchableOpacity
      style={styles.groupItem}
      onPress={() => openGroup(item)}
    >
      <View style={styles.groupIcon}>
        <Ionicons name={getGroupIcon(item.name)} size={24} color="#007AFF" />
      </View>
      
      <View style={styles.groupInfo}>
        <Text style={styles.groupName} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.groupChannelCount}>
          {item.channelCount} canais
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={20} color="#666" />
    </TouchableOpacity>
  );

  const renderChannelItem = ({ item }) => {
    const isFavorite = favoriteChannels.some(fav => fav.id === item.id);
    
    return (
      <TouchableOpacity
        style={styles.channelItem}
        onPress={() => playChannel(item)}
      >
        <View style={styles.channelInfo}>
          {item.logo ? (
            <Image source={{ uri: item.logo }} style={styles.channelLogo} />
          ) : (
            <View style={styles.channelLogoPlaceholder}>
              <Ionicons name="tv" size={24} color="#007AFF" />
            </View>
          )}
          
          <View style={styles.channelDetails}>
            <Text style={styles.channelName} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={styles.channelGroup}>{item.group}</Text>
          </View>
        </View>

        <View style={styles.channelActions}>
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={() => toggleFavorite(item)}
          >
            <Ionicons
              name={isFavorite ? "heart" : "heart-outline"}
              size={20}
              color={isFavorite ? "#FF6B6B" : "#666"}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.playButton}
            onPress={() => playChannel(item)}
          >
            <Ionicons name="play" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Organizando canais em pastas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header com busca e navegação */}
      <View style={styles.header}>
        {selectedGroup && (
          <TouchableOpacity style={styles.backButton} onPress={goBackToGroups}>
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
            <Text style={styles.backButtonText}>Voltar</Text>
          </TouchableOpacity>
        )}
        
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={selectedGroup ? `Buscar em ${selectedGroup.name}...` : "Buscar grupos ou canais..."}
              placeholderTextColor="#666"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#666" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Lista de Grupos ou Canais */}
      <View style={styles.contentContainer}>
        {!selectedGroup ? (
          // Mostrar lista de grupos (pastas)
          <>
            <View style={styles.statsContainer}>
              <Ionicons name="folder-open" size={20} color="#007AFF" />
              <Text style={styles.statsText}>
                {filteredGroups.length} pastas • {totalChannelsCount.toLocaleString()} canais total
              </Text>
            </View>

            <FlatList
              data={filteredGroups}
              renderItem={renderGroupItem}
              keyExtractor={(item, index) => `group-${index}`}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContainer}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="folder-outline" size={64} color="#666" />
                  <Text style={styles.emptyText}>
                    {searchQuery ? 'Nenhuma pasta encontrada' : 'Nenhuma pasta disponível'}
                  </Text>
                  {searchQuery && (
                    <Text style={styles.emptySubtext}>
                      Tente buscar por outro termo
                    </Text>
                  )}
                </View>
              }
            />
          </>
        ) : (
          // Mostrar canais da pasta selecionada
          <>
            <View style={styles.statsContainer}>
              <Ionicons name={getGroupIcon(selectedGroup.name)} size={20} color="#007AFF" />
              <Text style={styles.statsText}>
                {channelsInGroup.length} canais em "{selectedGroup.name}"
              </Text>
            </View>

            <FlatList
              data={channelsInGroup}
              renderItem={renderChannelItem}
              keyExtractor={(item) => item.id.toString()}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContainer}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="tv-outline" size={64} color="#666" />
                  <Text style={styles.emptyText}>
                    {searchQuery 
                      ? `Nenhum canal encontrado em "${selectedGroup.name}"` 
                      : `Nenhum canal disponível em "${selectedGroup.name}"`
                    }
                  </Text>
                  {searchQuery && (
                    <Text style={styles.emptySubtext}>
                      Tente buscar por outro termo
                    </Text>
                  )}
                </View>
              }
            />
          </>
        )}
      </View>
    </View>
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
    backgroundColor: '#1a1a1a',
    paddingTop: 10,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
    marginLeft: 5,
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: 15,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  contentContainer: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#2a2a2a',
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 12,
  },
  statsText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '600',
  },
  listContainer: {
    padding: 15,
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  groupIcon: {
    width: 50,
    height: 50,
    backgroundColor: '#1a1a1a',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  groupChannelCount: {
    color: '#666',
    fontSize: 14,
  },
  channelItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  channelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  channelLogo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  channelLogoPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#3a3a3a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  channelDetails: {
    flex: 1,
  },
  channelName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  channelGroup: {
    color: '#666',
    fontSize: 14,
  },
  channelActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  favoriteButton: {
    padding: 10,
    marginRight: 5,
  },
  playButton: {
    backgroundColor: '#007AFF',
    padding: 8,
    borderRadius: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    color: '#666',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 15,
    textAlign: 'center',
  },
  emptySubtext: {
    color: '#666',
    fontSize: 14,
    marginTop: 5,
    textAlign: 'center',
  },
});

export default ChannelsScreen;