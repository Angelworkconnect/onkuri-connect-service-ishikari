/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AdminPanel from './pages/AdminPanel';
import Attendance from './pages/Attendance';
import AttendanceApproval from './pages/AttendanceApproval';
import AttendanceClose from './pages/AttendanceClose';
import BenefitManagement from './pages/BenefitManagement';
import Benefits from './pages/Benefits';
import Dashboard from './pages/Dashboard';
import DiceGame from './pages/DiceGame';
import Documents from './pages/Documents';
import Home from './pages/Home';
import Messages from './pages/Messages';
import MyApplications from './pages/MyApplications';
import NotificationSettings from './pages/NotificationSettings';
import Notifications from './pages/Notifications';
import PayrollExport from './pages/PayrollExport';
import Shifts from './pages/Shifts';
import StaffApproval from './pages/StaffApproval';
import StaffRegistration from './pages/StaffRegistration';
import TipsHistory from './pages/TipsHistory';
import TransportDashboard from './pages/TransportDashboard';
import VersionCheck from './pages/VersionCheck';
import TransportAdmin from './pages/TransportAdmin';
import TransportExport from './pages/TransportExport';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdminPanel": AdminPanel,
    "Attendance": Attendance,
    "AttendanceApproval": AttendanceApproval,
    "AttendanceClose": AttendanceClose,
    "BenefitManagement": BenefitManagement,
    "Benefits": Benefits,
    "Dashboard": Dashboard,
    "DiceGame": DiceGame,
    "Documents": Documents,
    "Home": Home,
    "Messages": Messages,
    "MyApplications": MyApplications,
    "NotificationSettings": NotificationSettings,
    "Notifications": Notifications,
    "PayrollExport": PayrollExport,
    "Shifts": Shifts,
    "StaffApproval": StaffApproval,
    "StaffRegistration": StaffRegistration,
    "TipsHistory": TipsHistory,
    "TransportDashboard": TransportDashboard,
    "VersionCheck": VersionCheck,
    "TransportAdmin": TransportAdmin,
    "TransportExport": TransportExport,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};