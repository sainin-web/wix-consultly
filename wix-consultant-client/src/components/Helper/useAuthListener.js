import { useEffect } from "react";
import axios from "axios";
import {
  clearCustomerSession,
  persistCustomerId,
} from "../../utils/wixStorage";

const useAuthListener = () => {
  useEffect(() => {
    
    const handler = async (event) => {
      const token = event?.data?.token;
      if (!token) return;
      try {
        const res = await axios.post(
          `${process.env.REACT_APP_BACKEND_HOST}/api/bigcommerce-user`,
          { token },
        );

        if (res.status === 200) {
          persistCustomerId(res.data.user._id);
        }
      } catch (error) {
        clearCustomerSession();
      }
    };

    window.addEventListener("message", handler);

    return () => window.removeEventListener("message", handler);
  }, []);
};

export default useAuthListener;
