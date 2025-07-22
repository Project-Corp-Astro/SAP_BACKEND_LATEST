// Frontend API Configuration
// Single entry point for all backend communication

export const API_CONFIG = {
  BASE_URL: 'https://sap.corpastro.com/api',
  
  // SAP Backend Services
  SAP: {
    AUTH: '/auth',
    USERS: '/users', 
    SUBSCRIPTION: '/subscription',
    CONTENT: '/content'
  },
  
  // External Applications
  ASTRO_ENGINE: '/astro-engine',
  ASTRO_RATAN: '/astro-ratan', 
  THIRD_APP: '/third-app'
};

// API Client Example
class APIClient {
  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
  }
  
  // SAP Services
  async login(credentials) {
    return fetch(`${this.baseURL}${API_CONFIG.SAP.AUTH}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
  }
  
  async getUsers() {
    return fetch(`${this.baseURL}${API_CONFIG.SAP.USERS}`);
  }
  
  // External Services
  async getAstroEngineData() {
    return fetch(`${this.baseURL}${API_CONFIG.ASTRO_ENGINE}/data`);
  }
  
  async getAstroRatanData() {
    return fetch(`${this.baseURL}${API_CONFIG.ASTRO_RATAN}/data`);
  }
  
  async getThirdAppData() {
    return fetch(`${this.baseURL}${API_CONFIG.THIRD_APP}/data`);
  }
}

export default new APIClient();
