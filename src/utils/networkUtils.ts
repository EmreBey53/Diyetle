import NetInfo from '@react-native-community/netinfo';

export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: string;
}

// Network durumunu kontrol et
export const checkNetworkStatus = async (): Promise<NetworkState> => {
  try {
    const state = await NetInfo.fetch();
    return {
      isConnected: state.isConnected ?? false,
      isInternetReachable: state.isInternetReachable ?? false,
      type: state.type || 'unknown',
    };
  } catch (error) {
    return {
      isConnected: false,
      isInternetReachable: false,
      type: 'unknown',
    };
  }
};

// Network bağlantısını bekle
export const waitForNetwork = async (maxWaitTime: number = 10000): Promise<boolean> => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitTime) {
    const networkState = await checkNetworkStatus();
    if (networkState.isConnected && networkState.isInternetReachable) {
      return true;
    }
    
    // 1 saniye bekle
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return false;
};

// Retry mekanizması
export const retryWithBackoff = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Network durumunu kontrol et
      const networkState = await checkNetworkStatus();
      if (!networkState.isConnected) {
        throw new Error('No network connection');
      }
      
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Son deneme değilse bekle
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
};

// Network listener
export const subscribeToNetworkChanges = (callback: (state: NetworkState) => void) => {
  return NetInfo.addEventListener(state => {
    callback({
      isConnected: state.isConnected ?? false,
      isInternetReachable: state.isInternetReachable ?? false,
      type: state.type || 'unknown',
    });
  });
};