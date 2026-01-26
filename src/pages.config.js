import AdminPanel from './pages/AdminPanel';
import Attendance from './pages/Attendance';
import Benefits from './pages/Benefits';
import Dashboard from './pages/Dashboard';
import DiceGame from './pages/DiceGame';
import Home from './pages/Home';
import MyApplications from './pages/MyApplications';
import Shifts from './pages/Shifts';
import TipsHistory from './pages/TipsHistory';
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
    "TipsHistory": TipsHistory,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};