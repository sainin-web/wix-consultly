import axios from 'axios';
import { getWixAdminToken } from './getWixAdminToken';

const apiInterCepter = axios.create({
    baseURL: process.env.REACT_APP_BACKEND_HOST,
});

// We will inject `app` later
export const setupInterceptor = (app) => {
    apiInterCepter.interceptors.request.use(
        async (config) => {
            const token = await getWixAdminToken(app);

            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }

            return config;
        },
        (error) => Promise.reject(error)
    );
};

export default apiInterCepter;
