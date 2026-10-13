import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import EmployeeList from './pages/EmployeeList';
import EmployeeForm from './pages/EmployeeForm';
import FormList from './pages/FormList';
import FormDetail from './pages/FormDetail';
import NewForm from './pages/NewForm';
import CompanyList from './pages/CompanyList';
import './App.css';

function Nav() {
  return (
    <nav className="nav">
      <div className="nav-brand">מערכת טופס 161</div>
      <div className="nav-links">
        <Link to="/">לוח בקרה</Link>
        <Link to="/employees">עובדים</Link>
        <Link to="/forms">טפסים</Link>
        <Link to="/companies">חברות</Link>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app" dir="rtl">
        <Nav />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/employees" element={<EmployeeList />} />
            <Route path="/employees/new" element={<EmployeeForm />} />
            <Route path="/employees/:id" element={<EmployeeForm />} />
            <Route path="/forms" element={<FormList />} />
            <Route path="/forms/new" element={<NewForm />} />
            <Route path="/forms/:id" element={<FormDetail />} />
            <Route path="/companies" element={<CompanyList />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
