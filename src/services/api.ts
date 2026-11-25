import { LineResponse, StyleResponse, InOutChartResponse, PerformanceMetricsResponse, EmployeePerformanceResponse, EmployeePerformanceByPart, OutputDetailResponse, EmployeeSkillResponse, DefectInfoResponse, TopDefectResponse, POHistoryResponse, LoginResponse, UpdateLaborRequest, UpdateLaborResponse, VibrationDataResponse, SummaryPOHistoryResponse, DailyReportSewingRow, FactoryManagementResponse, mapDisplayToApiFactory, OutputEmployeeHourlyResponse, EmployeePerformance2Response, ProcessOutputHistoryResponse, LineBalanceResponse } from '../types/api';
import axios from 'axios';


// Factory-specific URLs
const FACTORY_URLS = {
  'YONGJIN 1': import.meta.env.VITE_API_YONGJIN_1,
  'YONGJIN 2': import.meta.env.VITE_API_YONGJIN_2,
  'YONGJIN 3': import.meta.env.VITE_API_YONGJIN_3
};

export const fetchOutputModules = async (params: {
  factory: string;
  lineno: string;
  styleno: string;
  datefrom: string; // YYYY-MM-DD
}): Promise<string[]> => {
  try {
    const apiFactory = mapDisplayToApiFactory(params.factory as any);
    const raw = await makeApiRequest<any[]>('get', 'CBC_WEB_GET_OUTPUT_MODULE', {
      params: {
        Factory: apiFactory,
        LineNo: params.lineno,
        StyleNo: params.styleno,
        DateFrom: params.datefrom,
      },
      timeout: 30000,
    });

    const modules = (raw || [])
      .map((item: any) => String(item.part ?? item.PART ?? '').trim())
      .filter(Boolean);

    return Array.from(new Set(modules)).sort((a, b) => a.localeCompare(b));
  } catch (error) {
    console.error('Error fetching output modules:', error);
    throw error;
  }
};

export const fetchProcessOutputHistory = async (params: {
  factory: string;
  lineno: string;
  style: string;
  datefrom: string; // YYYY-MM-DD
  dateto: string;   // YYYY-MM-DD
}): Promise<ProcessOutputHistoryResponse[]> => {
  try {
    const apiFactory = mapDisplayToApiFactory(params.factory as any);

    const raw = await makeApiRequest<any[]>('get', 'CBC_WEB_GET_CB_PROCESS_HISTORY', {
      params: {
        Factory: apiFactory,
        LineNo: params.lineno,
        Style: params.style,
        Datefrom: params.datefrom,
        Dateto: params.dateto,
      },
      timeout: 60000,
      retries: 1,
    });

    const mapped: ProcessOutputHistoryResponse[] = (raw || []).map((item: any) => ({
      WORK_DATE: String(item.WORK_DATE ?? item.work_date ?? ''),
      STYLE_NO: String(item.STYLE_NO ?? item.STYLE ?? item.style_no ?? item.style ?? ''),
      PART: String(item.PART ?? item.part ?? ''),
      NIK: String(item.NIK ?? item.nik ?? ''),
      E_NAME: String(item.E_NAME ?? item.e_name ?? ''),
      MDL_INDEX: String(item.MDL_INDEX ?? item.mdl_index ?? ''),
      ACTUAL: Number(item.ACTUAL ?? item.actual ?? 0),
      EMPNO: Number(item.EMPNO ?? item.empno ?? 0),
      AVERAGE: Number(item.AVERAGE ?? item.average ?? 0),
      AVERAGE_PER_PART: Number(item.AVERAGE_PER_PART ?? item.average_per_part ?? 0),
      TOTAL_QTY_ALL: Number(item.TOTAL_QTY_ALL ?? item.total_qty_all ?? 0),
      ASM_OUT: Number(item.ASM_OUT ?? item.asm_out ?? 0),
      STATUS_OUTPUT: String(item.STATUS_OUTPUT ?? item.status_output ?? ''),
    }));

    return mapped;
  } catch (error) {
    console.error('❌ Error fetching process output history:', error);
    throw error;
  }
};

// New Dashboard Summary API
export interface DashboardSummaryData {
  GRAND_TOTAL_CB: number;
  GRAND_TOTAL_LINES: number;
  TOTAL_YJ1_CB: number;
  TOTAL_YJ2_1_CB: number;
  TOTAL_YJ2_2_CB: number;
  TOTAL_YJ3_CB: number;
  TOTAL_ACTIVE_LINES_YJ1: number;
  TOTAL_ACTIVE_LINES_YJ2_1: number;
  TOTAL_ACTIVE_LINES_YJ2_2: number;
  TOTAL_ACTIVE_LINES_YJ3: number;
}

export const fetchDashboardSummary = async (): Promise<DashboardSummaryData> => {
  try {
    const response = await makeApiRequest<any>('get', 'GetDashboardSummary', {
      timeout: 30000,
    });
    
    if (response && response.status === 'success' && Array.isArray(response.data) && response.data.length > 0) {
      const data = response.data[0];
      return {
        GRAND_TOTAL_CB: Number(data.GRAND_TOTAL_CB || 0),
        GRAND_TOTAL_LINES: Number(data.GRAND_TOTAL_LINES || 0),
        TOTAL_YJ1_CB: Number(data.TOTAL_YJ1_CB || 0),
        TOTAL_YJ2_1_CB: Number(data.TOTAL_YJ2_1_CB || 0),
        TOTAL_YJ2_2_CB: Number(data.TOTAL_YJ2_2_CB || 0),
        TOTAL_YJ3_CB: Number(data.TOTAL_YJ3_CB || 0),
        TOTAL_ACTIVE_LINES_YJ1: Number(data.TOTAL_ACTIVE_LINES_YJ1 || 0),
        TOTAL_ACTIVE_LINES_YJ2_1: Number(data.TOTAL_ACTIVE_LINES_YJ2_1 || 0),
        TOTAL_ACTIVE_LINES_YJ2_2: Number(data.TOTAL_ACTIVE_LINES_YJ2_2 || 0),
        TOTAL_ACTIVE_LINES_YJ3: Number(data.TOTAL_ACTIVE_LINES_YJ3 || 0),
      };
    }
    return { 
      GRAND_TOTAL_CB: 0, GRAND_TOTAL_LINES: 0, 
      TOTAL_YJ1_CB: 0, TOTAL_YJ2_1_CB: 0, TOTAL_YJ2_2_CB: 0, TOTAL_YJ3_CB: 0,
      TOTAL_ACTIVE_LINES_YJ1: 0, TOTAL_ACTIVE_LINES_YJ2_1: 0, TOTAL_ACTIVE_LINES_YJ2_2: 0, TOTAL_ACTIVE_LINES_YJ3: 0
    };
  } catch (error) {
    console.error('❌ Error fetching dashboard summary:', error);
    return { 
      GRAND_TOTAL_CB: 0, GRAND_TOTAL_LINES: 0, 
      TOTAL_YJ1_CB: 0, TOTAL_YJ2_1_CB: 0, TOTAL_YJ2_2_CB: 0, TOTAL_YJ3_CB: 0,
      TOTAL_ACTIVE_LINES_YJ1: 0, TOTAL_ACTIVE_LINES_YJ2_1: 0, TOTAL_ACTIVE_LINES_YJ2_2: 0, TOTAL_ACTIVE_LINES_YJ3: 0
    };
  }
};

// New Graph Page API (ASMX)
export const fetchGraphPage = async (params: {
  Factory: string;
  LineNo: string;
  StyleNo: string;
  DateFrom: string; // YYYY-MM-DD
  DateTo: string;   // YYYY-MM-DD
}): Promise<GraphPageCurveItem[]> => {
  try {
    const raw = await makeApiRequest<any[]>('get', 'CBC_WEB_GET_GRAPH_PAGE', {
      params: {
        Factory: params.Factory,
        LineNo: params.LineNo,
        StyleNo: params.StyleNo,
        DateFrom: params.DateFrom,
        DateTo: params.DateTo,
      },
      timeout: 60000,
      retries: 1,
    });

    // Map ASMX response to GraphPageCurveItem shape consumed by UI
    const mapped: GraphPageCurveItem[] = (raw || []).map((item: any) => ({
      Line: params.LineNo,
      Style: String(item.STYLE ?? item.style ?? ''),
      'Work Date': String(item.work_date ?? item.WORK_DATE ?? ''),
      Module: String(item.part ?? item.PART ?? ''),
      Part: String(item.part ?? item.PART ?? ''),
      'PO NO': String(item.PO_NO ?? item.PO_NO ?? ''),
      'Total In': Number(item.TOTALIN ?? item.totalin ?? 0),
      'Total Out': Number(item.TOTALOUT ?? item.totalout ?? 0),
    }));

    return mapped;
  } catch (error) {
    console.error('❌ Error fetching graph page (ASMX):', error);
    throw error;
  }
};

// Global variable to store current factory
let currentFactory: string = 'YONGJIN 2'; // Default factory

// Function to set current factory
export const setCurrentFactory = (factory: string) => {
  if (FACTORY_URLS[factory as keyof typeof FACTORY_URLS]) {
    currentFactory = factory;
    resetApiUrlCache(); // Reset cache when factory changes
    console.log(`🏭 Factory switched to: ${factory}`);
  } else {
    console.warn(`⚠️ Unknown factory: ${factory}`);
  }
};

// Graph Page Curve
export type GraphPageCurveItem = {
  Line: string;
  'Work Date': string; // e.g. "2025-09-19 00:00:00.000"
  Module?: string;
  Part?: string;
  Style: string;
  'PO NO': string;
  'File No'?: string;
  Color?: string;
  'Order Qty'?: number;
  'Prod Qty'?: number;
  'Total In'?: number;
  'Total Out'?: number;
  'Cumulative In'?: number;
  'Cumulative Out'?: number;
  DetId?: number | string;
  [key: string]: any;
};

