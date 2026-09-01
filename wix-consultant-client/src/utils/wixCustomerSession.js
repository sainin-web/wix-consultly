import axios from "axios";
import { persistCustomerId } from "./wixStorage";

/** Create/update Wix member in Mongo and return dbId. */
export async function ensureWixCustomerSession({
  wixMemberId,
  email,
  firstName = "",
  lastName = "",
  photo = "",
  instanceId = "",
}) {
  if (!wixMemberId) return null;
  const { data } = await axios.post(
    `${process.env.REACT_APP_BACKEND_HOST}/api/wix-user-session`,
    {
      wixMemberId,
      email,
      firstName,
      lastName,
      photo,
      instanceId,
    }
  );
  return data;
}

/** Persist customer id everywhere the app + socket expect it. */
export function persistWixCustomerIds(dbId, extras = {}) {
  persistCustomerId(dbId, extras);
}
