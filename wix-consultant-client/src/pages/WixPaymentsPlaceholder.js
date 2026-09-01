import { Page, Layout, Card, Text, Banner } from "@shopify/polaris";

/**
 * TODO: Wix Payments integration will be added later.
 * Replaces former Stripe pricing / checkout flow.
 */
export default function WixPaymentsPlaceholder() {
  return (
    <Page title="App billing">
      <Layout>
        <Layout.Section>
          <Banner tone="info">
            <p>
              {/* TODO: Wix Payments integration will be added later */}
              Subscription and checkout will be handled through Wix Payments.
              External payment providers have been removed from this project.
            </p>
          </Banner>
          <Card>
            <Text as="p" variant="bodyMd">
              Your app installation is active. Billing enforcement will be
              connected when Wix Payments is integrated.
            </Text>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
