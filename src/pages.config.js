import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Shifts from './pages/Shifts';
import Attendance from './pages/Attendance';
import MyApplications from './pages/MyApplications';


export const PAGES = {
    "Home": Home,
    "Dashboard": Dashboard,
    "Shifts": Shifts,
    "Attendance": Attendance,
    "MyApplications": MyApplications,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
};