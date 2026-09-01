import { Fragment, useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import HeaderNav from "./HeaderNav";

export default function LayoutFrame() {
  const [adminIdLocal, setAdminIdLocal] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const adminId = params.get("adminId");

    if (adminId) {
      localStorage.setItem("domain_V_id", adminId);
      setAdminIdLocal(adminId);
    }
  }, []);

  return (
    <Fragment>
      <HeaderNav />
      <Outlet context={{ adminIdLocal }} />
    </Fragment>
  );
}
