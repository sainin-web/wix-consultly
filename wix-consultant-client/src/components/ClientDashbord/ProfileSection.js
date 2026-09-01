import React, { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import styles from "../../components/ClientDashbord/ProfileSection.module.css";
import { useDispatch, useSelector } from "react-redux";
import { fetchUserDetailsByIds } from "../Redux/slices/UserSlices";
import { FormLayout, TextField } from "@shopify/polaris";
import { useWixUser } from "../../useContext/WixUserContext";

const ProfileSection = () => {
  const { user, loading } = useWixUser();

  const [shopId, setShopId] = useState(null);
  const [voucherData, setVoucherData] = useState(null);
  const params = new URLSearchParams(window.location.search);
  const shop = params.get("shop");
  const dispatch = useDispatch();
  const { userDetails } = useSelector((state) => state.users);
  const walletBalance = userDetails?.data?.walletBalance;

  const userId = user.wixDbId
  useEffect(() => {

    const shopId = localStorage.getItem("wix_id");
    if (shopId) {
      // setUserId(adminId);
      setShopId(shopId);
    }
  }, []);
  useEffect(() => {
    dispatch(fetchUserDetailsByIds(userId));
  }, [userId]);


  return (
    <div className={styles.profileSection}>
      {/* Left side: user image / basic info */}
      <div className={styles.profileSectionHeader}>
        <h1 className={styles.profileTitle}>Profile Settings</h1>
        <div className={styles.profileImageContainer}>
          <div className={styles.profileImage}>
            <img
              className="h-100 w-100 object-fit-cover"
              src={
                "https://cdn.vectorstock.com/i/250p/12/86/simple-user-icon-profile-avatar-vector-56321286.avif"
              }
              alt="profile"
            />
          </div>
        </div>
        <div className={styles.profileName}>
          <FormLayout>
            <TextField
              label="Full Name"
              type="text"
              value={userDetails?.data?.fullname}
              autoComplete="off"
            />
            <TextField
              label="Email"
              type="text"
              value={userDetails?.data?.email}
              autoComplete="off"
            />
          </FormLayout>
        </div>
      </div>
      <div className={styles.profileRight}>
        <div className={styles.profileNav}>
          <NavLink
            to="/profile/voucher"
            className={({ isActive }) =>
              isActive
                ? `${styles.profileNavButton} ${styles.profileNavButtonActive}`
                : styles.profileNavButton
            }
          >
            Voucher
          </NavLink>
          <NavLink
            to="/profile/history"
            className={({ isActive }) =>
              isActive
                ? `${styles.profileNavButton} ${styles.profileNavButtonActive}`
                : styles.profileNavButton
            }
          >
            History
          </NavLink>
          <NavLink
            to="/profile/call-chat-logs"
            className={({ isActive }) =>
              isActive
                ? `${styles.profileNavButton} ${styles.profileNavButtonActive}`
                : styles.profileNavButton
            }
          >
            Call & Chat Logs
          </NavLink>
        </div>

        <div className={styles.profileContent}>
          {/* Nested routes for Voucher / History will render here */}
          <Outlet context={{ shop, userId, walletBalance, voucherData }} />
        </div>
      </div>
    </div>
  );
};

export default ProfileSection;
