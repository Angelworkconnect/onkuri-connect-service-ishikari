import AdminPanel from './pages/AdminPanel';
import Attendance from './pages/Attendance';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home';
import MyApplications from './pages/MyApplications';
import Shifts from './pages/Shifts';
import TipsHistory from './pages/TipsHistory';
import Benefits from './pages/Benefits';
import DiceGame from './pages/DiceGame';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdminPanel": AdminPanel,
    "Attendance": Attendance,
    "Dashboard": Dashboard,
    "Home": Home,
    "MyApplications": MyApplications,
    "Shifts": Shifts,
    "TipsHistory": TipsHistory,
    "Benefits": Benefits,
    "DiceGame": DiceGame,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};