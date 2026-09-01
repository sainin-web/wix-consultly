// import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
// import axios from "axios";

// // API call using createAsyncThunk
// export const fetch = createAsyncThunk("users/fetch", async () => {
//     const response = await axios.get(`${process.env.REACT_APP_BACKEND_HOST}/api/users/user-details`);
//     return response.data;
// });

// const userSlice = createSlice({
//     name: "users",
//     initialState: {
//         users: [],
//         loading: false,
//         error: null,
//     },

//     extraReducers: (builder) => {
//         builder
//             .addCase(fetchUsers.pending, (state) => {
//                 state.loading = true;
//             })
//             .addCase(fetchUsers.fulfilled, (state, action) => {
//                 state.loading = false;
//                 state.users = action.payload;
//             })
//             .addCase(fetchUsers.rejected, (state, action) => {
//                 state.loading = false;
//                 state.error = action.error.message;
//             });
//     },
// });

// export default userSlice.reducer;
