import { apiClient } from './client';
import { API_ENDPOINTS } from './endpoints';

/**
 * Authentication API Service
 * Connects Login and Auth Metadata with FastAPI backend
 */
export const authApi = {
  /**
   * Fetch company, location, and financial year metadata from backend
   */
  getAuthMeta: async ({ companyCode, locationCode } = {}) => {
    const params = {};
    if (companyCode) params.company_code = companyCode;
    if (locationCode) params.location_code = locationCode;
    return await apiClient.get(API_ENDPOINTS.AUTH.META, { params });
  },

  /**
   * Login user with backend verification
   * @param {Object} credentials - { user_id, password, company_code, location_code, fin_year_code }
   */
  login: async ({ userId, password, companyCode, locationCode, finYearCode }) => {
    return await apiClient.post(API_ENDPOINTS.AUTH.LOGIN, {
      user_id: userId,
      password: password,
      company_code: companyCode,
      location_code: locationCode,
      fin_year_code: finYearCode,
    });
  },
};

export default authApi;
