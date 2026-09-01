import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import axios from 'axios'
import { getWixAdminToken } from '../../../utils/getWixAdminToken'




export const fetchAdminDetails = createAsyncThunk("admin/fetchAdminDetails", async ({ adminIdLocal,token = ""  }) => {
    console.log("token-fetchAdminDetails", token)
    const response = await axios.get(`${process.env.REACT_APP_BACKEND_HOST}/api/admin/admin/${adminIdLocal}`, 
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    )  
    console.log("response", response)
    return response.data?.data
})

export const fetchActivityHistory = createAsyncThunk("admin/fetchActivityHistory", async ({ adminIdLocal, page, limit, type = 'all', app, searchQuery }) => {
    const token = await getWixAdminToken(app);
    const response = await axios.get(`${process.env.REACT_APP_BACKEND_HOST}/api/admin/activity/transactions/${adminIdLocal}`, {
        headers: {
            Authorization: `Bearer ${token}`
        },
        params: {
            page,
            limit,
            type,
            searchQuery
        }
    })
    console.log("fetchActivityHistory", response.data);
    return response.data
})

export const fetchWalletHistory = createAsyncThunk("admin/fetchWalletHistory", async ({ adminIdLocal, page = 1, limit = 10,  searchQuery ,token = ""}) => {
 
    const response = await axios.get(`${process.env.REACT_APP_BACKEND_HOST}/api/admin/user/consultant/${adminIdLocal}`, {
        headers: {
            Authorization: `Bearer ${token}`
        },
        params: {
            page,
            limit,
            search: searchQuery
        }
    })
    return response.data

})

export const fetchShopAllUsers = createAsyncThunk("admin/fetchShopAllUsers", async ({ adminIdLocal, token = "" }) => {
    const response = await axios.get(`${process.env.REACT_APP_BACKEND_HOST}/api/admin/shop/all-user/${adminIdLocal}`, {
        headers: {
            Authorization: `Bearer ${token}`   
        }
    })
    return response.data
})
export const fetchShopAllConsultants = createAsyncThunk("admin/fetchShopAllConsultants", async ({ adminIdLocal, token = "" }) => {
    console.log("adminIdLocal-fetchShopAllConsultants", adminIdLocal);
    const response = await axios.get(`${process.env.REACT_APP_BACKEND_HOST}/api/admin/shop/all-consultant/${adminIdLocal}`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    })
    console.log("response-fetchShopAllConsultants", response.data);
    return response.data
})

// ____________________----- manage app status --------____________________

export const manageAppStatus = createAsyncThunk("admin/manageAppStatus", async ({ adminIdLocal, status, token = "" }) => {
    console.log("adminIdLocal-manageAppStatus", adminIdLocal);
    console.log("status-manageAppStatus", status);
    const response = await axios.post(`${process.env.REACT_APP_BACKEND_HOST}/api/admin/app-enable-and-disable/${adminIdLocal}`, {
        appStatus: status
    }, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    })
    return response.data
})

//

export const deleteVoucher = createAsyncThunk("admin/deleteVoucher", async ({ adminIdLocal, voucherId, token = "" }) => {
    const response = await axios.delete(`${process.env.REACT_APP_BACKEND_HOST}/api/admin/voucher-delete/${adminIdLocal}/${voucherId}`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    })
    return response.data
})

export const fetchWithdrawalRequests = createAsyncThunk("admin/fetchWithdrawalRequests", async ({ adminIdLocal, page = 1, limit = 10, searchQuery, token = "" }) => {
    const response = await axios.get(`${process.env.REACT_APP_BACKEND_HOST}/api/admin/withdrawal-requests/${adminIdLocal}`, {
        headers: {
            Authorization: `Bearer ${token}`
        },
        params: {
            page,
            limit,
            search: searchQuery
        }
    })
    return response.data
})





const adminSlice = createSlice({
    name: "admin",
    initialState: {
        activityHistory: [],
        walletHistory: [],
        loading: false,
        error: null,
        shopAllUsers: [],
        shopAllConsultants: [],
        adminDetails_: [],
        appStatus: null,
        deletedVoucher: null,
        withdrawalRequests: [],
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchActivityHistory.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchActivityHistory.fulfilled, (state, action) => {
                state.loading = false;
                state.activityHistory = action.payload;
            })
            .addCase(fetchActivityHistory.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message;
            })
            .addCase(fetchWalletHistory.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchWalletHistory.fulfilled, (state, action) => {
                state.loading = false;
                state.walletHistory = action.payload;
            })
            .addCase(fetchWalletHistory.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message;
            })
            .addCase(fetchShopAllUsers.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchShopAllUsers.fulfilled, (state, action) => {
                state.loading = false;
                state.shopAllUsers = action.payload;
            })
            .addCase(fetchShopAllUsers.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message;
            })
            .addCase(fetchShopAllConsultants.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchShopAllConsultants.fulfilled, (state, action) => {
                state.loading = false;
                state.shopAllConsultants = action.payload;
            })
            .addCase(fetchShopAllConsultants.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message;
            })
            .addCase(fetchAdminDetails.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchAdminDetails.fulfilled, (state, action) => {
                state.loading = false;
                state.adminDetails_ = action.payload;
            })
            .addCase(fetchAdminDetails.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message;
            })
            .addCase(manageAppStatus.pending, (state) => {
                state.loading = true;
            })
            .addCase(manageAppStatus.fulfilled, (state, action) => {
                state.loading = false;
                state.appStatus = action.payload;
            })
            .addCase(manageAppStatus.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message;
            })
            .addCase(deleteVoucher.pending, (state) => {
                state.loading = true;
            })
            .addCase(deleteVoucher.fulfilled, (state, action) => {
                state.loading = false;
                state.deletedVoucher = action.payload;
            })
            .addCase(deleteVoucher.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message;
            })
            .addCase(fetchWithdrawalRequests.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchWithdrawalRequests.fulfilled, (state, action) => {
                state.loading = false;
                state.withdrawalRequests = action.payload;
            })
            .addCase(fetchWithdrawalRequests.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message;
            })
    }
});
export default adminSlice.reducer;