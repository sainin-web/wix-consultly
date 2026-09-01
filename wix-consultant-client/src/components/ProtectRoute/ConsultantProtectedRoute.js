import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

const ConsultantProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useSelector(
    (state) => state.authConsultant,
  );

  // Still verifying token — don't redirect yet
  if (loading) return null;

  // Not logged in → send to consultant login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ConsultantProtectedRoute;
