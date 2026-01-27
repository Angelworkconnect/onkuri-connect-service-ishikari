import Attendance from './pages/Attendance';
import Benefits from './pages/Benefits';
import Dashboard from './pages/Dashboard';
import DiceGame from './pages/DiceGame';
import MyApplications from './pages/MyApplications';
import Shifts from './pages/Shifts';
import TipsHistory from './pages/TipsHistory';
import Home from './pages/Home';
import AdminPanel from './pages/AdminPanel';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Attendance": Attendance,
    "Benefits": Benefits,
    "Dashboard": Dashboard,
    "DiceGame": DiceGame,
    "MyApplications": MyApplications,
    "Shifts": Shifts,
    "TipsHistory": TipsHistory,
    "Home": Home,
    "AdminPanel": AdminPanel,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};