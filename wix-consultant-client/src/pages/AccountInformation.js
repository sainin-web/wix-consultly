import {
  Card,
  Text,
  Box,
  InlineStack,
  BlockStack,
  Page,
} from "@shopify/polaris";
import { Redirect } from "@shopify/app-bridge/actions";
import { useMemo, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchAdminDetails } from "../components/Redux/slices/adminSlice";

export default function AccountInformation() {
  const dispatch = useDispatch();
  const [adminIdLocal, setAdminIdLocal] = useState(null);
  const { adminDetails_, loading: adminDetailsLoading } = useSelector(
    (state) => state.admin,
  );
  const appToken = localStorage.getItem("appToken");

  useEffect(() => {
    const id = localStorage.getItem("wix_id");
    setAdminIdLocal(id);
  }, []);
  console.log("adminIdLocal", adminIdLocal);

  useEffect(() => {
    if (adminIdLocal) {
      dispatch(fetchAdminDetails({ adminIdLocal, appToken }));
    }
  }, [adminIdLocal]);
  console.log("adminDetailsLoading", adminIdLocal);
  console.log("adminDetails_", adminDetails_);

  return (
    <Page
      title="Account Information"
    >
      <Card>
        <Box>
          <BlockStack gap="300">
            <InlineStack align="space-between">
              <Text>Plan Name</Text>
              <Text fontWeight="bold">
                {adminDetails_.accountPlanInfo?.[0]?.planName}
              </Text>
            </InlineStack>

            <InlineStack align="space-between">
              <Text>Plan Type</Text>
              <Text fontWeight="bold" style={{ textTransform: "lowercase" }}>
                {adminDetails_.accountPlanInfo?.[0]?.planType}
              </Text>
            </InlineStack>

            <InlineStack align="space-between">
              <Text>Plan Amount</Text>
              <Text fontWeight="bold">
                {adminDetails_.accountPlanInfo?.[0]?.planAmount} 
                 {adminDetails_.accountPlanInfo?.[0]?.currency}
              </Text>
            </InlineStack>
          </BlockStack>
        </Box>
      </Card>
    </Page>
  );
}
