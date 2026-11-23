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
   * Login user with backend verification and device trust
   * @param {Object} credentials - { user_id, password, company_code, location_code, fin_year_code, device_id, browser_agent }
   */
  login: async ({ userId, password, companyCode, locationCode, finYearCode, deviceId, browserAgent }) => {
    return await apiClient.post(API_ENDPOINTS.AUTH.LOGIN, {
      user_id: userId,
      password: password,
      company_code: companyCode,
      location_code: locationCode,
      fin_year_code: finYearCode,
      device_id: deviceId,
      browser_agent: browserAgent,
    });
  },

  /**
   * Request OTP code to be sent to user's registered email
   */
  forgotPassword: async ({ userId, companyCode, locationCode }) => {
    return await apiClient.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, {
      user_id: userId,
      company_code: companyCode,
      location_code: locationCode,
    });
  },

  /**
   * Verify entered 6-digit OTP code
   */
  verifyOtp: async ({ userId, companyCode, locationCode, otpCode }) => {
    return await apiClient.post(API_ENDPOINTS.AUTH.VERIFY_OTP, {
      user_id: userId,
      company_code: companyCode,
      location_code: locationCode,
      otp_code: otpCode,
    });
  },

  /**
   * Reset password with valid OTP code
   */
  resetPassword: async ({ userId, companyCode, locationCode, otpCode, newPassword }) => {
    return await apiClient.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, {
      user_id: userId,
      company_code: companyCode,
      location_code: locationCode,
      otp_code: otpCode,
      new_password: newPassword,
    });
  },

  /**
   * First-time account activation using OTP
   */
  activateAccount: async ({ userId, companyCode, locationCode, otpCode, newPassword }) => {
    return await apiClient.post(API_ENDPOINTS.AUTH.ACTIVATE_ACCOUNT, {
      user_id: userId,
      company_code: companyCode,
      location_code: locationCode,
      otp_code: otpCode,
      new_password: newPassword,
    });
  },

  /**
   * Verify device OTP and trust new browser
   */
  verifyDeviceOtp: async ({ userId, companyCode, locationCode, finYearCode, otpCode, deviceId, browserAgent }) => {
    return await apiClient.post(API_ENDPOINTS.AUTH.VERIFY_DEVICE_OTP, {
      user_id: userId,
      company_code: companyCode,
      location_code: locationCode,
      fin_year_code: finYearCode,
      otp_code: otpCode,
      device_id: deviceId,
      browser_agent: browserAgent,
    });
  },

  /**
   * Authenticated change password
   */
  changePassword: async ({ userId, companyCode, locationCode, currentPassword, newPassword }) => {
    return await apiClient.post(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, {
      user_id: userId,
      company_code: companyCode,
      location_code: locationCode,
      current_password: currentPassword,
      new_password: newPassword,
    });
  },

  /**
   * Request OTP to activate pre-created employee account for the first time
   */
  firstTimeActivate: async ({ userId, companyCode, locationCode }) => {
    return await apiClient.post(API_ENDPOINTS.AUTH.FIRST_TIME_ACTIVATE, {
      user_id: userId,
      company_code: companyCode,
      location_code: locationCode,
    });
  },
};

export default authApi;
