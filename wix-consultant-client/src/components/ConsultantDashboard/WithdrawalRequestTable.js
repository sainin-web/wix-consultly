import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import UserTable from '../ClientDashbord/UserTable'
import axios from 'axios'
import { useDispatch, useSelector } from 'react-redux'
import { fetchVoucherData } from '../Redux/slices/UserSlices'
import { getConsultantId } from '../../utils/wixStorage'
const WithdrawalRequestTable = () => {
    const navigate = useNavigate()
    const [withdrawalRequest, setWithdrawalRequest] = useState([])
    const [loading, setLoading] = useState(false)
    const [userId, setUserId] = useState(null)
    const [shopId, setShopId] = useState(null)
    const dispatch = useDispatch();
    const { voucherData } = useSelector((state) => state.users);
    const token = localStorage.getItem("token");
    const shop = localStorage.getItem("shop");
    useEffect(() => {
        const userId = getConsultantId()
        setUserId(userId)
        const shopId = localStorage.getItem('wix_id')
        setShopId(shopId)
    }, [])
    useEffect(() => {
        if (shopId) {
            dispatch(fetchVoucherData(shopId));
        }
    }, [shopId])
    console.log("withdrawalRequest", withdrawalRequest)
    const columns = [

        {
            label: "Name",
            key: "userId",
            render: row => row.consultantId?.fullname || "-"
        },
        {
            label: "Amount",
            key: "amount",
            render: row => `${voucherData?.shopCurrency}${row.amount.toFixed(2)}`
        },
        {
            label: "Status",
            key: "status",
            render: row => (
                <span className={`badge ${row.status === "paid" ? "bg-success" : "bg-warning"}`}>
                    {row.status}
                </span>
            )
        },
        {
            label: "Description",
            key: "description",
            render: row => row.note || "-"
        },

        {
            label: "Date",
            key: "createdAt",
            render: row => new Date(row.createdAt).toLocaleString()
        }
    ];

    const getWithdrawalRequest = async () => {
        try {
            const response = await axios.get(`${process.env.REACT_APP_BACKEND_HOST}/api/api-consultant/find/consultant/withdrawal/request/${userId}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
            if (response.status === 200) {
                setWithdrawalRequest(response.data.data)
            }
        } catch (error) {
            if (error.response.status === 401) {
                localStorage.removeItem("token");
                localStorage.removeItem("shop");
                window.top.location.href = `${process.env.REACT_APP_FRONTEND_HOST}/login`;
            }
            console.error("Error fetching withdrawal request:", error)
            setWithdrawalRequest([])
        } finally {
            setLoading(false)
        }
    }
    useEffect(() => {
        if (userId && shopId) {
            getWithdrawalRequest()
        }
    }, [userId, shopId])

    return (
        <div>
            <div className='d-flex justify-content-end mb-4'>
                <button className='btn btn-primary' style={{ fontSize: '12px', backgroundColor: 'black', color: 'white', border: 'none', borderRadius: '5px', padding: '5px 10px' }} onClick={() => navigate('/consultant-dashboard/withdrawal-request')}>Get Withdrawal Request</button>
            </div>
            <UserTable
                title="Withdrawal Request"
                columns={columns}
                data={withdrawalRequest}
                loading={loading}
            />
        </div>
    )
}
export default WithdrawalRequestTable