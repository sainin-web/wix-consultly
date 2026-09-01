import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";

// ─── Async Thunk ────────────────────────────────────────────────────────────

// Thunk Improvement
export const checkWixInstance = createAsyncThunk(
  "wixAuth/checkInstance",
  async (instance, { rejectWithValue }) => {
    console.log("instance >>>", instance);
    if (!instance) return rejectWithValue("No instance provided");

    try {
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_HOST}/api/admin/admin/check/billing/installection`,
        { params: { instance } },
      );

      const { success, billingActive, _id, token } = response.data;
      console.log("response.data", response.data);
      if (!success) return rejectWithValue("Verification failed");
      console.log("token", token);
      localStorage.setItem("wix_access_token", token);
      localStorage.setItem("wix_id", _id);
      if (instance) {
        localStorage.setItem("wix_instance", instance);
      }
      return { billingActive, token, _id };
    } catch (err) {
      const data = err?.response?.data;
      const message =
        (typeof data === "string" ? data : data?.message) || "API error";
      return rejectWithValue(message);
    }
  },
);

// ─── Slice ───────────────────────────────────────────────────────────────────

const wixAuthSlice = createSlice({
  name: "wixAuth",
  initialState: {
    loading: true, // true on boot — prevents flicker
    instance: null,
    isValid: false,
    billingActive: false,
    error: null,
  },
  reducers: {
    setInstance(state, action) {
      state.instance = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(checkWixInstance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(checkWixInstance.fulfilled, (state, action) => {
        state.loading = false;
        state.isValid = true;
        state.billingActive = action.payload.billingActive;
      })
      .addCase(checkWixInstance.rejected, (state, action) => {
        state.loading = false;
        state.isValid = false;
        state.billingActive = false;
        state.error = action.payload || "Unknown error";
      });
  },
});

export const { setInstance } = wixAuthSlice.actions;
export default wixAuthSlice.reducer;
