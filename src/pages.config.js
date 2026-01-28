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
import Benefits from './pages/Benefits';
import Dashboard from './pages/Dashboard';
import DiceGame from './pages/DiceGame';
import Home from './pages/Home';
import MyApplications from './pages/MyApplications';
import Shifts from './pages/Shifts';
import StaffRegistration from './pages/StaffRegistration';
import TipsHistory from './pages/TipsHistory';
import AttendanceApproval from './pages/AttendanceApproval';
import AttendanceClose from './pages/AttendanceClose';
import PayrollExport from './pages/PayrollExport';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdminPanel": AdminPanel,
    "Attendance": Attendance,
    "Benefits": Benefits,
    "Dashboard": Dashboard,
    "DiceGame": DiceGame,
    "Home": Home,
    "MyApplications": MyApplications,
    "Shifts": Shifts,
    "StaffRegistration": StaffRegistration,
    "TipsHistory": TipsHistory,
    "AttendanceApproval": AttendanceApproval,
    "AttendanceClose": AttendanceClose,
    "PayrollExport": PayrollExport,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};