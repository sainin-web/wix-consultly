import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

// API call using createAsyncThunk
export const fetchUsers = createAsyncThunk("users/fetch", async () => {
    const response = await axios.get(`${process.env.REACT_APP_BACKEND_HOST}/api/users/user-details`);

    return response.data;
});

export const fetchUserDetailsByIds = createAsyncThunk("users/fetch-details", async (userId) => {
    console.log("userId", userId);
    const response = await axios.get(`${process.env.REACT_APP_BACKEND_HOST}/api/users/shopify/users/${userId}`);
    return response.data;
});

export const fetchVoucherData = createAsyncThunk("users/fetch-voucher-data", async (shopId) => {
    const token = localStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await axios.get(`${process.env.REACT_APP_BACKEND_HOST}/api/users/get/vouchers/${shopId}`, {
        headers,
    });
    console.log("response.data.data", response.data.data)
    return response.data.data;
});

const userSlice = createSlice({
    name: "users",
    initialState: {
        users: [],
        loading: false,
        error: null,
        userDetails: null,
        voucherData: null,
    },

    extraReducers: (builder) => {
        builder
            .addCase(fetchUsers.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchUsers.fulfilled, (state, action) => {
                state.loading = false;
                state.users = action.payload;
            })
            .addCase(fetchUsers.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message;
            })
            .addCase(fetchUserDetailsByIds.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchUserDetailsByIds.fulfilled, (state, action) => {
                state.loading = false;
                state.userDetails = action.payload;
            })
            .addCase(fetchUserDetailsByIds.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message;
            })
            .addCase(fetchVoucherData.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchVoucherData.fulfilled, (state, action) => {
                state.loading = false;
                state.voucherData = action.payload;
            })
            .addCase(fetchVoucherData.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message;
            });
    },
});

export default userSlice.reducer;
