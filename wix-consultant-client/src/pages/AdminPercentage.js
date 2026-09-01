import {
    Card,
    TextField,
    Button,
    Form,
    FormLayout,
    Toast,
    Page,
    Layout,
    LegacyCard,
    ContextualSaveBar
} from "@shopify/polaris";
import { useState, useCallback, Fragment, useEffect } from "react";
import axios from "axios";
import { fetchAdminDetails } from "../components/Redux/slices/adminSlice";
import { useDispatch, useSelector } from "react-redux";
import { usePolarisToast } from "../components/AlertModel/PolariesTostContext";
import { getWixAdminToken } from '../utils/getWixAdminToken'
import { parseAdminPersenTage } from "../components/Helper/Helper";


function AdminPercentage({ currentPercentage }) {
    const dispatch = useDispatch();
    const { showToast } = usePolarisToast();
    const [adminIdLocal, setAdminIdLocal] = useState(null);
    const { adminDetails_, loading: adminDetailsLoading } = useSelector((state) => state.admin);
    const [percentage, setPercentage] = useState("");
    const [loading, setLoading] = useState(false);
    const [percentageError, setPercentageError] = useState(null);
    const [dirty, setDirty] = useState(false);


    useEffect(() => {
        const adminIdLocal = localStorage.getItem('wix_id');
        setAdminIdLocal(adminIdLocal);
    }, []);

    useEffect(() => {
        if (adminIdLocal) {
            dispatch(fetchAdminDetails({ adminIdLocal }));
        }
    }, [adminIdLocal]);

    const handleChange = useCallback((value) => {
        setPercentage(value);
    }, []);

    useEffect(() => {

    }, [adminDetails_]);


    useEffect(() => {
        const n = parseAdminPersenTage(adminDetails_?.adminPersenTage);
        if (n !== null) {
            setPercentage(String(n));
        }
    }, [adminDetails_?.adminPersenTage]);
    const handleSubmit = async () => {
        if (!percentage || percentage < 0 || percentage > 100) {
            setPercentageError("Please enter a valid percentage (0–100)");
            return;
        }
        try {
            setLoading(true);
            const token = await getWixAdminToken();
            const response = await axios.put(`${process.env.REACT_APP_BACKEND_HOST}/api/admin/admin/update-percentage/${adminIdLocal}`, {
                adminPercentage: Number(percentage),
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            if (response.data.success === true) {
                showToast(response.data.message);
            } else {
                showToast(response.data.message, true);
            }

        } catch (error) {
            showToast("Failed to update percentage", true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Fragment>
            {dirty && (
                <ContextualSaveBar
                    message="Unsaved changes"
                    saveAction={{
                        content: 'save',
                        onAction: handleSubmit,
                        loading: loading,
                    }}
                    discardAction={{
                        onAction: () => setDirty(false),
                    }}
                />
            )}


            <Page
                title=" Admin Percentage" > <Layout> <Layout.Section>
                    <LegacyCard title=" Admin Percentage" sectioned>
                        <Form onSubmit={handleSubmit}>
                            <FormLayout>
                                <TextField
                                    error={percentageError}
                                    label="Admin Percentage (%)"
                                    type="number"
                                    value={percentage}
                                    onChange={handleChange}
                                    min={0}
                                    max={100}
                                    autoComplete="off"
                                    helpText="Enter value between 0 and 100"
                                    onBlur={() => setDirty(true)}
                                />
                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <Button
                                        variant="primary"
                                        submit
                                        loading={loading}
                                        onClick={() => setDirty(true)}
                                    >
                                        save
                                    </Button>
                                </div>
                            </FormLayout>
                        </Form>
                    </LegacyCard>
                </Layout.Section> </Layout> </Page>

        </Fragment>
    );
}

export default AdminPercentage;
