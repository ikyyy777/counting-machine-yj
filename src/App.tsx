import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useEffect, useState } from "react";
import Home from "./pages/Home";
import FactoryManagement from "./pages/FactoryManagement";
import GraphPage from "./components/GraphPage/GraphPage";
import EmployeeMonitoring from "./pages/EmployeeMonitoring";
import EmployeeMonitoringVibration from "./pages/EmployeeMonitoringVibration";
import DefectMonitoring from "./pages/DefectMonitoring";
import History from "./pages/History";
import Summary from "./pages/Summary";
import DailyReportSewing from "./pages/DailyReportSewing";
import ProcessOutputHistory from "./pages/ProcessOutputHistory";
import StockWIP from "./pages/StockWIP";
import LineBalance from "./pages/LineBalance";
import Login from "./pages/Login";
import ActionPlan from "./pages/ActionPlan";
import {
  verifySessionWithServer,
  isTokenExpired,
  clearAllAuth,
} from "./services/api";
import StockWIPHistory from "./pages/StockWIPHistory";
import StockDataOperator from "./pages/StockDataOperator";
import SelectedPages from "./pages/SelectedPages";
import RecentActivity from "./pages/RecentActivity";
import LayoutAdjustment from "./pages/LayoutAdjustment";
import { GlobalPresence } from "./components/GlobalPresence";
import Analytics from "./pages/Analytics";
import IntegratedLineMonitoring from "./pages/IntegratedLineMonitoring";
import ComingSoon from "./pages/ComingSoon";
import StockDayGraph from "./pages/StockDayGraph";
import CBSewingOutput from "./pages/CBSewingOutput";
import { checkAndReloadIfStale } from "./utils/cacheBuster";

const RouteCacheWatcher = () => {
  const location = useLocation();

  useEffect(() => {
    void checkAndReloadIfStale(false);
  }, [location.pathname]);

  return null;
};

// Protected Route Component
const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    const checkAuth = async () => {
      if (isTokenExpired()) {
        clearAllAuth();
        if (active) {
          setIsAuthenticated(false);
          setIsLoading(false);
          navigate("/login", { state: { from: location }, replace: true });
        }
        return;
      }

      const valid = await verifySessionWithServer();
      if (!active) return;

      if (valid) {
        setIsAuthenticated(true);
      } else {
        clearAllAuth();
        setIsAuthenticated(false);
        navigate("/login", { state: { from: location }, replace: true });
      }
      setIsLoading(false);
    };
    void checkAuth();
    return () => {
      active = false;
    };
  }, [location, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" state={{ from: location }} replace />;
};

function App() {
  return (
    <Router basename="/">
      <RouteCacheWatcher />
      <GlobalPresence />
      <div className="App">
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Home />
              </PrivateRoute>
            }
          />
          <Route
            path="/employee-monitoring"
            element={
              <PrivateRoute>
                <EmployeeMonitoring />
              </PrivateRoute>
            }
          />
          <Route
            path="/defect-monitoring"
            element={
              <PrivateRoute>
                <DefectMonitoring />
              </PrivateRoute>
            }
          />
          <Route
            path="/history"
            element={
              <PrivateRoute>
                <History />
              </PrivateRoute>
            }
          />
          <Route
            path="/summary"
            element={
              <PrivateRoute>
                <Summary />
              </PrivateRoute>
            }
          />
          <Route
            path="/graph-page"
            element={
              <PrivateRoute>
                <GraphPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/daily-report-sewing"
            element={
              <PrivateRoute>
                <DailyReportSewing />
              </PrivateRoute>
            }
          />
          <Route
            path="/employee-monitoring-vibration"
            element={
              <PrivateRoute>
                <EmployeeMonitoringVibration />
              </PrivateRoute>
            }
          />
          <Route
            path="/factory-management"
            element={
              <PrivateRoute>
                <FactoryManagement />
              </PrivateRoute>
            }
          />

          <Route
            path="/process-output-history"
            element={
              <PrivateRoute>
                <ProcessOutputHistory />
              </PrivateRoute>
            }
          />
          <Route
            path="/process-output-history-page"
            element={
              <PrivateRoute>
                <ProcessOutputHistory />
              </PrivateRoute>
            }
          />

          <Route
            path="/line-balance"
            element={
              <PrivateRoute>
                <LineBalance />
              </PrivateRoute>
            }
          />

          <Route
            path="/action-plan"
            element={
              <PrivateRoute>
                <ActionPlan />
              </PrivateRoute>
            }
          />

          <Route
            path="/stock-wip"
            element={
              <PrivateRoute>
                <StockWIP />
              </PrivateRoute>
            }
          />

          <Route
            path="/stock-wip-history"
            element={
              <PrivateRoute>
                <StockWIPHistory />
              </PrivateRoute>
            }
          />

          <Route
            path="/stock-data-operator"
            element={
              <PrivateRoute>
                <StockDataOperator />
              </PrivateRoute>
            }
          />

          <Route
            path="/cb-sewing-output"
            element={
              <PrivateRoute>
                <CBSewingOutput />
              </PrivateRoute>
            }
          />

          <Route
            path="/integrated-line-monitoring"
            element={
              <PrivateRoute>
                <IntegratedLineMonitoring />
              </PrivateRoute>
            }
          />

          <Route
            path="/stock-day-graph"
            element={
              <PrivateRoute>
                <StockDayGraph />
              </PrivateRoute>
            }
          />

          <Route
            path="/selected-pages"
            element={
              <PrivateRoute>
                <SelectedPages />
              </PrivateRoute>
            }
          />

          <Route
            path="/recent-activity"
            element={
              <PrivateRoute>
                <RecentActivity />
              </PrivateRoute>
            }
          />

          <Route
            path="/analytics"
            element={
              <PrivateRoute>
                <Analytics />
              </PrivateRoute>
            }
          />

          <Route
            path="/coming-soon"
            element={
              <PrivateRoute>
                <ComingSoon />
              </PrivateRoute>
            }
          />


          {/* <Route
            path="/overline-layout"
            element={
              <PrivateRoute>
                <OverlineLayout />
              </PrivateRoute>
            } /> */}

          {/* Catch all route - redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
