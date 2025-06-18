import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, FolderOpen, Ticket, LogOut, Users, User, UserCheck, FolderKanban, Monitor, Bell, ChevronLeft, ChevronRight } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth, db } from '../../firebase/config';
import { collection, query, getDocs, where } from 'firebase/firestore';
import Projects from './Projects';
import AdminTickets from './AdminTickets';
 
function Admin() {
  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [stats, setStats] = useState({
    totalClients: 0,
    totalEmployees: 0,
    clientHeads: 0,
    projectManagers: 0,
    totalProjects: 0,
    totalTickets: 0
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showLogoutDropdown, setShowLogoutDropdown] = useState(false);
  const dropdownRef = useRef(null); // Ref for the dropdown container
 
  useEffect(() => {
    fetchStats();
 
    // Handle clicks outside the dropdown
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowLogoutDropdown(false);
      }
    };
 
    if (showLogoutDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
 
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showLogoutDropdown]); // Re-run effect when dropdown visibility changes
 
  const fetchStats = async () => {
    try {
      // Fetch total clients
      const clientsQuery = query(collection(db, 'users'), where('role', '==', 'client'));
      const clientsSnapshot = await getDocs(clientsQuery);
     
      // Fetch total employees
      const employeesQuery = query(collection(db, 'users'), where('role', '==', 'employee'));
      const employeesSnapshot = await getDocs(employeesQuery);
     
      // Fetch client heads
      const clientHeadsQuery = query(collection(db, 'users'), where('role', '==', 'client_head'));
      const clientHeadsSnapshot = await getDocs(clientHeadsQuery);
     
      // Fetch project managers
      const projectManagersQuery = query(collection(db, 'users'), where('role', '==', 'project_manager'));
      const projectManagersSnapshot = await getDocs(projectManagersQuery);
     
      // Fetch total projects
      const projectsQuery = query(collection(db, 'projects'));
      const projectsSnapshot = await getDocs(projectsQuery);
     
      // Fetch total tickets
      const ticketsQuery = query(collection(db, 'tickets'));
      const ticketsSnapshot = await getDocs(ticketsQuery);
 
      setStats({
        totalClients: clientsSnapshot.size,
        totalEmployees: employeesSnapshot.size,
        clientHeads: clientHeadsSnapshot.size,
        projectManagers: projectManagersSnapshot.size,
        totalProjects: projectsSnapshot.size,
        totalTickets: ticketsSnapshot.size
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };
 
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
 
  const handleNavigation = (tab) => {
    setActiveTab(tab);
    // The navigation logic is now handled by the renderContent function based on activeTab
    // No need to use navigate here for internal tab changes within Admin component
  };
 
  const renderContent = () => {
    switch (activeTab) {
      case 'projects':
        return <Projects />;
      case 'admintickets':
        return <AdminTickets />;
      default:
        return (
          <div className="flex-1 p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Admin Dashboard</h2>
           
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <>
                {/* Stats Grid */}
                <div className="grid grid-cols-4 gap-6 mb-8">
                  {/* Total Clients */}
                  <div className="bg-white rounded-lg shadow-sm border p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Total Clients</p>
                        <p className="text-3xl font-bold text-gray-900">{stats.totalClients}</p>
                      </div>
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                  </div>
 
                  {/* Total Employees */}
                  <div className="bg-white rounded-lg shadow-sm border p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Total Employees</p>
                        <p className="text-3xl font-bold text-gray-900">{stats.totalEmployees}</p>
                      </div>
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                  </div>
 
                  {/* Client Heads */}
                  <div className="bg-white rounded-lg shadow-sm border p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Client Heads</p>
                        <p className="text-3xl font-bold text-gray-900">{stats.clientHeads}</p>
                      </div>
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <UserCheck className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                  </div>
 
                  {/* Project Managers */}
                  <div className="bg-white rounded-lg shadow-sm border p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Project Managers</p>
                        <p className="text-3xl font-bold text-gray-900">{stats.projectManagers}</p>
                      </div>
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                  </div>
                </div>
 
                {/* Second Row Stats */}
                <div className="grid grid-cols-4 gap-6">
                  {/* Total Projects */}
                  <div className="bg-white rounded-lg shadow-sm border p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Total Projects</p>
                        <p className="text-3xl font-bold text-gray-900">{stats.totalProjects}</p>
                      </div>
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <FolderKanban className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                  </div>
 
                  {/* Total Tickets */}
                  <div className="bg-white rounded-lg shadow-sm border p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Total Tickets</p>
                        <p className="text-3xl font-bold text-gray-900">{stats.totalTickets}</p>
                      </div>
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <Monitor className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                  </div>
 
                  {/* Empty slots for layout consistency */}
                </div>
              </>
            )}
          </div>
        );
    }
  };
 
  return (
    <div className="flex min-h-screen bg-gray-100 font-sans">
      {/* Sidebar */}
      <aside
        className={`bg-gray-800 text-white flex flex-col h-screen fixed transition-all duration-300 ${
          isSidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div className="p-4 flex items-center justify-between h-16 border-b border-gray-700">
          <h1 className={`text-2xl font-bold ${
            isSidebarCollapsed ? 'hidden' : 'block'
          }`}>Admin Panel</h1>
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="text-gray-500 hover:text-gray-300 p-1 rounded-md"
          >
            {isSidebarCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronLeft className="w-5 h-5" />
            )}
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button
            className={`w-full text-left flex items-center p-2 rounded-md transition-colors duration-200 ${
              activeTab === 'dashboard'
                ? 'bg-gray-700 text-white'
                : 'hover:bg-gray-700 hover:text-white'
            }`}
            onClick={() => handleNavigation('dashboard')}
          >
            <Home className={`w-5 h-5 ${
              isSidebarCollapsed ? 'mr-0' : 'mr-3'
            }`} />
            <span className={isSidebarCollapsed ? 'hidden' : 'block'}>Dashboard</span>
          </button>
          <button
            className={`w-full text-left flex items-center p-2 rounded-md transition-colors duration-200 ${
              activeTab === 'projects'
                ? 'bg-gray-700 text-white'
                : 'hover:bg-gray-700 hover:text-white'
            }`}
            onClick={() => handleNavigation('projects')}
          >
            <FolderOpen className={`w-5 h-5 ${
              isSidebarCollapsed ? 'mr-0' : 'mr-3'
            }`} />
            <span className={isSidebarCollapsed ? 'hidden' : 'block'}>Projects</span>
          </button>
          <button
            className={`w-full text-left flex items-center p-2 rounded-md transition-colors duration-200 ${
              activeTab === 'admintickets'
                ? 'bg-gray-700 text-white'
                : 'hover:bg-gray-700 hover:text-white'
            }`}
            onClick={() => handleNavigation('admintickets')}
          >
            <Ticket className={`w-5 h-5 ${
              isSidebarCollapsed ? 'mr-0' : 'mr-3'
            }`} />
            <span className={isSidebarCollapsed ? 'hidden' : 'block'}>Tickets</span>
          </button>
        </nav>

        {/* Logout button - Fixed at bottom */}
        <div className="p-4 border-t border-gray-700 mt-auto">
          <button
            onClick={handleLogout}
            className={`w-full text-left flex items-center p-2 rounded-md transition-colors duration-200 hover:bg-gray-700 hover:text-white`}
          >
            <LogOut className={`w-5 h-5 ${
              isSidebarCollapsed ? 'mr-0' : 'mr-3'
            }`} />
            <span className={isSidebarCollapsed ? 'hidden' : 'block'}>Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
        isSidebarCollapsed ? 'ml-20' : 'ml-64'
      }`}>
        {/* Top Header */}
        <header className="bg-white shadow-sm h-16 flex items-center justify-end px-6 border-b">
          <div className="flex items-center space-x-4">
            <button className="p-2 hover:bg-gray-100 rounded-full">
              <Bell className="w-6 h-6 text-gray-500" />
            </button>
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowLogoutDropdown(!showLogoutDropdown)}
                className="flex items-center space-x-2 text-gray-700 hover:text-gray-900"
              >
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                {!isSidebarCollapsed && (
                  <span className="font-medium">Admin</span>
                )}
              </button>
              {showLogoutDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">Admin User</p>
                    <p className="text-xs text-gray-500">admin@artihcus.com</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                  >
                    Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {renderContent()}
      </main>
    </div>
  );
}
 
export default Admin;
 