import React, { useEffect, useState } from 'react'
import UserTable from '../ClientDashbord/UserTable'
import axios from 'axios'
import { useDispatch, useSelector } from 'react-redux'
import { fetchVoucherData } from '../Redux/slices/UserSlices'
import { getConsultantId } from '../../utils/wixStorage'

const ConsultantWalletLogs = () => {
    const [walletLogs, setWalletLogs] = useState([])
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
            dispatch(fetchVoucherData(shopId, token, shop));
        }
    }, [shopId])
    const columns = [
        {
            label: "Name",
            key: "userId",
            render: row => row.userId?.fullname || "-"
        },
        {
            label: "Amount",
            key: "amount",
            render: row => `${voucherData?.shopCurrency}${row.amount?.toFixed(2) || "0.00"}`
        },
        {
            label: "Type",
            key: "transactionType"
        },
        {
            label: "Direction",
            key: "direction",
            render: row => (
                <span className={`badge ${row.direction === "credit" ? "bg-success" : "bg-danger"}`}>
                    {row.direction}
                </span>
            )
        },
        {
            label: "Status",
            key: "status",
            render: row => (
                <span className={`badge ${row.status === "success" ? "bg-success" : "bg-warning"}`}>
                    {row.status}
                </span>
            )
        },
        {
            label: "Date",
            key: "createdAt",
            render: row => new Date(row.createdAt).toLocaleString()
        }
    ];

    const getWalletLogs = async () => {
        try {
            const response = await axios.get(`${process.env.REACT_APP_BACKEND_HOST}/api/api-consultant/find-consultant/wallet/history/${userId}/${shopId}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
            if (response.status === 200) {
                setWalletLogs(response.data.data)
            }
        } catch (error) {
            if (error.response.status === 401) {
                localStorage.removeItem("token");
                localStorage.removeItem("shop");
                window.top.location.href = `${process.env.REACT_APP_FRONTEND_HOST}/login`;
            }
            console.error("Error fetching wallet logs:", error)
            setWalletLogs([])
        } finally {
            setLoading(false)
        }
    }
    useEffect(() => {
        if (userId && shopId) {
            getWalletLogs()
        }
    }, [userId, shopId])

    return (
        <div>
            <UserTable
                title="Wallet Management"
                columns={columns}
                data={walletLogs}
                loading={loading}
            />
        </div>
    )
}
export default ConsultantWalletLogs