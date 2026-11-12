import axios from "axios";

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || "/api", withCredentials: true });

const NO_REFRESH = ["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout", "/auth/forgot-password", "/auth/reset-password"];
let refreshing = null;

// Access tokens last 15 minutes. On a 401 we silently rotate the refresh cookie once and retry the request.
api.interceptors.response.use((res) => res, async (error) => {
  const { config, response } = error;
  if (response?.status === 401 && config && !config._retried && !NO_REFRESH.some((u) => config.url?.startsWith(u))) {
    config._retried = true;
    try {
      refreshing = refreshing || api.post("/auth/refresh").finally(() => { refreshing = null; });
      await refreshing;
      return api(config);
    } catch {
      window.dispatchEvent(new Event("auth:expired"));
    }
  }
  return Promise.reject(error);
});

export default api;
