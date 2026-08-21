import { Navigate, useLocation } from "react-router-dom";

/**
 * Legacy URL. Admin and producers now share /login; role is resolved after password.
 */
const AdminLoginPage = () => {
  const location = useLocation();
  return <Navigate to="/login" state={location.state} replace />;
};

export default AdminLoginPage;