export const fetchGraphPageCurve = async (params: {
  Factory: string;
  DateFrom: string; // YYYY-MM-DD
  DateTo: string;   // YYYY-MM-DD
  Line: string;     // NOLINE or LINE accepted by backend
}): Promise<GraphPageCurveItem[]> => {
  try {
    // Use full path endpoint provided by backend
    const response = await makeApiRequest<GraphPageCurveItem[]>('get', 'GET_GRAPH_PAGE_CURVE', {
      params: {
        Factory: params.Factory,
        DateFrom: params.DateFrom,
        DateTo: params.DateTo,
        Line: params.Line
      },
      timeout: 60000,
      retries: 1
    });
    return response;
  } catch (error) {
    console.error('❌ Error fetching graph page curve:', error);
    throw error;
  }
};

// Function to get current factory URL
const getCurrentFactoryUrl = (): string => {
  return FACTORY_URLS[currentFactory as keyof typeof FACTORY_URLS] || FACTORY_URLS['YONGJIN 2'];
};


const BYPASS_CHECK_ENDPOINTS = [
  'CBC_WEB_GET_LINE_MONITORING',
  'CBC_WEB_GET_MODULE_TOTALIN_PIVOT',
  'CBC_WEB_GET_OUTPUT_MODULE_TTL',
  'CBC_WEB_GET_OUTPUT_MODULE_LINE_MONITORING',
  'CBC_WEB_GET_OUTPUT_MODULE_EMPLOYEE',
  'CBC_WEB_GET_ALGORISM_ARROWS',
  'CBC_WEB_GET_OUTPUT_EMPLOYEE_DETAIL',
  'CBC_WEB_GET_OUTPUT_EMPLOYEE',
  'CBC_WEB_GET_EMPLOYEE_STATS',
  'GetCBSewingOutputData',
  'GetCBSewingOutputData2',
  'GetAllOpDataPerProcess',
  'GetOpDataPerProcess',
  'CBC_WEB_ADD_MISSING_OUTPUT',
  'ClearCache',
  'SetOpStatus',
  'CBC_WEB_SET_WORKING_HOURS_OVERRIDE',
  'CBC_WEB_SET_LINE_WORKING_HOURS_OVERRIDE'
];

// Helper untuk mendapatkan base URL yang aktif
const getActiveApiUrl = async (endpoint?: string): Promise<string> => {
  const factoryUrl = getCurrentFactoryUrl();
  if (endpoint && BYPASS_CHECK_ENDPOINTS.includes(endpoint)) {
    console.log(`🏭 [Bypass Check] Menggunakan Factory API (${currentFactory}) untuk endpoint: ${endpoint}`);
  }
  return factoryUrl;
};

// Fungsi untuk mendapatkan API URL dengan cache
let cachedApiUrl: string | null = null;
const getApiBaseUrl = async (endpoint?: string, targetFactory?: string): Promise<string> => {
  if (targetFactory) {
    const mapped = mapDisplayToApiFactory(targetFactory as any);
    if (FACTORY_URLS[mapped as keyof typeof FACTORY_URLS]) {
      return FACTORY_URLS[mapped as keyof typeof FACTORY_URLS];
    }
  }
  // Jangan gunakan cache jika endpoint dibypass (agar factory url terupdate dengan benar)
  if (endpoint && BYPASS_CHECK_ENDPOINTS.includes(endpoint)) {
    return await getActiveApiUrl(endpoint);
  }
  if (!cachedApiUrl) {
    cachedApiUrl = await getActiveApiUrl(endpoint);
  }
  return cachedApiUrl;
};

// Reset cache jika diperlukan
export const resetApiUrlCache = () => {
  cachedApiUrl = null;
};

// In-flight request deduplication & short-lived response cache (prevents duplicate 2x API calls)
const inFlightRequests = new Map<string, Promise<any>>();
const apiResponseCache = new Map<string, { data: any; expiry: number }>();

const serializeParamsForCache = (params: any): string => {
  if (!params) return '';
  try {
    const keys = Object.keys(params).sort();
    return keys.map((k) => `${k}=${String(params[k])}`).join('&');
  } catch {
    return String(params);
  }
};

/**
 * Clears client-side API response cache, optionally matching an endpoint prefix.
 */
export const clearApiCache = (endpointPrefix?: string) => {
  if (!endpointPrefix) {
    apiResponseCache.clear();
    return;
  }
  for (const key of apiResponseCache.keys()) {
    if (key.includes(endpointPrefix)) {
      apiResponseCache.delete(key);
    }
  }
};

