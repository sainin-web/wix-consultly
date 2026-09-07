import React, { Fragment, useState, useCallback, useEffect } from "react";
import { Page, Layout, IndexTable, Text, Button, InlineStack, Tooltip, Badge } from "@shopify/polaris";
import IndexTableList from "../components/consultant-list/IndexTableList";
import { DeleteIcon, EditIcon, PlusIcon } from "@shopify/polaris-icons";
import { useDispatch, useSelector } from "react-redux";
import { fetchAdminDetails } from "../components/Redux/slices/adminSlice";
import { VoucherDeleteAlert } from "../components/AlertModel/VoucherDeleteAlert";
import axios from "axios";
import { getWixAdminToken } from "../utils/getWixAdminToken";
import { useNavigate } from "react-router-dom";
import { formatCurrency } from "../components/Helper/Helper";

const headings = [
  { title: "Voucher" },
  { title: "Credits" },
  { title: "Bonus credits" },
  { title: "Customer receives" },
  { title: "Status" },
  { title: "", alignment: "end" },
];

function VoucherTable() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [adminIdLocal, setAdminIdLocal] = useState(null);
  const [appToken, setAppToken] = useState(null);
  const [isUserAlertVisible, setIsUserAlertVisible] = useState(false);
  const [voucherId, setVoucherId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reLoadApi, setReLoadApi] = useState(false);
  const { adminDetails_, loading: adminDetailsLoading } = useSelector((state) => state.admin);
  const currency = adminDetails_?.currency || "";

  useEffect(() => {
    setAdminIdLocal(localStorage.getItem("wix_id"));
    setAppToken(localStorage.getItem("appToken"));
  }, []);

  useEffect(() => {
    if (adminIdLocal) dispatch(fetchAdminDetails({ adminIdLocal, appToken }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, adminIdLocal, reLoadApi]);

  useEffect(() => {
    if (Array.isArray(adminDetails_?.vouchers)) {
      const mapped = adminDetails_.vouchers.map((voucher, index) => ({
        id: voucher._id || voucher.id || index + 1,
        voucherCode: voucher.voucherCode || `VCH${String(index + 1).padStart(3, "0")}`,
        totalCoin: voucher.totalCoin?.$numberDecimal
          ? parseFloat(voucher.totalCoin.$numberDecimal)
          : Number(voucher.totalCoin) || 0,
        extraCoin: voucher.extraCoin?.$numberDecimal
          ? parseFloat(voucher.extraCoin.$numberDecimal)
          : Number(voucher.extraCoin) || 0,
        active: voucher.active !== false,
        status: voucher.active === false ? "Inactive" : "Active",
      }));
      setData(mapped);
      setTotalItems(mapped.length);
    }
  }, [adminDetails_]);

  const handleOpenDeleteModal = (id) => {
    setVoucherId(id);
    setIsUserAlertVisible(true);
  };

  const handleConfirmDelete = async (id) => {
    const token = await getWixAdminToken();
    setLoading(true);
    try {
      const response = await axios.delete(
        `${process.env.REACT_APP_BACKEND_HOST}/api/admin/delete/voucher/${adminIdLocal}/${id}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (response.status === 200) {
        setReLoadApi((prev) => !prev);
        setIsUserAlertVisible(false);
        setVoucherId(null);
      }
    } catch (error) {
      console.error("Error deleting voucher:", error);
    } finally {
      setLoading(false);
    }
  };

  // Deactivated packs stay in the table but are hidden from customers and
  // refused at purchase time (server-side check).
  const toggleActive = async (voucher) => {
    const token = await getWixAdminToken();
    setLoading(true);
    try {
      await axios.put(
        `${process.env.REACT_APP_BACKEND_HOST}/api/admin/admin/voucher-updates/${adminIdLocal}/${voucher.id}`,
        { active: !voucher.active },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setReLoadApi((prev) => !prev);
    } catch (error) {
      console.error("Error updating voucher status:", error);
    } finally {
      setLoading(false);
    }
  };

  const goToAddVoucher = () => navigate(`/admin/voucher-management/voucher`);

  // Edit reuses the existing settings route, which already reads
  // id / totalCoin / extraCoin from the query string.
  const goToEditVoucher = (voucher) =>
    navigate(
      `/admin/voucher-management/voucher?id=${voucher.id}&totalCoin=${voucher.totalCoin}&extraCoin=${voucher.extraCoin}`,
    );

  const renderVoucherRow = useCallback(
    (voucher, index) => {
      const { id, voucherCode, totalCoin, extraCoin, status, active } = voucher;
      return (
        <IndexTable.Row id={id} key={id || index} position={index}>
          <IndexTable.Cell>
            <Text as="span" variant="bodyMd" fontWeight="semibold">{voucherCode}</Text>
          </IndexTable.Cell>
          <IndexTable.Cell>
            <Text as="span" numeric>{formatCurrency(currency, totalCoin)}</Text>
          </IndexTable.Cell>
          <IndexTable.Cell>
            <Text as="span" numeric>{extraCoin ? formatCurrency(currency, extraCoin) : "—"}</Text>
          </IndexTable.Cell>
          <IndexTable.Cell>
            <Text as="span" numeric fontWeight="semibold">
              {formatCurrency(currency, totalCoin + extraCoin)}
            </Text>
          </IndexTable.Cell>
          <IndexTable.Cell>
            <Badge tone={active ? "success" : "attention"}>{status}</Badge>
          </IndexTable.Cell>
          <IndexTable.Cell>
            <InlineStack align="end" gap="100" wrap={false}>
              <Button size="slim" onClick={(e) => { e.stopPropagation(); toggleActive(voucher); }} disabled={loading}>
                {active ? "Deactivate" : "Activate"}
              </Button>
              <Tooltip content="Edit">
                <Button
                  variant="tertiary"
                  icon={EditIcon}
                  accessibilityLabel="Edit voucher"
                  onClick={(e) => {
                    e.stopPropagation();
                    goToEditVoucher(voucher);
                  }}
                />
              </Tooltip>
              <Tooltip content="Delete">
                <Button
                  variant="tertiary"
                  icon={DeleteIcon}
                  tone="critical"
                  accessibilityLabel="Delete voucher"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenDeleteModal(id);
                  }}
                />
              </Tooltip>
            </InlineStack>
          </IndexTable.Cell>
        </IndexTable.Row>
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currency],
  );

  return (
    <Fragment>
      <VoucherDeleteAlert
        isUserAlertVisible={isUserAlertVisible}
        setIsUserAlertVisible={setIsUserAlertVisible}
        handleDelete={handleConfirmDelete}
        voucherId={voucherId}
        adminIdLocal={adminIdLocal}
        loading={loading}
      />
      <Page
        title="Voucher Management"
        subtitle="Credit packs customers can buy to top up their wallet."
        primaryAction={{ icon: PlusIcon, content: "Create voucher", onAction: goToAddVoucher }}
      >
        <Layout>
          <Layout.Section>
            <IndexTableList
              data={data}
              headings={headings}
              renderRow={renderVoucherRow}
              resourceName={{ singular: "voucher", plural: "vouchers" }}
              page={page}
              setPage={setPage}
              limit={limit}
              totalItems={totalItems}
              loading={adminDetailsLoading && data.length === 0}
              emptyTitle="No vouchers yet"
              emptyDescription="Create a credit pack so customers can add funds to their wallet."
              emptyAction={{ content: "Create voucher", onAction: goToAddVoucher }}
            />
          </Layout.Section>
        </Layout>
      </Page>
    </Fragment>
  );
}

export default VoucherTable;
