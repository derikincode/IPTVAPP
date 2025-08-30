import AsyncStorage from '@react-native-async-storage/async-storage';
import XtreamCodeClient from 'xtream_code_client';

class XtreamService {
  constructor() {
    this.client = null;
    this.isInitialized = false;
  }

  async init() {
    try {
      const connectionType = await AsyncStorage.getItem('connection_type');
      
      if (connectionType === 'xtream') {
        const host = await AsyncStorage.getItem('xtream_host');
        const username = await AsyncStorage.getItem('xtream_username');
        const password = await AsyncStorage.getItem('xtream_password');
        
        if (host && username && password) {
          this.client = new XtreamCodeClient({
            serverUrl: host,
            username: username,
            password: password
          });
          
          console.log('🔌 Xtream Client inicializado:', { host, username });
          
          try {
            const accountInfo = await this.client.getAccountInfo();
            if (accountInfo && accountInfo.user_info) {
              this.isInitialized = true;
              console.log('✅ Conexão Xtream validada:', accountInfo.user_info.username);
              return true;
            }
          } catch (testError) {
            console.error('❌ Erro ao testar conexão Xtream:', testError);
            return false;
          }
        }
      }
      
      return false;
    } catch (error) {
      console.error('Erro ao inicializar Xtream Service:', error);
      return false;
    }
  }

  isAvailable() {
    return this.client && this.isInitialized;
  }

  async getAccountInfo() {
    try {
      if (!this.isAvailable()) {
        throw new Error('Cliente Xtream não inicializado');
      }

      const accountInfo = await this.client.getAccountInfo();
      
      return {
        success: true,
        userInfo: accountInfo.user_info,
        serverInfo: accountInfo.server_info
      };
    } catch (error) {
      console.error('Erro ao buscar info da conta:', error);
      return { success: false, error: error.message };
    }
  }

  async getLiveCategories() {
    try {
      if (!this.isAvailable()) {
        throw new Error('Cliente Xtream não inicializado');
      }

      console.log('📺 Buscando categorias de TV ao vivo...');
      const categories = await this.client.getLiveCategories();
      
      return {
        success: true,
        categories: categories.map(cat => ({
          id: cat.category_id,
          name: cat.category_name,
          type: 'live'
        }))
      };
    } catch (error) {
      console.error('Erro ao buscar categorias de TV:', error);
      return { success: false, error: error.message };
    }
  }

  async getLiveStreams(categoryId = null) {
    try {
      if (!this.isAvailable()) {
        throw new Error('Cliente Xtream não inicializado');
      }

      console.log('📺 Buscando canais ao vivo...', categoryId ? `categoria: ${categoryId}` : 'todas');
      const streams = await this.client.getLiveStreams(categoryId);
      
      return {
        success: true,
        channels: streams.map(stream => ({
          id: stream.stream_id,
          name: stream.name,
          logo: stream.stream_icon,
          group: stream.category_name || 'Canais',
          url: this.client.getLiveStreamUrl(stream.stream_id),
          type: 'live',
          epgChannelId: stream.epg_channel_id,
          added: stream.added,
          isAdult: stream.is_adult === "1"
        }))
      };
    } catch (error) {
      console.error('Erro ao buscar canais ao vivo:', error);
      return { success: false, error: error.message };
    }
  }

  async getVodCategories() {
    try {
      if (!this.isAvailable()) {
        throw new Error('Cliente Xtream não inicializado');
      }

      console.log('🎬 Buscando categorias de filmes...');
      const categories = await this.client.getVodCategories();
      
      return {
        success: true,
        categories: categories.map(cat => ({
          id: cat.category_id,
          name: cat.category_name,
          type: 'vod'
        }))
      };
    } catch (error) {
      console.error('Erro ao buscar categorias de filmes:', error);
      return { success: false, error: error.message };
    }
  }

