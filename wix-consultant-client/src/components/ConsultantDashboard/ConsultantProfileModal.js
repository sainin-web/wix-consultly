import React, { useEffect, useState } from "react";
import { Modal, Button, Form, Row, Col } from "react-bootstrap";
import PortalModal from "../middle-ware/PortalModal";

/**
 * My profile — edits only the fields the update-profile API accepts
 * (name, email, phone, gender). Logout is NOT repeated here; it lives in the
 * navigation bar.
 */
const ConsultantProfileModal = ({
  show,
  handleClose,
  consultantOverview,
  profile,
  setProfile,
  updateProfileDeatailsHandler,
}) => {
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (consultantOverview) {
      const raw = consultantOverview?.consultant?.profileImage;
      setProfile({
        name: consultantOverview?.consultant?.fullname || "",
        email: consultantOverview?.consultant?.email || "",
        phone: consultantOverview?.consultant?.phone || "",
        gender: consultantOverview?.consultant?.gender || "",
        profileImage: raw
          ? raw.startsWith("http")
            ? raw.replace(/^http:\/\//i, "https://")
            : `${process.env.REACT_APP_BACKEND_HOST}/${raw.replace(/\\/g, "/")}`
          : null,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultantOverview]);

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  useEffect(() => {
    if (show) {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    } else {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    }
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, [show]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfileDeatailsHandler();
      handleClose();
    } finally {
      setSaving(false);
    }
  };

  if (!show) return null;

  return (
    <PortalModal>
      <Modal show={show} onHide={handleClose} centered>
        <Modal.Header closeButton>
          <Modal.Title as="h2" style={{ fontSize: 17, fontWeight: 650 }}>
            My profile
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <div className="d-flex align-items-center gap-3 mb-4">
            <img
              src={profile.profileImage || "/images/flag/teamdefault.png"}
              alt=""
              width="56"
              height="56"
              className="rounded-circle"
              style={{ objectFit: "cover", border: "1px solid #e6e8ec" }}
              onError={(e) => {
                e.currentTarget.src = "/images/flag/teamdefault.png";
              }}
            />
            <div>
              <div style={{ fontWeight: 600 }}>{profile.name || "Consultant"}</div>
              <div style={{ fontSize: 12.5, color: "#666b78" }}>{profile.email}</div>
            </div>
          </div>

          <Form>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Name</Form.Label>
                  <Form.Control type="text" name="name" value={profile.name} onChange={handleChange} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control type="email" name="email" value={profile.email} onChange={handleChange} />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-1">
                  <Form.Label>Phone</Form.Label>
                  <Form.Control type="text" name="phone" value={profile.phone} onChange={handleChange} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-1">
                  <Form.Label>Gender</Form.Label>
                  <Form.Select name="gender" value={profile.gender} onChange={handleChange}>
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          </Form>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="light" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="dark" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </Modal.Footer>
      </Modal>
    </PortalModal>
  );
};

export default ConsultantProfileModal;
