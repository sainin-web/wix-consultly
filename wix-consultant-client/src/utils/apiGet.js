import axios from "axios";

function baseUrl() {
  const host = process.env.REACT_APP_BACKEND_HOST || "";
  return host.replace(/\/$/, "");
}

/**
 * Generic GET to your backend.
 * @param {string} path - Path starting with /, e.g. "/api/users/me"
 * @param {import("axios").AxiosRequestConfig} [config] - axios config (params, headers, etc.)
 * @returns {Promise<any>} response.data
 */
export async function apiGet(path, config = {}) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const { data } = await axios.get(`${baseUrl()}${normalized}`, config);
  return data;
}