  async getVodStreams(categoryId = null) {
    try {
      if (!this.isAvailable()) {
        throw new Error('Cliente Xtream não inicializado');
      }

      console.log('🎬 Buscando filmes VOD...', categoryId ? `categoria: ${categoryId}` : 'todos');
      const streams = await this.client.getVodStreams(categoryId);
      
      return {
        success: true,
        movies: streams.map(stream => ({
          id: stream.stream_id,
          name: stream.name,
          logo: stream.stream_icon,
          group: stream.category_name || 'Filmes',
          url: this.client.getVodStreamUrl(stream.stream_id),
          type: 'vod',
          added: stream.added,
          rating: stream.rating,
          year: stream.year,
          plot: stream.plot,
          cast: stream.cast,
          director: stream.director,
          genre: stream.genre,
          duration: stream.duration,
          releaseDate: stream.releaseDate,
          tmdbId: stream.tmdb_id,
          imdbRating: stream.rating_5based,
          isAdult: stream.is_adult === "1"
        }))
      };
    } catch (error) {
      console.error('Erro ao buscar filmes VOD:', error);
      return { success: false, error: error.message };
    }
  }

  async getSeriesCategories() {
    try {
      if (!this.isAvailable()) {
        throw new Error('Cliente Xtream não inicializado');
      }

      console.log('📚 Buscando categorias de séries...');
      const categories = await this.client.getSeriesCategories();
      
      return {
        success: true,
        categories: categories.map(cat => ({
          id: cat.category_id,
          name: cat.category_name,
          type: 'series'
        }))
      };
    } catch (error) {
      console.error('Erro ao buscar categorias de séries:', error);
      return { success: false, error: error.message };
    }
  }

  async getSeries(categoryId = null) {
    try {
      if (!this.isAvailable()) {
        throw new Error('Cliente Xtream não inicializado');
      }

      console.log('📚 Buscando séries...', categoryId ? `categoria: ${categoryId}` : 'todas');
      const series = await this.client.getSeries(categoryId);
      
      return {
        success: true,
        series: series.map(serie => ({
          id: serie.series_id,
          name: serie.name,
          logo: serie.cover,
          group: serie.category_name || 'Séries',
          type: 'series',
          plot: serie.plot,
          cast: serie.cast,
          director: serie.director,
          genre: serie.genre,
          year: serie.year,
          rating: serie.rating,
          lastModified: serie.last_modified,
          episodeRunTime: serie.episode_run_time,
          backdrop: serie.backdrop_path,
          tmdbId: serie.tmdb_id,
          isAdult: serie.is_adult === "1"
        }))
      };
    } catch (error) {
      console.error('Erro ao buscar séries:', error);
      return { success: false, error: error.message };
    }
  }

  async getCachedData(key, maxAge = 3600000) {
    try {
      const cached = await AsyncStorage.getItem(`xtream_cache_${key}`);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < maxAge) {
          console.log(`📦 Cache hit para: ${key}`);
          return data;
        } else {
          console.log(`⏰ Cache expirado para: ${key}`);
          await AsyncStorage.removeItem(`xtream_cache_${key}`);
        }
      }
      return null;
    } catch (error) {
      console.warn('Erro ao ler cache:', error);
      return null;
    }
  }

  async setCachedData(key, data) {
    try {
      const cacheData = {
        data,
        timestamp: Date.now()
      };
      await AsyncStorage.setItem(`xtream_cache_${key}`, JSON.stringify(cacheData));
      console.log(`💾 Cache salvo para: ${key}`);
    } catch (error) {
      console.warn('Erro ao salvar cache:', error);
    }
  }

  async getContent(type, categoryId = null, useCache = true) {
    const cacheKey = `${type}_${categoryId || 'all'}`;
    
    if (useCache) {
      const cached = await this.getCachedData(cacheKey);
      if (cached) {
        return { success: true, ...cached, fromCache: true };
      }
    }

    let result;
    console.log(`🔄 Buscando dados frescos: ${type}`);
    
    switch (type) {
      case 'account_info':
        result = await this.getAccountInfo();
        break;
      case 'live_categories':
        result = await this.getLiveCategories();
        break;
      case 'live_streams':
        result = await this.getLiveStreams(categoryId);
        break;
      case 'vod_categories':
        result = await this.getVodCategories();
        break;
      case 'vod_streams':
        result = await this.getVodStreams(categoryId);
        break;
      case 'series_categories':
        result = await this.getSeriesCategories();
        break;
      case 'series':
        result = await this.getSeries(categoryId);
        break;
      default:
        return { success: false, error: `Tipo de conteúdo inválido: ${type}` };
    }

    if (result.success && useCache) {
      await this.setCachedData(cacheKey, result);
    }

    return { ...result, fromCache: false };
  }
}

const xtreamService = new XtreamService();
export default xtreamService;