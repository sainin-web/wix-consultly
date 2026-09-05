import React, { Fragment, useCallback, useEffect, useState } from "react";
import IndexTableList from "../components/consultant-list/IndexTableList";
import { Page, Layout, IndexTable, Text, Badge } from "@shopify/polaris";
import { fetchActivityHistory, fetchAdminDetails } from "../components/Redux/slices/adminSlice";
import { useDispatch, useSelector } from "react-redux";
import { formatCurrency, getDuration, humanizeStatus, statusTone } from "../components/Helper/Helper";

const headings = [
  { title: "Client" },
  { title: "Consultant" },
  { title: "Type" },
  { title: "Date" },
  { title: "Duration" },
  { title: "Amount" },
  { title: "Status" },
];

const tabs = ["All", "Chat", "Voice Call", "Video Call"];

const TYPE_LABEL = { chat: "Chat", voice: "Audio", video: "Video" };

function UserTransHistory() {
  const { activityHistory, loading, adminDetails_ } = useSelector((state) => state.admin);
  const dispatch = useDispatch();
  const [adminIdLocal, setAdminIdLocal] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [type, setType] = useState(0);
  const limit = 10;
  const currency = adminDetails_?.currency || "";

  useEffect(() => {
    setAdminIdLocal(localStorage.getItem("wix_id"));
  }, []);

  useEffect(() => {
    if (adminIdLocal) dispatch(fetchAdminDetails({ adminIdLocal }));
  }, [dispatch, adminIdLocal]);

  useEffect(() => {
    if (adminIdLocal) {
      dispatch(fetchActivityHistory({ adminIdLocal, page, limit, type, searchQuery }));
    }
  }, [dispatch, adminIdLocal, page, limit, type, searchQuery]);

  const formatDateTime = (iso) =>
    iso
      ? new Date(iso).toLocaleString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—";

  const onHandleCancel = () => {
    setPage(1);
    setSearchQuery("");
    setType(0);
    return true;
  };

  const tableData =
    activityHistory?.data?.map((item) => ({
      id: item._id,
      type: item.type,
      when: formatDateTime(item.createdAt),
      duration: item.startTime && item.endTime ? `${getDuration(item.startTime, item.endTime)} min` : "—",
      user: item.senderId?.fullname || "—",
      consultant: item.receiverId?.fullname || "—",
      amount: item.amount,
      status: item.status,
    })) || [];

  const renderRow = useCallback(
    (row, index) => (
      <IndexTable.Row id={row.id} key={row.id} position={index}>
        <IndexTable.Cell>
          <Text as="span" variant="bodyMd" fontWeight="semibold">{row.user}</Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Text as="span" variant="bodyMd">{row.consultant}</Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Text as="span" variant="bodyMd">{TYPE_LABEL[row.type] || humanizeStatus(row.type)}</Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Text as="span" variant="bodyMd">{row.when}</Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Text as="span" variant="bodyMd" numeric>{row.duration}</Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Text as="span" numeric fontWeight="semibold">{formatCurrency(currency, row.amount)}</Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Badge tone={statusTone(row.status)}>{humanizeStatus(row.status)}</Badge>
        </IndexTable.Cell>
      </IndexTable.Row>
    ),
    [currency],
  );

  return (
    <Fragment>
      <Page title="History" subtitle="Every chat, audio and video consultation on your site.">
        <Layout>
          <Layout.Section>
            <IndexTableList
              itemStrings={tabs}
              sortOptions={[]}
              data={tableData}
              headings={headings}
              renderRow={renderRow}
              resourceName={{ singular: "consultation", plural: "consultations" }}
              queryPlaceholder="Search by client or consultant"
              onHandleCancel={onHandleCancel}
              onQueryChange={(value) => {
                setSearchQuery(value);
                setPage(1);
              }}
              page={page}
              setPage={setPage}
              setType={(value) => {
                setType(value);
                setPage(1);
              }}
              limit={limit}
              totalItems={activityHistory?.totalItems || activityHistory?.data?.length || 0}
              loading={loading}
              emptyTitle="No consultations yet"
              emptyDescription="Sessions will appear here once customers start consulting."
            />
          </Layout.Section>
        </Layout>
      </Page>
    </Fragment>
  );
}

export default UserTransHistory;