// Helper untuk membuat request API dengan retry logic, in-flight deduplication & micro-caching
export const makeApiRequest = async <T>(
  method: 'get' | 'post',
  endpoint: string,
  config?: {
    params?: any;
    data?: any;
    headers?: any;
    retries?: number;
    timeout?: number; // Tambahkan custom timeout
    noCache?: boolean; // Bypasses server & browser cache
  }
): Promise<T> => {
  const isGet = method.toLowerCase() === 'get';
  const shouldDeduplicate = isGet && !config?.noCache;
  const cacheKey = shouldDeduplicate
    ? `${endpoint}:${serializeParamsForCache(config?.params)}`
    : null;

  // 1. Check client micro-cache (absorbs rapid multi-effect triggers within 2.5 seconds)
  if (cacheKey) {
    const cached = apiResponseCache.get(cacheKey);
    if (cached && Date.now() < cached.expiry) {
      return cached.data as T;
    }
    // 2. Check in-flight promise (concurrent identical requests share the exact same promise)
    if (inFlightRequests.has(cacheKey)) {
      return inFlightRequests.get(cacheKey)! as Promise<T>;
    }
  }

  const execute = async (): Promise<T> => {
    const maxRetries = config?.retries || 2;
    let lastError: any;

    // Set timeout berdasarkan endpoint - PO_HISTORY memerlukan waktu lebih lama
    const defaultTimeout = endpoint === 'PO_HISTORY' ? 60000 : 10000; // 60 detik untuk PO_HISTORY, 10 detik untuk lainnya
    const timeout = config?.timeout || defaultTimeout;

    const reqFactory = config?.params?.Factory || config?.params?.factory || config?.params?.Office || config?.params?.office || config?.params?.officecode;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const baseUrl = await getApiBaseUrl(endpoint, reqFactory);
        const url = `${baseUrl}/${endpoint}`;

        if (attempt > 0) {
          console.log(`Mencoba koneksi ulang ke ${url} (Percobaan ke-${attempt})`);
          // Reset cache URL pada percobaan ulang
          resetApiUrlCache();
        }

        console.log(`🚀 API Request: ${method.toUpperCase()} ${endpoint} (Timeout: ${timeout / 1000}s)`);

        const jwtToken = endpoint !== 'auth_login' ? getJwtToken() : null;
        const headers = {
          ...(config?.headers || {}),
          ...(jwtToken && !config?.headers?.Authorization ? { Authorization: `Bearer ${jwtToken}` } : {}),
        };

        let params = config?.params;
        let data = config?.data;

        if (config?.noCache) {
          params = { ...(params || {}), _t: Date.now(), nocache: 'true' };
          if (data && typeof data === 'object' && !(data instanceof FormData) && !(data instanceof URLSearchParams)) {
            data = { ...data, nocache: 'true' };
          }
        }

        // Convert plain JS object to URLSearchParams when sending application/x-www-form-urlencoded
        if (
          method.toLowerCase() === 'post' &&
          data &&
          typeof data === 'object' &&
          !(data instanceof FormData) &&
          !(data instanceof URLSearchParams)
        ) {
          const searchParams = new URLSearchParams();
          Object.entries(data).forEach(([key, val]) => {
            if (val !== undefined && val !== null) {
              searchParams.append(key, String(val));
            }
          });
          data = searchParams;
        }

        const response = await axios({
          method,
          url,
          params,
          data,
          headers,
          timeout: timeout
        });

        if (
          endpoint !== 'auth_login' &&
          endpoint !== 'auth_verify' &&
          endpoint !== 'ClearCache' &&
          response.data &&
          typeof response.data === 'object' &&
          !Array.isArray(response.data) &&
          response.data.status === 'unauthorized'
        ) {
          await handleUnauthorizedResponse();
          throw new Error(response.data.message || 'Unauthorized');
        }

        console.log(`✅ API Response: ${endpoint} - ${response.data?.length || 0} records`);
        return response.data;
      } catch (error: any) {
        lastError = error;

        if (axios.isAxiosError(error) && error.response?.status === 401) {
          if (endpoint === 'ClearCache') {
            throw error;
          }
          if (endpoint !== 'auth_login' && endpoint !== 'auth_verify') {
            await handleUnauthorizedResponse();
          }
          throw error;
        }

        if (attempt === maxRetries) {
          console.error(`❌ Gagal melakukan request ke ${endpoint} setelah ${maxRetries} percobaan:`, error);
          throw error;
        }

        // Tunggu sebentar sebelum mencoba lagi
        const waitTime = 1000 * (attempt + 1);
        console.log(`⏳ Menunggu ${waitTime / 1000}s sebelum mencoba lagi...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    throw lastError;
  };

  if (cacheKey) {
    const requestPromise = execute()
      .then((resData) => {
        apiResponseCache.set(cacheKey, { data: resData, expiry: Date.now() + 2500 });
        return resData;
      })
      .finally(() => {
        inFlightRequests.delete(cacheKey);
      });

    inFlightRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }

  return execute();
};

// Helper untuk membersihkan cache server IIS (HttpRuntime.Cache)
export const clearServerCache = async (prefix: string = ''): Promise<{ success: boolean; cleared_count?: number } | null> => {
  try {
    clearApiCache(prefix);
    return await makeApiRequest<any>('get', 'ClearCache', {
      params: { prefix },
      noCache: true,
      retries: 0
    });
  } catch (err) {
    console.warn('Failed to clear server cache:', err);
    return null;
  }
};

let lastVerifiedToken: string | null = null;
let lastVerifiedAt = 0;
let inFlightVerifyPromise: Promise<boolean> | null = null;
let unauthorizedRedirecting = false;
const SESSION_VERIFY_TTL_MS = 5 * 60_000; // 5 minutes cache; sliding renewal handled by server
const AUTH_EXPIRED_NOTICE_KEY = 'auth_expired_notice';

const redirectToLoginOnExpired = () => {
  if (unauthorizedRedirecting) return;
  unauthorizedRedirecting = true;
  clearAllAuth();
  try {
    sessionStorage.setItem(AUTH_EXPIRED_NOTICE_KEY, 'Your session has expired or is no longer valid. Please sign in again.');
  } catch {
    // Ignore storage errors
  }
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.replace('/login');
  }
};

// Confirm with auth_verify before kicking user out on a stray 401 from another factory server
const handleUnauthorizedResponse = async (): Promise<void> => {
  const token = getJwtToken();
  if (!token || isTokenExpired()) {
    redirectToLoginOnExpired();
    return;
  }

  const stillValid = await verifySessionWithServer(true);
  if (!stillValid) {
    redirectToLoginOnExpired();
  }
};

const parseJwtPayload = (token: string): Record<string, any> | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
};

// Helper untuk set JWT token + userData
export const setAuthToken = (userData: LoginResponse, token: string) => {
  const payload = parseJwtPayload(token);
  const expiry = typeof payload?.exp === 'number' ? payload.exp * 1000 : Date.now() + 24 * 60 * 60 * 1000;
  localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, JSON.stringify({ token, userData, expiry }));
  lastVerifiedToken = token;
  lastVerifiedAt = Date.now();
  window.dispatchEvent(new Event('auth-changed'));
};

// Helper untuk get token object dan userData (tolak entry tanpa JWT 3-segmen yang valid)
export const getAuthToken = () => {
  const raw = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.token !== 'string' || parsed.token.split('.').length !== 3) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

export const getJwtToken = (): string | null => {
  const tokenObj = getAuthToken();
  const token = tokenObj?.token;
  if (typeof token !== 'string' || token.split('.').length !== 3) return null;
  return token;
};

// Helper untuk cek apakah JWT valid secara format & belum expired
export const isTokenExpired = () => {
  const token = getJwtToken();
  if (!token) return true;
  const payload = parseJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return true;
  return Date.now() >= payload.exp * 1000;
};

// Verifikasi signature & masa berlaku JWT langsung ke server (coalesced, tahan transient network error)
export const verifySessionWithServer = async (force = false): Promise<boolean> => {
  const token = getJwtToken();
  if (!token || isTokenExpired()) {
    clearAllAuth();
    return false;
  }

  if (!force && lastVerifiedToken === token && Date.now() - lastVerifiedAt < SESSION_VERIFY_TTL_MS) {
    return true;
  }

  if (inFlightVerifyPromise) {
    return inFlightVerifyPromise;
  }

  inFlightVerifyPromise = (async () => {
    try {
      // Pin auth_verify to primary auth server (YONGJIN 2) consistently with login
      const res = await makeApiRequest<any>('get', 'auth_verify', {
        params: { Factory: 'YONGJIN 2' },
        noCache: true,
        retries: 1,
        timeout: 15000,
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res?.status === 'success' && res?.data) {
        const current = getAuthToken();
        const activeToken = typeof res.token === 'string' && res.token.split('.').length === 3 ? res.token : token;
        const verifiedUserData: LoginResponse = {
          ...(current?.userData || {}),
          NIK: String(res.data.NIK ?? ''),
          username: String(res.data.username ?? ''),
          role: String(res.data.role ?? ''),
        };
        const expMs = typeof res.data.exp === 'number' ? res.data.exp * 1000 : current?.expiry;
        localStorage.setItem(
          STORAGE_KEYS.AUTH_TOKEN,
          JSON.stringify({ token: activeToken, userData: verifiedUserData, expiry: expMs })
        );
        lastVerifiedToken = activeToken;
        lastVerifiedAt = Date.now();
        unauthorizedRedirecting = false;
        return true;
      }

      if (res?.status === 'unauthorized') {
        clearAllAuth();
        return false;
      }

      // Unexpected non-401 payload: keep session if previously verified and not expired
      return lastVerifiedToken === token && !isTokenExpired();
    } catch (error: any) {
      // Only clear auth on explicit 401 Unauthorized from server — NEVER on transient timeout/network hiccup
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        clearAllAuth();
        return false;
      }
      console.warn('Transient error during auth_verify; preserving active non-expired session:', error?.message);
      return lastVerifiedToken === token && !isTokenExpired();
    } finally {
      inFlightVerifyPromise = null;
    }
  })();

  return inFlightVerifyPromise;
};

// Authentication
export const login = async (username: string, password: string, _rememberMe?: boolean): Promise<{ success: boolean; message: string; data?: LoginResponse }> => {
  try {
    // Call .NET ASMX endpoint via POST on primary auth server (YONGJIN 2)
    const response = await makeApiRequest<any>('post', 'auth_login', {
      params: { Factory: 'YONGJIN 2' },
      data: {
        USERNAME: username,
        PASSWORD: password
      },
      retries: 0
    });

    if (response && response.status === 'success' && typeof response.token === 'string' && Array.isArray(response.data) && response.data.length > 0) {
      const raw = response.data[0] || {};

      // Map raw ASMX fields to our LoginResponse shape
      const userData: LoginResponse = {
        NIK: String(raw.EMPL_NMBR || ''),
        username: String(raw.USER_IDXX || username || ''),
        role: String(raw.USER_LEVL ?? ''),
        last_login: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setAuthToken(userData, response.token);

      return {
        success: true,
        message: 'Login successful',
        data: userData
      };
    }

    const message = response?.message || 'Invalid credentials';
    return {
      success: false,
      message
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      message: 'An error occurred during login'
    };
  }
};

// Storage keys
export const STORAGE_KEYS = {
  CREDENTIALS: 'auth_credentials_v2',
  AUTH_TOKEN: 'auth_token_v2'
};

// Hanya simpan username jika rememberMe aktif (tidak pernah simpan password plaintext)
export const saveCredentials = (username: string, _password?: string) => {
  localStorage.setItem(STORAGE_KEYS.CREDENTIALS, JSON.stringify({ username }));
};

// Helper to get remembered username only
export const getSavedCredentials = (): { username: string } | null => {
  const saved = localStorage.getItem(STORAGE_KEYS.CREDENTIALS);
  if (!saved) return null;
  try {
    const parsed = JSON.parse(saved);
    return parsed?.username ? { username: String(parsed.username) } : null;
  } catch {
    return null;
  }
};

// Helper to clear credentials
export const clearCredentials = () => {
  localStorage.removeItem(STORAGE_KEYS.CREDENTIALS);
};

export const clearAllAuth = () => {
  lastVerifiedToken = null;
  lastVerifiedAt = 0;
  localStorage.removeItem(STORAGE_KEYS.CREDENTIALS);
  localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  window.dispatchEvent(new Event('auth-changed'));
};

// Get Line
export const fetchLines = async (officeCode: string): Promise<LineResponse[]> => {
  try {
    return await makeApiRequest<LineResponse[]>('get', 'get_line_new', {
      params: {
        officecode: officeCode
      }
    });
  } catch (error) {
    console.error('Error fetching lines:', error);
    throw error;
  }
};

// Legacy Get Line for History page (uses old get_line endpoint and office codes YONGJIN 1/2-1/2-2/3)
export const fetchLinesLegacy = async (officeCode: string): Promise<LineResponse[]> => {
  try {
    return await makeApiRequest<LineResponse[]>('get', 'get_line', {
      params: {
        officecode: officeCode
      }
    });
  } catch (error) {
    console.error('Error fetching legacy lines:', error);
    throw error;
  }
};

// Get Style
export const fetchStyles = async (params: {
  line_id: string;
  office: string;
  date: Date;
}): Promise<StyleResponse[]> => {
  try {
    const formattedDate = params.date.toISOString().split('T')[0]; // Format to YYYY-MM-DD

    return await makeApiRequest<StyleResponse[]>('get', 'get_style', {
      params: {
        line_id: params.line_id,
        office: params.office,
        date_from: formattedDate,
        date_to: formattedDate
      }
    });
  } catch (error) {
    console.error('Error fetching styles:', error);
    throw error;
  }
};

// Get Input/Output Chart Data
export const fetchInOutChart = async (params: {
  factory: string;
  lineno: string;
  styleno: string;
  date: string | Date;
}): Promise<InOutChartResponse[]> => {
  try {
    const formattedDate = typeof params.date === 'string'
      ? params.date
      : params.date.toISOString().split('T')[0];

    // Normalise factory (YONGJIN 2-1 / 2-2 -> YONGJIN 2)
    const apiFactory = mapDisplayToApiFactory(params.factory as any);

    // Call new endpoint CBC_WEB_GET_OUTPUT_MODULE
    const raw = await makeApiRequest<any[]>('get', 'CBC_WEB_GET_OUTPUT_MODULE', {
      params: {
        Factory: apiFactory,
        LineNo: params.lineno,
        StyleNo: params.styleno,
        DateFrom: formattedDate
      },
      timeout: 30000
    });

    // Map response to our InOutChartResponse shape (uppercase keys)
    const mapped: InOutChartResponse[] = (raw || []).map((item: any) => ({
      WORK_DATE: String(item.work_date || item.WORK_DATE || ''),
      PART: String(item.part || item.PART || ''),
      TOTALOUT: Number(item.TOTALOUT ?? item.totalout ?? 0),
      TOTALIN: Number(item.TOTALIN ?? item.totalin ?? 0)
    }));

    return mapped;
  } catch (error) {
    console.error('Error fetching chart data:', error);
    throw error;
  }
};

// Get Performance Metrics
export const fetchPerformanceMetrics = async (params: {
  workdate: string;
  linename: string;
  styleno: string;
  factory: string;
}): Promise<PerformanceMetricsResponse[]> => {
  try {
    // Fetch line data dulu untuk konversi NOLINE ke LINE
    const lineData = await makeApiRequest<LineResponse[]>('get', 'get_line', {
      params: {
        officecode: params.factory
      }
    });

    // Debug log
    console.log('Line Data:', lineData);
    console.log('NOLINE type:', typeof params.linename);
    console.log('Sample LINE NOLINE type:', typeof lineData[0]?.NOLINE);

    // Konversi NOLINE ke LINE
    const selectedLine = lineData.find(line => String(line.NOLINE) === String(params.linename));
    const actualLineName = selectedLine?.LINE || params.linename;

    console.log('Converting NOLINE', params.linename, 'to LINE', actualLineName);
    console.log('Selected Line:', selectedLine);

    const response = await makeApiRequest<any[]>('get', 'CBC_WEB_GET_DAILY_TARGET_LINE', {
      params: {
        WorkDate: params.workdate,
        LineNo: params.linename,
        Style: params.styleno
      }
    });

    // Mapping manual agar field UI selalu terisi
    return response.map(item => ({
      ...item,
      TARGET: item.TargetDay,
      ACHIEVEMENT: parseFloat(item.TargetDay_Percentage),
      ACTUAL: item.ASM_OUT,
    })) as PerformanceMetricsResponse[];
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    throw error;
  }
};

// Helper function untuk mendapatkan tanggal kerja sebelumnya
export const getPreviousWorkday = (date: string): string => {
  const currentDate = new Date(date);
  let previousDay = new Date(currentDate);

  do {
    previousDay.setDate(previousDay.getDate() - 1);
    // Jika hari ini Senin (1), kembalikan hari Jumat sebelumnya (5)
    if (currentDate.getDay() === 1) {
      previousDay = new Date(currentDate);
      previousDay.setDate(currentDate.getDate() - 3);
      break;
    }
  } while (previousDay.getDay() === 0 || previousDay.getDay() === 6); // Skip Sabtu dan Minggu

  return previousDay.toISOString().split('T')[0];
};

// Get Hourly Production
export const fetchHourlyProduction = async (params: {
  datefrom: string;
  lineno: string;
}): Promise<{
  today: { time: string; output: number; total?: number }[];
  yesterday?: { time: string; output: number; total?: number }[];
  avgPerHour?: number;
  avgPerHourYesterday?: number;
  workingHour?: number;
  jamPulang?: string;
}> => {
  try {
    console.log('🔍 fetchHourlyProduction called with params:', params);

    // Fetch today's data
    const todayResponse = await makeApiRequest<any>('get', 'HOUR_QC', {
      params: {
        WORKDATE: params.datefrom,
        LINENO: params.lineno,
      }
    });

    // Transform response
    const transformResponse = (data: any) => {
      try {
        const getHourValue = (row: any, hour: number) => {
          const hh = String(hour).padStart(2, '0');
          const keyWithColon = `${hh}:00`;
          const keyNoZero = `${hour}:00`;
          const keyHx = `H${hh}`;
          return Number(row?.[keyHx] ?? row?.[keyWithColon] ?? row?.[keyNoZero] ?? 0) || 0;
        };

        // Pastikan data adalah array
        let parsedData = Array.isArray(data) ? data : [data];
        console.log('📥 Raw API Response before processing:', parsedData);

        // Jika data kosong, return array kosong
        if (parsedData.length === 0) {
          return [];
        }

        // Ambil data QC / Endline counting.
        // Prefer 'QC', fallback ke 'QC ENDLINE', mengandung 'QC' / 'ENDLINE' / 'HELPER' (seperti di Yongjin 3)
        let qcData = parsedData.find((item: any) => String(item.MACHINE_NAME || '').trim().toUpperCase() === 'QC');
        if (!qcData) {
          qcData = parsedData.find((item: any) => String(item.MACHINE_NAME || '').trim().toUpperCase() === 'QC ENDLINE');
        }
        if (!qcData) {
          qcData = parsedData.find((item: any) => String(item.MACHINE_NAME || '').toUpperCase().includes('QC'));
        }
        if (!qcData) {
          qcData = parsedData.find((item: any) => String(item.MACHINE_NAME || '').toUpperCase().includes('ENDLINE'));
        }
        if (!qcData) {
          qcData = parsedData.find((item: any) => String(item.MACHINE_NAME || '').toUpperCase().includes('HELPER'));
        }
        if (!qcData) {
          // Cari row yang memiliki COUNTING_PROGRAM atau data jam produktif
          qcData = parsedData.find((item: any) => Number(item.COUNTING_PROGRAM || item.TOTAL_QTY || 0) > 0);
        }
        if (!qcData && parsedData.length > 0) {
          qcData = parsedData[0];
        }
        if (!qcData) {
          return [];
        }

        // Normalisasi nilai-nilai jam
        const normalizedData = {
          ...qcData,
          H06: getHourValue(qcData, 6),
          H07: getHourValue(qcData, 7),
          H08: getHourValue(qcData, 8),
          H09: getHourValue(qcData, 9),
          H10: getHourValue(qcData, 10),
          H11: getHourValue(qcData, 11),
          H12: getHourValue(qcData, 12),
          H13: getHourValue(qcData, 13),
          H14: getHourValue(qcData, 14),
          H15: getHourValue(qcData, 15),
          H16: getHourValue(qcData, 16),
          H17: getHourValue(qcData, 17),
          H18: getHourValue(qcData, 18),
          H19: getHourValue(qcData, 19),
          H20: getHourValue(qcData, 20),
          H21: getHourValue(qcData, 21),
          AVG_PER_HOUR: Number((qcData as any).AVG_PER_HOUR ?? (qcData as any).AVG_PER_HOUR_TODAY ?? 0) || 0,
          AVG_PER_HOUR_YESTERDAY: Number((qcData as any).AVG_PER_HOUR_YESTERDAY ?? 0) || 0,
          WORKING_HOUR: Number((qcData as any).WORKING_HOUR ?? 0) || 0,
          JAM_PULANG: String((qcData as any).JAM_PULANG ?? '')
        };

        // Hitung total yang sebenarnya
        const calculatedTotal =
          normalizedData.H06 + normalizedData.H07 +
          normalizedData.H08 + normalizedData.H09 +
          normalizedData.H10 + normalizedData.H11 +
          normalizedData.H12 + normalizedData.H13 +
          normalizedData.H14 + normalizedData.H15 +
          normalizedData.H16 + normalizedData.H17 +
          normalizedData.H18 + normalizedData.H19 +
          normalizedData.H20 + normalizedData.H21;

        const totalQty = calculatedTotal > 0
          ? calculatedTotal
          : Number((qcData as any).COUNTING_PROGRAM ?? (qcData as any).TOTAL_QTY ?? 0) || 0;

        console.log('📥 Normalized data:', normalizedData);
        return [{ ...normalizedData, TOTAL_QTY: totalQty }];
      } catch (error) {
        console.error('❌ Error in transform response:', error);
        return [];
      }
    };

    const todayData = transformResponse(todayResponse);

    let result = {
      today: [] as { time: string; output: number; total?: number }[],
      yesterday: [] as { time: string; output: number; total?: number }[],
      avgPerHour: undefined as number | undefined,
      avgPerHourYesterday: undefined as number | undefined,
      workingHour: undefined as number | undefined,
      jamPulang: undefined as string | undefined
    };

    // Process today's data (no combining; shift forward by 1 hour)
    if (Array.isArray(todayData) && todayData.length > 0) {
      const qcData = todayData[0];
      if (qcData) {
        const total = qcData.TOTAL_QTY;
        result.avgPerHour = Number((qcData as any).AVG_PER_HOUR ?? 0) || 0;
        result.avgPerHourYesterday = Number((qcData as any).AVG_PER_HOUR_YESTERDAY ?? 0) || 0;
        result.workingHour = Number((qcData as any).WORKING_HOUR ?? 0) || 0;
        result.jamPulang = String((qcData as any).JAM_PULANG ?? '');
        result.today = [
          { time: '08:00', output: qcData.H07, total },
          { time: '09:00', output: qcData.H08, total },
          { time: '10:00', output: qcData.H09, total },
          { time: '11:00', output: qcData.H10, total },
          { time: '12:00', output: qcData.H11, total },
          { time: '13:00', output: 0, total },
          { time: '14:00', output: qcData.H13 + qcData.H12, total },
          { time: '15:00', output: qcData.H14, total },
          { time: '16:00', output: qcData.H15, total },
          { time: '17:00', output: qcData.H16, total },
          { time: '18:00', output: qcData.H17, total },
          { time: '19:00', output: qcData.H18, total },
          { time: '20:00', output: qcData.H19, total },
          { time: '21:00', output: qcData.H20, total },
        ];
      }
    }

    // Yesterday's hourly data is no longer fetched separately.
    // AVG_PER_HOUR_YESTERDAY is included in today's HOUR_QC response.

    console.log('📤 Final transformed result:', result);
    return result;
  } catch (error) {
    console.error('❌ Error fetching hourly production:', error);
    throw error;
  }
};

// Get Employee Performance Data
export const fetchEmployeePerformanceData = async (params: {
  factory: string;
  lineno: string;
  styleno: string;
  start: string;
  end: string;
  datefrom: string;
}): Promise<{ byPart: EmployeePerformanceByPart; bySplitModule: EmployeePerformanceByPart }> => {
  try {
    const apiFactory = mapDisplayToApiFactory(params.factory as any);
    const response = await makeApiRequest<EmployeePerformanceResponse[]>('get', 'CBC_WEB_GET_EMPLOYEE_STATS', {
      params: {
        Factory: apiFactory,
        LineNo: params.lineno,
        StyleNo: params.styleno,
        DateFrom: params.datefrom
      },
      timeout: 30000
    });

    const byPart: EmployeePerformanceByPart = {};
    const bySplitModule: EmployeePerformanceByPart = {};

    (response || []).forEach(item => {
      const partKey = item.PART || 'OTHER';
      const splitKey = item.SUBPART_NM || item.PART || 'OTHER';

      if (!byPart[partKey]) {
        byPart[partKey] = { chartData: [], tableData: [] };
      }
      if (!bySplitModule[splitKey]) {
        bySplitModule[splitKey] = { chartData: [], tableData: [] };
      }

      const chartItem = {
        name: item.E_NAME || item.NIK,
        output: Number(item.ACTUAL || 0),
        average: Number(item.AVERAGE || 0),
        nik: item.NIK,
        employeeName: item.E_NAME,
        statusColor: item.STATUS_COLOR,
        cbid: item.CBID
      };

      const tableItem = {
        nik: item.NIK,
        name: item.E_NAME,
        actual: Number(item.ACTUAL || 0),
        asmOutput: Number(item.ASM_OUT || 0),
        target: Number(item.AVERAGE_PER_PART || item.AVERAGE || 0),
        isBottleneck: item.STATUS_OUTPUT === 'Deficient' || item.STATUS_OUTPUT === 'Warning',
        status: item.STATUS_OUTPUT || '',
        statusColor: item.STATUS_COLOR || ''
      };

      byPart[partKey].chartData.push(chartItem);
      byPart[partKey].tableData.push(tableItem);

      bySplitModule[splitKey].chartData.push(chartItem);
      bySplitModule[splitKey].tableData.push(tableItem);
    });

    return { byPart, bySplitModule };
  } catch (error) {
    console.error('Error fetching employee performance data:', error);
    return { byPart: {}, bySplitModule: {} };
  }
};

export const fetchAvailableCbid = async (params: {
  lineNo: string;
}): Promise<any[]> => {
  try {
    return await makeApiRequest<any[]>('get', 'CBC_CEK_CBID_AVAILABLE', {
      params: {
        LineNo: params.lineNo
      },
      timeout: 30000
    });
  } catch (error) {
    console.error('Error checking available CBID:', error);
    throw error;
  }
};

export const updateEmployeeCbid = async (params: {
  lineId: string;
  officeCode: string;
  createdBy: string;
}): Promise<any[]> => {
  try {
    const apiFactory = mapDisplayToApiFactory(params.officeCode as any);
    return await makeApiRequest<any[]>('get', 'CBC_WEB_INSERT_REGISTER_2', {
      params: {
        LineID: params.lineId,
        OfficeCode: apiFactory,
        CreatedBy: params.createdBy
      },
      timeout: 30000
    });
  } catch (error) {
    console.error('Error updating CBID:', error);
    throw error;
  }
};

export const registerEmployeeRfid = async (params: {
  fr_id: string;
  empl_nmbr: string;
}): Promise<any[]> => {
  try {
    return await makeApiRequest<any[]>('get', 'scan_rd', {
      params: {
        fr_id: params.fr_id,
        empl_nmbr: params.empl_nmbr
      },
      timeout: 30000
    });
  } catch (error) {
    console.error('Error registering employee RFID:', error);
    throw error;
  }
};

// Get Employee Performance Data (Testing Feature)
export const fetchEmployeePerformanceData2 = async (params: {
  factory: string;
  lineno: string;
  styleno: string;
  workdate: string;
}): Promise<EmployeePerformanceByPart> => {
  try {
    const apiFactory = mapDisplayToApiFactory(params.factory as any);
    const response = await makeApiRequest<EmployeePerformance2Response[]>('get', 'CBC_WEB_GET_EMPLOYEE_STATS_2', {
      params: {
        Factory: apiFactory,
        LineNo: params.lineno,
        Style: params.styleno,
        Workdate: params.workdate
      },
      timeout: 30000
    });

    const groupedData: EmployeePerformanceByPart = {};

    response.forEach(item => {
      if (!groupedData[item.PART]) {
        groupedData[item.PART] = {
          chartData: [],
          tableData: []
        };
      }

      const chartItem = {
        name: String(item.MDL_INDEX ?? ''),
        output: item.ACTUAL,
        average: item.AVERAGE,
        nik: item.NIK,
        employeeName: item.E_NAME
      };
      groupedData[item.PART].chartData.push(chartItem);

      groupedData[item.PART].tableData.push({
        nik: item.NIK,
        name: item.E_NAME,
        actual: item.ACTUAL,
        asmOutput: item.ASM_OUT,
        target: item.AVERAGE_PER_PART,
        isBottleneck: item.STATUS_OUTPUT === 'Deficient' || item.STATUS_OUTPUT === 'Warning',
        status: item.STATUS_OUTPUT,
        statusColor: '' // EmployeePerformance2Response doesn't have STATUS_COLOR yet in interface, check interface.
      });

      groupedData[item.PART].tableData = groupedData[item.PART].tableData
        .filter(emp => emp.isBottleneck)
        .sort((a, b) => {
          // Priority: Deficient > Warning > Others
          const getPriority = (status: string) => {
            if (status === 'Deficient') return 0;
            if (status === 'Warning') return 1;
            return 2;
          };
          const priorityA = getPriority(a.status);
          const priorityB = getPriority(b.status);

          if (priorityA !== priorityB) {
            return priorityA - priorityB;
          }
          return b.actual - a.actual;
        });
    });

    return groupedData;
  } catch (error) {
    console.error('Error fetching employee performance data 2:', error);
    throw error;
  }
};

export const fetchLineBalanceData = async (params: {
  factory: string;
  workdate: string;
  starthour: string;
  endhour: string;
}): Promise<LineBalanceResponse> => {
  try {
    const response = await makeApiRequest<LineBalanceResponse>('get', 'GET_LINE_BALANCE_DATA_HOURLY', {
      params: {
        factory: params.factory,
        workdate: params.workdate,
        starthour: params.starthour,
        endhour: params.endhour,
      }
    });
    return response;
  } catch (error) {
    console.error('Error fetching line balance data:', error);
    throw error;
  }
};

export const fetchActionPlanNew = async (params: {
  factory: string;
  workdate: string; // YYYY-MM-DD
  lineno: string;
  styleno?: string;
}): Promise<any> => {
  try {
    const apiFactory = mapDisplayToApiFactory(params.factory as any);
    return await makeApiRequest<any>('get', 'GetActionPlanData', {
      params: {
        FACTORY: apiFactory,
        WORKDATE: params.workdate,
        LINENO: params.lineno,
        STYLENO: params.styleno ? String(params.styleno) : ''
      },
      timeout: 180000,
      retries: 1,
    });
  } catch (error) {
    console.error('Error fetching action plan:', error);
    throw error;
  }
};

export const fetchActionPlan = async (params: {
  factory: string;
  workdate: string; // YYYY-MM-DD
  lineno: string;
  styleno?: string;
}): Promise<any[]> => {
  try {
    const apiFactory = mapDisplayToApiFactory(params.factory as any);
    return await makeApiRequest<any[]>('get', 'CBC_WEB_GET_ACTION_PLAN', {
      params: {
        LINENO: params.lineno,
        FACTORY: apiFactory,
        WORKDATE: params.workdate,
        STYLENO: params.styleno ? String(params.styleno) : ''
      },
      timeout: 180000,
      retries: 1,
    });
  } catch (error) {
    console.error('Error fetching action plan:', error);
    throw error;
  }
};

export const upsertActionPlanModuleSplit = async (params: {
  factory: string;
  lineCode: string;
  styleNo: string;
  moduleFrom: string;
  moduleList: string[];
  updatedBy?: string;
}): Promise<{ status?: string; rowsAffected?: number; message?: string }> => {
  const apiFactory = mapDisplayToApiFactory(params.factory as any);
  return await makeApiRequest<any>('get', 'CBC_ACTIONPLAN_MODULE_SPLIT_UPSERT', {
    params: {
      FACTORY: apiFactory,
      LINE_CODE: params.lineCode,
      STYLE_NO: params.styleNo,
      MODULE_FROM: params.moduleFrom,
      MODULE_LIST: (params.moduleList || []).join(', '),
      UPDATED_BY: params.updatedBy ?? ''
    },
    timeout: 60000,
    retries: 0,
  });
};

export const fetchNewLayout = async (params: {
  lineno: string;
  style: string;
}): Promise<any[]> => {
  return await makeApiRequest<any[]>('get', 'CBC_WEB_GET_NEW_LAYOUT', {
    params: {
      LINENO: params.lineno,
      STYLE: params.style,
    },
    timeout: 60000,
    retries: 0,
  });
};

export const fetchNewLayoutAct = async (params: {
  lineno: string;
  style: string;
  prepId: string;
}): Promise<any[]> => {
  return await makeApiRequest<any[]>('get', 'GetNewLayoutAct', {
    params: {
      LINENO: params.lineno,
      STYLENO: params.style,
      PREP_ID: params.prepId,
    },
    timeout: 60000,
    retries: 0,
  });
};

export const fetchModuleListAct = async (params: {
  lineno: string;
  style: string;
  prepId: string;
}): Promise<any[]> => {
  return await makeApiRequest<any[]>('get', 'GetModuleListAct', {
    params: {
      LINENO: params.lineno,
      STYLENO: params.style,
      PREP_ID: params.prepId,
    },
    timeout: 60000,
    retries: 0,
  });
};

export const splitModuleAct = async (params: {
  lineCode: string;
  styleNo: string;
  moduleName: string;
  inputFlowNo: string;
  outputFlowNo: string;
  flowList: string;
}): Promise<{ status?: string; rowsAffected?: number; message?: string }> => {
  return await makeApiRequest<any>('get', 'SplitModuleAct', {
    params: {
      LINE_CODE: params.lineCode,
      STYLE_NO: params.styleNo,
      MODULE_NAME: params.moduleName,
      INPUT_FLOW_NO: params.inputFlowNo,
      OUTPUT_FLOW_NO: params.outputFlowNo,
      FLOW_LIST: params.flowList,
    },
    timeout: 60000,
    retries: 0,
  });
};

export const removeFlowFromModuleAct = async (params: {
  lineCode: string;
  styleNo: string;
  flowNo: string;
}): Promise<{ status?: string; rowsAffected?: number; message?: string }> => {
  return await makeApiRequest<any>('get', 'RemoveFlowFromModuleAct', {
    params: {
      LINE_CODE: params.lineCode,
      STYLE_NO: params.styleNo,
      FLOW_NO: params.flowNo,
    },
    timeout: 60000,
    retries: 0,
  });
};

export const deleteSplitModuleAct = async (params: {
  lineCode: string;
  styleNo: string;
  moduleName: string;
}): Promise<{ status?: string; rowsAffected?: number; message?: string }> => {
  return await makeApiRequest<any>('get', 'DeleteSplitModuleAct', {
    params: {
      LINE_CODE: params.lineCode,
      STYLE_NO: params.styleNo,
      MODULE_NAME: params.moduleName,
    },
    timeout: 60000,
    retries: 0,
  });
};



export const upsertActionPlanOperatorOverride = async (params: {
  factory: string;
  lineCode: string;
  styleNo: string;
  part: string;
  workDate: string; // YYYY-MM-DD
  mpNoIn?: string;
  mfNoIn?: string;
  pfNoIn?: string;
  sfNoIn?: string;
  flowNoIn?: string;
  mpNoOut?: string;
  mfNoOut?: string;
  pfNoOut?: string;
  sfNoOut?: string;
  flowNoOut?: string;
  updatedBy?: string;
}): Promise<{ status?: string; rowsAffected?: number; message?: string }> => {
  const apiFactory = mapDisplayToApiFactory(params.factory as any);
  return await makeApiRequest<any>('get', 'CBC_ACTIONPLAN_OPERATOR_OVERRIDE_UPSERT', {
    params: {
      FACTORY: apiFactory,
      LINE_CODE: params.lineCode,
      STYLE_NO: params.styleNo,
      PART: params.part,
      WORK_DATE: params.workDate,
      MP_NO_IN: params.mpNoIn ?? '',
      MF_NO_IN: params.mfNoIn ?? '',
      PF_NO_IN: params.pfNoIn ?? '',
      SF_NO_IN: params.sfNoIn ?? '',
      FLOW_NO_IN: params.flowNoIn ?? '',
      MP_NO_OUT: params.mpNoOut ?? '',
      MF_NO_OUT: params.mfNoOut ?? '',
      PF_NO_OUT: params.pfNoOut ?? '',
      SF_NO_OUT: params.sfNoOut ?? '',
      FLOW_NO_OUT: params.flowNoOut ?? '',
      UPDATED_BY: params.updatedBy ?? ''
    },
    timeout: 60000,
    retries: 0,
  });
};

export const deleteActionPlanOperatorOverride = async (params: {
  factory: string;
  lineCode: string;
  styleNo: string;
  part: string;
  workDate: string; // YYYY-MM-DD
  updatedBy?: string;
}): Promise<{ status?: string; rowsAffected?: number; message?: string }> => {
  const apiFactory = mapDisplayToApiFactory(params.factory as any);
  return await makeApiRequest<any>('get', 'CBC_ACTIONPLAN_OPERATOR_OVERRIDE_DELETE', {
    params: {
      FACTORY: apiFactory,
      LINE_CODE: params.lineCode,
      STYLE_NO: params.styleNo,
      PART: params.part,
      WORK_DATE: params.workDate,
      UPDATED_BY: params.updatedBy ?? ''
    },
    timeout: 60000,
    retries: 0,
  });
};

export type CorrectiveActionMasterRow = {
  Id: number;
  Corrective_Actions: string;
  IsActive?: boolean;
};

export const fetchCorrectiveActionMaster = async (params?: {
  onlyActive?: boolean;
}): Promise<CorrectiveActionMasterRow[]> => {
  const response = await makeApiRequest<any[]>('get', 'CBC_CA_Master_List', {
    params: {
      OnlyActive: params?.onlyActive === false ? 'false' : 'true'
    }
  });

  return (response || []).map((item: any) => ({
    Id: Number(item.Id ?? item.ID ?? 0),
    Corrective_Actions: String(item.Corrective_Actions ?? item.CORRECTIVE_ACTIONS ?? ''),
    IsActive: item.IsActive ?? item.ISACTIVE
  }));
};

export const createCorrectiveActionMaster = async (params: {
  correctiveAction: string;
  createdBy?: string;
}): Promise<{ status: string; id?: any; message?: string }> => {
  return await makeApiRequest<any>('get', 'CBC_CA_Master_Create', {
    params: {
      Corrective_Actions: params.correctiveAction,
      CreatedBy: params.createdBy ?? ''
    }
  });
};

export type IssueMasterRow = {
  Id: number;
  Issue: string;
  IsActive?: boolean;
};

export const fetchIssueMaster = async (params?: {
  onlyActive?: boolean;
}): Promise<IssueMasterRow[]> => {
  const response = await makeApiRequest<any[]>('get', 'CBC_Issue_Master_List', {
    params: {
      OnlyActive: params?.onlyActive === false ? 'false' : 'true'
    }
  });

  return (response || []).map((item: any) => ({
    Id: Number(item.Id ?? item.ID ?? 0),
    Issue: String(item.Issue ?? item.ISSUE ?? ''),
    IsActive: item.IsActive ?? item.ISACTIVE
  }));
};

export const createIssueMaster = async (params: {
  issue: string;
  createdBy?: string;
}): Promise<{ status: string; id?: any; message?: string }> => {
  return await makeApiRequest<any>('get', 'CBC_Issue_Master_Create', {
    params: {
      Issue: params.issue,
      CreatedBy: params.createdBy ?? ''
    }
  });
};

export type LineBalanceManualInputRow = {
  Factory: string;
  WorkDate: string;
  Line: string;
  Style: string;
  Module: string;
  NIK: string;
  TimeCheck?: string | null;
  AfterOutputH?: string | null;
  PIC?: string | null;
  Issue?: string | null;
  CorrectiveAction?: string | null;
};

export const fetchLineBalanceManualInput = async (params: {
  factory: string;
  workDate: string; // YYYY-MM-DD
}): Promise<LineBalanceManualInputRow[]> => {
  const response = await makeApiRequest<any[]>('get', 'CBC_LineBalanceManual_List', {
    params: {
      Factory: params.factory,
      WorkDate: params.workDate
    }
  });

  const normalizeWorkDate = (value: any): string => {
    const s = String(value ?? '').trim();
    if (!s) return params.workDate;
    // Common backend format: "YYYY-MM-DD 00:00:00.000"
    if (s.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    // Fallback: keep as-is
    return s;
  };

  return (response || []).map((item: any) => ({
    Factory: String(item.Factory ?? item.FACTORY ?? ''),
    WorkDate: normalizeWorkDate(item.WorkDate ?? item.WORKDATE ?? params.workDate ?? ''),
    Line: String(item.Line ?? item.LINE ?? ''),
    Style: String(item.Style ?? item.STYLE ?? ''),
    Module: String(item.Module ?? item.MODULE ?? ''),
    NIK: String(item.NIK ?? item.Nik ?? ''),
    TimeCheck: item.TimeCheck ?? item.TIMECHECK ?? null,
    AfterOutputH: item.AfterOutputH ?? item.AFTEROUTPUTH ?? null,
    PIC: item.PIC ?? null,
    Issue: item.Issue ?? null,
    CorrectiveAction: item.CorrectiveAction ?? item.CORRECTIVEACTION ?? null,
  }));
};

export const upsertLineBalanceManualInput = async (params: {
  factory: string;
  workDate: string; // YYYY-MM-DD
  line: string;
  style: string;
  module: string;
  nik: string;
  timeCheck?: string;
  afterOutputH?: string;
  pic?: string;
  issue?: string;
  correctiveAction?: string;
  updatedBy?: string;
}): Promise<{ status: string; id?: any; message?: string }> => {
  return await makeApiRequest<any>('get', 'CBC_LineBalanceManual_Upsert', {
    params: {
      Factory: params.factory,
      WorkDate: params.workDate,
      Line: params.line,
      Style: params.style,
      Module: params.module,
      NIK: params.nik,
      TimeCheck: params.timeCheck ?? '',
      AfterOutputH: params.afterOutputH ?? '',
      PIC: params.pic ?? '',
      Issue: params.issue ?? '',
      CorrectiveAction: params.correctiveAction ?? '',
      UpdatedBy: params.updatedBy ?? '',
    }
  });
};

export const fetchOutputModuleEmployee = async (params: {
  factory: string;
  lineno: string;
  styleno: string;
  datefrom: string;
  module: string;
}): Promise<EmployeePerformanceResponse[]> => {
  try {
    const apiFactory = mapDisplayToApiFactory(params.factory as any);
    const response = await makeApiRequest<EmployeePerformanceResponse[]>('get', 'CBC_WEB_GET_OUTPUT_MODULE_EMPLOYEE', {
      params: {
        Factory: apiFactory,
        LineNo: params.lineno,
        StyleNo: params.styleno,
        DateFrom: params.datefrom,
        Module: params.module
      },
      timeout: 30000
    });

    return response;
  } catch (error) {
    console.error('Error fetching module employee data:', error);
    throw error;
  }
};

export const fetchEmployeeDetailHistory = async (params: {
  nik: string;
  style: string;
  workdate: string;
}): Promise<any[]> => {
  try {
    const response = await makeApiRequest<any[]>('get', 'CBC_WEB_GET_OUTPUT_EMPLOYEE_DETAIL', {
      params: {
        nik: params.nik,
        style: params.style,
        workdate: params.workdate
      },
      timeout: 30000
    });
    return response;
  } catch (error) {
    console.error('Error fetching employee detail history:', error);
    throw error;
  }
};

export const fetchAlgorismArrows = async (params: {
  lineNo: number;
  styleNo: string;
  factory: string;
}): Promise<any[]> => {
  try {
    const response = await makeApiRequest<any[]>('get', 'CBC_WEB_GET_ALGORISM_ARROWS', {
      params: {
        lineNo: params.lineNo,
        styleNo: params.styleNo,
        factory: params.factory
      },
      timeout: 30000
    });
    return response;
  } catch (error) {
    console.error('Error fetching algorism arrows:', error);
    throw error;
  }
};

// Get Employee Output Detail
export const fetchEmployeeOutputDetail = async (params: {
  factory: string;
  datefrom: string;
  dateto: string;
  lineno: string;
  styleno: string;
  overline?: string;
  nik: string;
}): Promise<OutputDetailResponse[]> => {
  try {
    console.log('🔍 fetchEmployeeOutputDetail called with params:', params);

    const apiFactory = mapDisplayToApiFactory(params.factory as any);

    const response = await makeApiRequest<OutputDetailResponse[]>('get', 'VIEW_OUTPUT_DTL', {
      params: {
        factory: apiFactory,
        datefrom: params.datefrom,
        dateto: params.dateto,
        lineno: params.lineno,
        styleno: params.styleno,
        overline: params.overline || '',
        nik: params.nik
      }
    });

    console.log('📥 Output Detail Response:', response);
    return response;
  } catch (error) {
    console.error('❌ Error fetching employee output detail:', error);
    throw error;
  }
};

export const editEmployeeLastOutput = async (params: {
  workdate: string; // YYYY-MM-DD
  nik: string;
  newQty: number;
  updatedBy: string;
}): Promise<{ status: string; rowsAffected?: number; message?: string }> => {
  try {
    return await makeApiRequest<any>('get', 'CBC_WEB_EDIT_EMP_OUTPUT', {
      params: {
        WORKDATE: params.workdate,
        NIK: params.nik,
        NEW_QTY: params.newQty,
        UPDATED_BY: params.updatedBy,
      },
      timeout: 30000,
      retries: 0,
    });
  } catch (error) {
    console.error('❌ Error editing employee last output:', error);
    throw error;
  }
};

// Get Employee Skill
export const fetchEmployeeSkill = async (params: {
  nik: string;
}): Promise<EmployeeSkillResponse[]> => {
  try {
    console.log('🔍 fetchEmployeeSkill called with params:', params);

    const response = await makeApiRequest<EmployeeSkillResponse[]>('get', 'VIEW_SKILL', {
      params: {
        empl_nmbr: params.nik
      }
    });

    console.log('📥 Employee Skill Response:', response);
    return response;
  } catch (error) {
    console.error('❌ Error fetching employee skill:', error);
    throw error;
  }
};

export const fetchEmployeeHourlyOutput = async (params: {
  style: string;
  nik: string;
  date: string; // YYYY-MM-DD
  lineNo?: string;
  excludeSuspected?: boolean | number;
}): Promise<OutputEmployeeHourlyResponse[]> => {
  try {
    const queryParams: Record<string, any> = {
      Style: params.style,
      NIK: params.nik,
      Date: params.date,
      LINENO: params.lineNo || '',
      ExcludeSuspected: params.excludeSuspected ? 1 : 0,
    };

    const response = await makeApiRequest<any[]>('get', 'CBC_WEB_GET_OUTPUT_EMPLOYEE', {
      params: queryParams,
      timeout: 30000,
    });

    const mapped: OutputEmployeeHourlyResponse[] = (response || []).map((item: any) => ({
      ID: String(item.ID ?? ''),
      STYLE: String(item.STYLE ?? '').trim(),
      JAM: String(item.JAM ?? ''),
      QTY: Number(item.QTY ?? 0),
      NIK: String(item.NIK ?? '').trim(),
      TIME_DIFF: item.TIME_DIFF != null ? Number(item.TIME_DIFF) : null,
      Q1: item.Q1 != null ? Number(item.Q1) : null,
      Q3: item.Q3 != null ? Number(item.Q3) : null,
      IQR: item.IQR != null ? Number(item.IQR) : null,
      UPPER_LIMIT: item.UPPER_LIMIT != null ? Number(item.UPPER_LIMIT) : null,
      LOWER_LIMIT: item.LOWER_LIMIT != null ? Number(item.LOWER_LIMIT) : null,
      AVERAGE: item.AVERAGE != null ? Number(item.AVERAGE) : null,
      REMARK: item.REMARK != null ? String(item.REMARK).trim() : null,
      STATUS: item.STATUS != null ? String(item.STATUS).trim() : null,
      // Quartile with all data (including suspected errors)
      Q1_ALL: item.Q1_ALL != null ? Number(item.Q1_ALL) : (item.Q1 != null ? Number(item.Q1) : null),
      Q3_ALL: item.Q3_ALL != null ? Number(item.Q3_ALL) : (item.Q3 != null ? Number(item.Q3) : null),
      IQR_ALL: item.IQR_ALL != null ? Number(item.IQR_ALL) : (item.IQR != null ? Number(item.IQR) : null),
      UPPER_LIMIT_ALL: item.UPPER_LIMIT_ALL != null ? Number(item.UPPER_LIMIT_ALL) : (item.UPPER_LIMIT != null ? Number(item.UPPER_LIMIT) : null),
      LOWER_LIMIT_ALL: item.LOWER_LIMIT_ALL != null ? Number(item.LOWER_LIMIT_ALL) : (item.LOWER_LIMIT != null ? Number(item.LOWER_LIMIT) : null),
      AVERAGE_ALL: item.AVERAGE_ALL != null ? Number(item.AVERAGE_ALL) : (item.AVERAGE != null ? Number(item.AVERAGE) : null),
      REMARK_ALL: item.REMARK_ALL != null ? String(item.REMARK_ALL).trim() : (item.REMARK != null ? String(item.REMARK).trim() : null),
      STATUS_ALL: item.STATUS_ALL != null ? String(item.STATUS_ALL).trim() : (item.STATUS != null ? String(item.STATUS).trim() : null),
      // Quartile excluding suspected input errors (< 25.7s)
      Q1_EXCL: item.Q1_EXCL != null ? Number(item.Q1_EXCL) : null,
      Q3_EXCL: item.Q3_EXCL != null ? Number(item.Q3_EXCL) : null,
      IQR_EXCL: item.IQR_EXCL != null ? Number(item.IQR_EXCL) : null,
      UPPER_LIMIT_EXCL: item.UPPER_LIMIT_EXCL != null ? Number(item.UPPER_LIMIT_EXCL) : null,
      LOWER_LIMIT_EXCL: item.LOWER_LIMIT_EXCL != null ? Number(item.LOWER_LIMIT_EXCL) : null,
      AVERAGE_EXCL: item.AVERAGE_EXCL != null ? Number(item.AVERAGE_EXCL) : null,
      REMARK_EXCL: item.REMARK_EXCL != null ? String(item.REMARK_EXCL).trim() : null,
      STATUS_EXCL: item.STATUS_EXCL != null ? String(item.STATUS_EXCL).trim() : null,
      IS_SUSPECTED: item.IS_SUSPECTED != null ? Number(item.IS_SUSPECTED) : (item.TIME_DIFF != null && Number(item.TIME_DIFF) <= 25.7 ? 1 : 0),
      ETC_PERSON: item.ETC_PERSON != null ? Number(item.ETC_PERSON) : null,
      EMP_GROUP: item.EMP_GROUP != null ? String(item.EMP_GROUP).trim() : null,
      // Yesterday quartile stats (today - 1 day)
      Q1_YESTERDAY: item.Q1_YESTERDAY != null ? Number(item.Q1_YESTERDAY) : null,
      Q3_YESTERDAY: item.Q3_YESTERDAY != null ? Number(item.Q3_YESTERDAY) : null,
      IQR_YESTERDAY: item.IQR_YESTERDAY != null ? Number(item.IQR_YESTERDAY) : null,
      Q1_ALL_YESTERDAY: item.Q1_ALL_YESTERDAY != null ? Number(item.Q1_ALL_YESTERDAY) : (item.Q1_YESTERDAY != null ? Number(item.Q1_YESTERDAY) : null),
      Q3_ALL_YESTERDAY: item.Q3_ALL_YESTERDAY != null ? Number(item.Q3_ALL_YESTERDAY) : (item.Q3_YESTERDAY != null ? Number(item.Q3_YESTERDAY) : null),
      IQR_ALL_YESTERDAY: item.IQR_ALL_YESTERDAY != null ? Number(item.IQR_ALL_YESTERDAY) : (item.IQR_YESTERDAY != null ? Number(item.IQR_YESTERDAY) : null),
      Q1_EXCL_YESTERDAY: item.Q1_EXCL_YESTERDAY != null ? Number(item.Q1_EXCL_YESTERDAY) : null,
      Q3_EXCL_YESTERDAY: item.Q3_EXCL_YESTERDAY != null ? Number(item.Q3_EXCL_YESTERDAY) : null,
      IQR_EXCL_YESTERDAY: item.IQR_EXCL_YESTERDAY != null ? Number(item.IQR_EXCL_YESTERDAY) : null,
    }));

    return mapped;
  } catch (error) {
    console.error('❌ Error fetching employee hourly output:', error);
    throw error;
  }
};

// Fungsi untuk konversi NOLINE ke LINE
export const convertNoLineToLine = (lines: LineResponse[], noline: string): string => {
  const selectedLine = lines.find(line => String(line.NOLINE) === String(noline));
  return selectedLine?.LINE || noline;
};

export const fetchDefectInfo = async (style: string, line: string, workdate: string, factory: string = 'IDJ'): Promise<DefectInfoResponse> => {

  try {
    console.log('🔍 fetchDefectInfo dipanggil dengan params:', { style, line, workdate, factory });

    // Panggil fetchInOutChart untuk mendapatkan data grafik
    const apiFactory = mapDisplayToApiFactory(factory as any);

    const chartData = await fetchInOutChart({
      factory: apiFactory, // Gunakan factory yang sudah dinormalisasi
      lineno: line,
      styleno: style,
      date: new Date(workdate)
    });
    console.log('📊 Data grafik diterima:', chartData);

  } catch (error) {
    console.error('❌ Error saat mengambil data defect info:', error);
    throw error;
  }

  const formData = new URLSearchParams();
  formData.append('style', style);
  formData.append('line', line);
  formData.append('workdate', workdate);

  const response = await makeApiRequest<DefectInfoResponse[]>('post', 'GET_DEFECT_INFO_PROD', {
    data: formData,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    }
  });

  return response[0]; // API returns array with single item
};

export const fetchTopDefects = async (line: string, workdate: string, factory: string = 'IDJ'): Promise<TopDefectResponse[]> => {
  const apiFactory = mapDisplayToApiFactory(factory as any);
  const formData = new URLSearchParams();
  formData.append('line', line);
  formData.append('workdate', workdate);
  formData.append('factory', apiFactory);

  return await makeApiRequest<TopDefectResponse[]>('post', 'GET_TOP_THREE_DEFECT', {
    data: formData,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    }
  });
};

export const fetchPOHistory = async (params: {
  line: string | number;
  workdate: string;
}): Promise<POHistoryResponse[]> => {
  try {
    console.log(`🔍 fetchPOHistory called with params:`, params);

    // Pastikan line dikirim sebagai number, -1 jika kosong
    let lineParam: number = -1;
    if (params.line && !isNaN(Number(params.line))) {
      lineParam = Number(params.line);
    }

    // Tambahkan timeout khusus untuk PO_HISTORY karena data bisa sangat besar
    const response = await makeApiRequest<POHistoryResponse[]>('get', 'PO_HISTORY', {
      params: {
        line: lineParam,
        workdate: params.workdate
      },
      timeout: 120000, // 2 menit untuk data besar
      retries: 1 // Kurangi retry untuk data besar
    });

    console.log(`📥 PO History Response: ${response?.length || 0} records received`);
    return response;
  } catch (error) {
    console.error('❌ Error fetching PO history:', error);

    // Handle specific error types
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout - data terlalu besar atau koneksi lambat. Silakan coba lagi.');
      } else if (error.response?.status === 500) {
        throw new Error('Server error - kemungkinan data terlalu besar untuk diproses.');
      } else if (error.response?.status === 404) {
        throw new Error('Endpoint tidak ditemukan.');
      }
    }

    throw new Error('Gagal mengambil data PO History. Silakan coba lagi.');
  }
};

// Get Vibration Data
export const fetchVibrationData = async (params: {
  lineNo: string;
  workdate: string;
}): Promise<VibrationDataResponse[]> => {
  try {
    console.log('🔍 fetchVibrationData called with params:', params);

    return await makeApiRequest<VibrationDataResponse[]>('get', 'GET_VIBRATION_DATA', {
      params: {
        lineNo: params.lineNo,
        workdate: params.workdate
      }
    });
  } catch (error) {
    console.error('❌ Error fetching vibration data:', error);
    throw error;
  }
};

export const updatePOHistoryLabor = async (data: UpdateLaborRequest): Promise<UpdateLaborResponse> => {
  try {
    console.log('Preparing to send request with data:', data);

    // Validasi process sesuai dengan yang diizinkan di stored procedure
    const validProcesses = ['INPUT_MODULE', 'QC_END_LINE', 'HANGTAG', 'POLYBAG', 'PACKING'];
    if (!validProcesses.includes(data.PROCESS)) {
      throw new Error(`Invalid process: ${data.PROCESS}. Valid processes are: ${validProcesses.join(', ')}`);
    }

    const formData = new URLSearchParams();
    formData.append('PO_NO', data.PO_NO);
    formData.append('START_SEW', data.START_SEW);
    formData.append('END_SEW', data.END_SEW);
    formData.append('SIZE_CODE', data.SIZE_CODE);
    formData.append('PROCESS', data.PROCESS);
    formData.append('VALUE', Math.max(0, parseInt(data.VALUE.toString())).toString()); // Memastikan VALUE adalah integer positif
    formData.append('USER', data.USER);
    // Sertakan DET_ID sesuai kebutuhan backend
    if (data.DET_ID !== undefined && data.DET_ID !== null) {
      formData.append('DET_ID', String(data.DET_ID));
    }

    console.log('FormData prepared:', Object.fromEntries(formData));

    const response = await makeApiRequest<UpdateLaborResponse>('post', 'UPDATE_PO_HISTORY_LABOR', {
      data: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    });

    console.log('API Response:', response);
    return response;
  } catch (error) {
    console.error('❌ Error updating PO history labor:', error);
    if (axios.isAxiosError(error)) {
      console.error('Request details:', {
        url: error.config?.url,
        method: error.config?.method,
        data: error.config?.data,
        headers: error.config?.headers,
        response: error.response?.data
      });
    }
    if (axios.isAxiosError(error) && error.response) {
      return error.response.data as UpdateLaborResponse;
    }
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to update labor data'
    };
  }
};

export const fetchSummaryPOHistory = async (params: {
  line: string;
  workdate: string;
}): Promise<SummaryPOHistoryResponse[]> => {
  try {
    console.log('🔍 fetchSummaryPOHistory called with params:', params);

    const response = await makeApiRequest<SummaryPOHistoryResponse[]>('get', 'SUMMARY_PO_HISTORY', {
      params: {
        line: params.line,
        workdate: params.workdate
      },
      timeout: 60000, // 60 detik untuk summary data
      retries: 2
    });

    console.log('📥 Summary PO History Response:', response);
    return response;
  } catch (error) {
    console.error('❌ Error fetching summary PO history:', error);

    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout - data terlalu besar atau koneksi lambat. Silakan coba lagi.');
      } else if (error.response?.status === 500) {
        throw new Error('Server error - kemungkinan data terlalu besar untuk diproses.');
      } else if (error.response?.status === 404) {
        throw new Error('Endpoint tidak ditemukan.');
      }
    }

    throw new Error('Gagal mengambil data Summary PO History. Silakan coba lagi.');
  }
};

export const fetchDailyReportSewing = async (params: {
  line: string;
  workdate: string;
}): Promise<DailyReportSewingRow[]> => {
  try {
    console.log('🔍 fetchDailyReportSewing called with params:', params);
    const response = await makeApiRequest<DailyReportSewingRow[]>('get', 'DAILY_REPORT_SEWING', {
      params: {
        line: params.line,
        workdate: params.workdate
      },
      timeout: 60000,
      retries: 2
    });
    console.log('📥 DailyReportSewing Response:', response);
    return response;
  } catch (error) {
    console.error('❌ Error fetching daily report sewing:', error);
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout - koneksi lambat atau data besar.');
      }
    }
    throw error;
  }
};

// Get Factory Management data with LINE_CODE to LINENAME conversion
export const fetchFactoryManagement = async (params: {
  Factory: string;
  DateFrom: string; // YYYY-MM-DD
  DateTo: string;   // YYYY-MM-DD
  LineNo?: string;
  StyleNo?: string;
}): Promise<FactoryManagementResponse[]> => {
  try {
    console.log('🔍 fetchFactoryManagement called with params:', params);

    // Fetch factory management data
    const response = await makeApiRequest<FactoryManagementResponse[]>('get', 'CBC_WEB_GET_FACTORY_MANAGEMENT_NEW', {
      params: {
        Factory: params.Factory,
        DateFrom: params.DateFrom,
        DateTo: params.DateTo,
        LineNo: params.LineNo ?? '',
        StyleNo: params.StyleNo ?? ''
      },
      timeout: 60000,
      retries: 2
    });

    console.log('📥 Factory Management Response:', response);

    // Fetch line data for conversion
    const lineData = await fetchLines(params.Factory);
    console.log('📥 Line Data for conversion:', lineData);

    // Create a map of LINE_CODE to LINENAME
    const lineCodeMap = new Map<string, string>();
    lineData.forEach(line => {
      lineCodeMap.set(String(line.NOLINE), line.LINE);
    });

    // Convert LINE_CODE to LINENAME
    const enrichedData = response.map(item => ({
      ...item,
      LINENAME: lineCodeMap.get(item.LINE_CODE) || item.LINE_CODE
    }));

    console.log('✅ Factory Management data with LINENAME:', enrichedData);
    return enrichedData;
  } catch (error) {
    console.error('❌ Error fetching factory management:', error);
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout - koneksi lambat atau data besar.');
      }
    }
    throw error;
  }
};

export type { FactoryManagementResponse };

export const fetchManualTargetWH = async (params: {
  factory: string;
  lineno: string;
  styleno: string;
  workdate: string;
}): Promise<{ TARGET: number | null, WORKING_HOUR: number | null }> => {
  try {
    const apiFactory = mapDisplayToApiFactory(params.factory as any);
    const response = await makeApiRequest<any>('get', 'CBC_WEB_GET_MANUAL_TARGET_WH', {
      params: {
        FACTORY: apiFactory,
        LINENO: params.lineno,
        STYLENO: params.styleno,
        WORKDATE: params.workdate
      },
      timeout: 30000,
    });
    
    if (response && response.status === 'success' && Array.isArray(response.data) && response.data.length > 0) {
      return {
        TARGET: response.data[0].MANUAL_TARGET ?? null,
        WORKING_HOUR: response.data[0].MANUAL_WORKING_HOUR ?? null
      };
    }
    return { TARGET: null, WORKING_HOUR: null };
  } catch (error) {
    console.error('❌ Error fetching manual target WH:', error);
    return { TARGET: null, WORKING_HOUR: null };
  }
};

export const saveManualTargetWH = async (params: {
  factory: string;
  lineno: string;
  styleno: string;
  workdate: string;
  target: number;
  working_hour: number;
}): Promise<boolean> => {
  try {
    const apiFactory = mapDisplayToApiFactory(params.factory as any);
    const response = await makeApiRequest<any>('get', 'CBC_WEB_SAVE_MANUAL_TARGET_WH', {
      params: {
        FACTORY: apiFactory,
        LINENO: params.lineno,
        STYLENO: params.styleno,
        WORKDATE: params.workdate,
        TARGET: params.target,
        WORKING_HOUR: params.working_hour
      },
      timeout: 30000,
    });
    
    if (response && response.status === 'success') {
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Error saving manual target WH:', error);
    throw error;
  }
};

export interface HapusReset0Response {
  status: string;
  message?: string;
  targetDate?: string;
  rowsAffected?: number;
}

export const executeHapusReset0 = async (targetDate: string, factory?: string): Promise<HapusReset0Response> => {
  try {
    if (factory) {
      const apiFactory = mapDisplayToApiFactory(factory as any);
      setCurrentFactory(apiFactory);
    }
    
    const response = await makeApiRequest<HapusReset0Response>('post', 'CBC_WEB_HAPUS_RESET0', {
      params: { targetDate },
      data: { targetDate },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 120000,
    });

    return response;
  } catch (error) {
    console.error('❌ Error executing CBC_WEB_HAPUS_RESET0:', error);
    throw error;
  }
};

