import { Layout, Page, Text, Button, InlineStack, IndexTable, Tooltip } from "@shopify/polaris";
import { PlusIcon, EditIcon, DeleteIcon } from "@shopify/polaris-icons";
import { useEffect, useState, useCallback, useMemo, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import IndexTableList from "../components/consultant-list/IndexTableList";
import { fetchConsultants } from "../components/Redux/slices/ConsultantSlices";
import { useDispatch, useSelector } from "react-redux";
import { UserAlert } from "../components/AlertModel/UserAlert";
import { headings, itemStrings } from "../components/FallbackData/FallbackData";
import axios from "axios";
import { fetchAdminDetails, fetchShopAllConsultants } from "../components/Redux/slices/adminSlice";
import { usePolarisToast } from "../components/AlertModel/PolariesTostContext";
import { formatCurrency } from "../components/Helper/Helper";

const DEFAULT_AVATAR = "/images/flag/teamdefault.png";

function ConsultantList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState(0);
  const [queryValue, setQueryValue] = useState("");
  const [sortValue, setSortValue] = useState(["name asc"]);
  const [isUserAlertVisible, setIsUserAlertVisible] = useState(false);
  const [consultantId, setConsultantId] = useState(null);
  const [isRefreshed, setIsRefreshed] = useState(false);
  const [adminIdLocal, setAdminIdLocal] = useState(null);
  const { showToast } = usePolarisToast();

  const { shopAllConsultants, loading: shopAllConsultantsLoading, adminDetails_ } = useSelector(
    (state) => state.admin,
  );
  const token = localStorage.getItem("wix_access_token") || "";
  const currency = adminDetails_?.currency || "";

  useEffect(() => {
    setAdminIdLocal(localStorage.getItem("wix_id"));
  }, []);

  const goToAddConsultant = useCallback(() => {
    navigate(`/admin/consultant-list/add-consultant`);
  }, [navigate]);

  useEffect(() => {
    if (!adminIdLocal) return;
    dispatch(fetchShopAllConsultants({ adminIdLocal, token }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, isRefreshed, adminIdLocal]);

  useEffect(() => {
    if (adminIdLocal) dispatch(fetchAdminDetails({ adminIdLocal, token }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminIdLocal]);

  const consultantsData = useMemo(
    () => shopAllConsultants?.findConsultant || [],
    [shopAllConsultants],
  );

  const filteredConsultants = useMemo(() => {
    return consultantsData.filter((consultant) => {
      let matchesTab = true;
      if (selectedTab !== 0 && itemStrings[selectedTab]) {
        matchesTab = consultant.type?.toLowerCase() === itemStrings[selectedTab].toLowerCase();
      }
      let matchesQuery = true;
      if (queryValue.trim()) {
        const q = queryValue.toLowerCase();
        matchesQuery =
          consultant.fullname?.toLowerCase().includes(q) ||
          consultant.name?.toLowerCase().includes(q) ||
          consultant.email?.toLowerCase().includes(q) ||
          consultant.phone?.toLowerCase().includes(q) ||
          consultant.profession?.toLowerCase().includes(q);
      }
      return matchesTab && matchesQuery;
    });
  }, [consultantsData, selectedTab, queryValue]);

  const sortedConsultants = useMemo(() => {
    if (!filteredConsultants.length || !sortValue[0]) return filteredConsultants;
    const [field, direction] = sortValue[0].split(" ");
    return [...filteredConsultants].sort((a, b) => {
      let aValue = a[field];
      let bValue = b[field];
      if (field === "experience" || field === "conversionFees") {
        aValue = parseFloat(aValue) || 0;
        bValue = parseFloat(bValue) || 0;
      } else {
        aValue = String(aValue || "").toLowerCase();
        bValue = String(bValue || "").toLowerCase();
      }
      if (direction === "asc") return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
    });
  }, [filteredConsultants, sortValue]);

  const handleEdit = useCallback(
    (_id) => navigate(`/admin/consultant-list/add-consultant?id=${_id}`),
    [navigate],
  );

  const handleDeleteClick = useCallback((_id) => {
    setConsultantId(_id);
    setIsUserAlertVisible(true);
  }, []);

  const handleToggle = async (id) => {
    try {
      const response = await axios.put(
        `${process.env.REACT_APP_BACKEND_HOST}/api/api-consultant/api-consultant-update-status/${id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        },
      );
      if (response.status === 200) {
        showToast(response.data?.message);
        dispatch(fetchConsultants({ adminIdLocal, token }));
        setIsRefreshed((prev) => !prev);
      }
    } catch (err) {
      showToast("Could not update consultant status", true);
    }
  };

  const handleDelete = async () => {
    try {
      const response = await axios.delete(
        `${process.env.REACT_APP_BACKEND_HOST}/api/api-consultant/delete-consultant/${consultantId}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        },
      );
      if (response.status === 200) {
        setIsUserAlertVisible(false);
        setIsRefreshed((prev) => !prev);
      }
    } catch (error) {
      showToast("Could not delete consultant", true);
    }
  };

  const renderConsultantRow = useCallback(
    (consultant, index) => {
      const {
        _id,
        fullname,
        email,
        profession,
        chatPerMinute,
        consultantStatus,
        voicePerMinute,
        videoPerMinute,
        profileImage,
      } = consultant;
      const avatar = profileImage
        ? profileImage.replace(/\\/g, "/").replace(/^http:\/\//i, "https://")
        : DEFAULT_AVATAR;
      const rate = (v) => (v ? formatCurrency(currency, v) : "—");

      return (
        <IndexTable.Row id={_id} key={_id} position={index}>
          <IndexTable.Cell>
            <div className="saas-entity">
              <img
                src={avatar}
                alt=""
                className="saas-entity-avatar"
                onError={(e) => {
                  e.currentTarget.src = DEFAULT_AVATAR;
                }}
              />
              <div style={{ minWidth: 0 }}>
                <div className="saas-entity-name">{fullname || "—"}</div>
                {email && <div className="saas-entity-sub">{email}</div>}
              </div>
            </div>
          </IndexTable.Cell>
          <IndexTable.Cell>
            <Text as="span" variant="bodyMd">{profession || "—"}</Text>
          </IndexTable.Cell>
          <IndexTable.Cell>
            <Text as="span" variant="bodyMd" numeric>{rate(chatPerMinute)}</Text>
          </IndexTable.Cell>
          <IndexTable.Cell>
            <Text as="span" variant="bodyMd" numeric>{rate(voicePerMinute)}</Text>
          </IndexTable.Cell>
          <IndexTable.Cell>
            <Text as="span" variant="bodyMd" numeric>{rate(videoPerMinute)}</Text>
          </IndexTable.Cell>
          <IndexTable.Cell>
            <label className="saas-switch" onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={Boolean(consultantStatus)}
                onChange={() => handleToggle(_id)}
                aria-label={`${fullname || "Consultant"} is ${consultantStatus ? "active" : "inactive"}`}
              />
              <span className="saas-switch-track" aria-hidden="true" />
              <span>{consultantStatus ? "Active" : "Inactive"}</span>
            </label>
          </IndexTable.Cell>
          <IndexTable.Cell>
            <InlineStack align="end" gap="100" wrap={false}>
              <Tooltip content="Edit">
                <Button
                  variant="tertiary"
                  icon={EditIcon}
                  accessibilityLabel="Edit consultant"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(_id);
                  }}
                />
              </Tooltip>
              <Tooltip content="Delete">
                <Button
                  variant="tertiary"
                  icon={DeleteIcon}
                  tone="critical"
                  accessibilityLabel="Delete consultant"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClick(_id);
                  }}
                />
              </Tooltip>
            </InlineStack>
          </IndexTable.Cell>
        </IndexTable.Row>
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [handleEdit, handleDeleteClick, isRefreshed, currency],
  );

  return (
    <Fragment>
      <UserAlert
        isUserAlertVisible={isUserAlertVisible}
        setIsUserAlertVisible={setIsUserAlertVisible}
        handleDelete={handleDelete}
        consultantId={consultantId}
      />
      <Page
        title="Consultants"
        subtitle="Manage the consultants shown on your storefront and their per-minute rates."
        primaryAction={{ icon: PlusIcon, content: "Add consultant", onAction: goToAddConsultant }}
      >
        <Layout>
          <Layout.Section>
            <IndexTableList
              loading={shopAllConsultantsLoading}
              itemStrings={itemStrings}
              sortOptions={[]}
              data={sortedConsultants}
              headings={headings}
              renderRow={renderConsultantRow}
              resourceName={{ singular: "consultant", plural: "consultants" }}
              queryPlaceholder="Search by name, email or profession"
              onTabChange={setSelectedTab}
              onQueryChange={setQueryValue}
              onSortChange={setSortValue}
              emptyTitle="No consultants yet"
              emptyDescription="Consultants will appear here once they are created."
              emptyAction={{ content: "Add consultant", onAction: goToAddConsultant }}
            />
          </Layout.Section>
        </Layout>
      </Page>
    </Fragment>
  );
}

export default ConsultantList;
