import React, { useState, useEffect, Fragment } from "react";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { fetchConsultantById } from "../Redux/slices/ConsultantSlices";
import { formatAmountHelper } from "../Helper/Helper";
import { ToastModel } from "../AlertModel/Tost";
import ReactToast from "../AlertModel/ReactToast";
import { fetchVoucherData } from '../Redux/slices/UserSlices'
import { getConsultantId, getShopId } from "../../utils/wixStorage";
const WithdrawalRequestForm = () => {
    const dispatch = useDispatch();
    const [amount, setAmount] = useState("");
    const [note, setNote] = useState("");
    const [loading, setLoading] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const consultantId = getConsultantId();
    const shopId = getShopId();
    const { consultantOverview } = useSelector((state) => state.consultants);
    const { voucherData } = useSelector((state) => state.users);
    const token = localStorage.getItem("token");
    const shop = localStorage.getItem("shop");
    useEffect(() => {
        if (shopId && consultantId) {
            dispatch(fetchConsultantById({ shop_id: shopId, consultant_id: consultantId }));
        }
    }, [shopId, consultantId, showToast]);
    useEffect(() => {
        if (shopId) {
            dispatch(fetchVoucherData(shopId, token, shop));
        }
    }, [shopId])
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!amount || amount <= 0) {
            return alert("Please enter valid amount");
        }
        try {
            setLoading(true);
            const res = await axios.post(
                `${process.env.REACT_APP_BACKEND_HOST}/api-consultant/submit/withdrawal/request/${consultantId}/${shopId}`,
                {
                    amount,
                    note,
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            console.log("res", res);
            if (res.status === 201) {
                setShowToast(true);
                setAmount("");
                setNote("");
            } else {
                alert("Something went wrong");
            }

        } catch (error) {
            if (error.response.status === 401) {
                localStorage.removeItem("token");
                localStorage.removeItem("shop");
                window.top.location.href = `https://${shop}/apps/consultant-theme/login`;
            }
            console.error(error);
            alert(error?.response?.data?.message || "Failed to submit");

        } finally {
            setLoading(false);
        }
    };


    return (
        <Fragment>
            <ReactToast show={showToast} message="Withdrawal request submitted successfully" onClose={() => { setShowToast(false) }} duration={3000} />
            <div className="row">
                <div className="col-xl-8 col-lg-10 col-md-12 m-auto">
                    <div className="card mb-3 shadow-sm">
                        <div className="card-body text-center">
                            <h6 className="text-muted">Available Balance</h6>
                            <h3 className="fw-bold text-success " style={{ fontSize: "24px" }}>{voucherData?.shopCurrency} {formatAmountHelper(consultantOverview?.consultant?.walletBalance || 0)}</h3>
                        </div>
                    </div>

                    <div className="card shadow-sm">
                        <div className="card-body">

                            <h5 className="mb-3">Withdrawal Request</h5>

                            <form onSubmit={handleSubmit}>

                                <div className="mb-3">
                                    <label className="form-label">Amount</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        placeholder="Enter withdrawal amount"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                    />
                                </div>

                                <div className="mb-3">
                                    <label className="form-label">Note</label>
                                    <textarea
                                        className="form-control"
                                        rows="3"
                                        placeholder="Optional message"
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="btn btn-primary w-100"
                                    disabled={loading}
                                >
                                    {loading ? "Submitting..." : "Request Withdrawal"}
                                </button>

                            </form>

                        </div>
                    </div>
                </div>
            </div>
        </Fragment>
    );
};

export default WithdrawalRequestForm;
