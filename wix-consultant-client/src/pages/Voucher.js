import React, { useEffect, useState } from "react";
import styles from "./Voucher.module.css";
import {
  fetchUserDetailsByIds,
  fetchVoucherData,
} from "../components/Redux/slices/UserSlices";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import { useWixUser } from "../useContext/WixUserContext";

function Voucher() {
  const dispatch = useDispatch();
  const [shopId, setShopId] = useState(null);
  const { user } = useWixUser();
  const { userDetails } = useSelector((state) => state.users);
  const { voucherData, loading } = useSelector((state) => state.users);
  const walletBalance = userDetails?.data?.walletBalance;
  const userId = user.wixDbId;
  useEffect(() => {
    const shopId = localStorage.getItem("wix_id");
    if (shopId) {
      setShopId(shopId);
    }
  }, []);
  console.log("voucherData", voucherData);
  useEffect(() => {
    dispatch(fetchUserDetailsByIds(userId));
  }, [userId]);

  useEffect(() => {
    if (shopId) {
      dispatch(fetchVoucherData(shopId));
    }
  }, [shopId, userId]);

  const buyVoucher = async (voucher, voucherAdminId) => {
    try {
   
      const response = await axios.post(`${process.env.REACT_APP_BACKEND_HOST}/api/buy-voucher/${voucherAdminId}`, {
        wixProductId: voucher?.wixProductId,
      });
      if (response.status === 200) {
        console.log("response", response.data);
        window.open(response.data?.data?.productPageUrl, "_blank");
      } else {
        console.log("error", response.data);
      }
    } catch (error) {
      console.log("error", error);
    }
  };

  return (
    <div className={styles.voucherPage}>
      <h1 className={styles.title}>Add Money to Wallet</h1>

      <div className={styles.balanceSection}>
        <span className={styles.balanceValue}>
          Available Balance : {voucherData?.shopCurrency}
          {voucherData?.walletBalance?.toFixed(2) || "0.0"}
        </span>
      </div>

      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Popular Recharge</h2>
      </div>

      <div className={styles.cardGrid}>
        {voucherData?.vouchers?.map((option) => {
          const voucherAdminId = voucherData?.id;
          return (
            <button
              key={option._id}
              type="button"
              className={styles.rechargeCard}
              onClick={() => buyVoucher(option, voucherAdminId)}
            >
              {option.extraCoin ? (
                <span className={styles.badge}>Extra {option.extraCoin}</span>
              ) : null}

              <div className={styles.amount}>
                {voucherData?.shopCurrency}
                {Number(option.totalCoin) || 0}
              </div>
              <div className={styles.extra}>
                Total : {voucherData?.shopCurrency}
                {(Number(option.totalCoin) || 0) +
                  (Number(option.extraCoin) || 0)}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default Voucher;
