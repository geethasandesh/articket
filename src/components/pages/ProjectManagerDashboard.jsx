import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Briefcase,
  AlertCircle,
  CheckCircle,
  Plus,
  MessageSquare,
  LogOut,
  Home,
  Menu,
  ChevronsLeft,
  ChevronsRight,
  Flag,
  BarChart3,
  TrendingUp,
  Zap,
  User
} from 'lucide-react';
import { collection, query, where, getDocs, getFirestore, doc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import ProjectTickets from './ProjectManagerTickets';
import TeamManagement from './TeamManagement';

// Animated count-up hook (same as ClientDashboard)
function useCountUp(target, duration = 1200) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const startTime = performance.now();
    function easeOutCubic(t) {
      return 1 - Math.pow(1 - t, 3);
    }
    function animate(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);
      setCount(Math.round(eased * target));
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCount(target);
      }
    }
    requestAnimationFrame(animate);
  }, [target, duration]);
  return count;
}

const ProjectManagerDashboard = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [managerName, setManagerName] = useState('');
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeTickets: 0,
    teamMembers: 0,
    completedTickets: 0
  });

  const auth = getAuth();
  const db = getFirestore();

  // Animated counts for priorities
  const highCount = useCountUp(tickets.filter(t => t.priority === 'High').length);
  const mediumCount = useCountUp(tickets.filter(t => t.priority === 'Medium').length);
  const lowCount = useCountUp(tickets.filter(t => t.priority === 'Low').length);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          navigate('/login');
          return;
        }

        // Get manager's name
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setManagerName(`${userData.firstName} ${userData.lastName}`.trim() || userData.email.split('@')[0]);
        }

        // Get VMM project
        const projectsQuery = query(
          collection(db, 'projects'),
          where('name', '==', 'VMM')
        );
        const projectsSnapshot = await getDocs(projectsQuery);
        const projectsData = projectsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setProjects(projectsData);

        // Get VMM project employees
        const usersRef = collection(db, 'users');
        const employeesQuery = query(
          usersRef,
          where('role', '==', 'employee'),
          where('project', '==', 'VMM')
        );
        const employeesSnapshot = await getDocs(employeesQuery);
        const employeesCount = employeesSnapshot.size;

        // Get tickets for VMM project
        const ticketsQuery = query(
          collection(db, 'tickets'),
          where('projectId', '==', projectsData[0]?.id)
        );
        const ticketsSnapshot = await getDocs(ticketsQuery);
        const ticketsData = ticketsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setTickets(ticketsData);

        // Update stats
        setStats({
          totalProjects: projectsData.length,
          activeTickets: ticketsData.filter(ticket => ticket.status === 'Open').length,
          teamMembers: employeesCount,
          completedTickets: ticketsData.filter(ticket => ticket.status === 'Closed').length
        });

        setLoading(false);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [navigate, auth, db]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, active: activeTab === 'dashboard' },
    { id: 'projects', label: 'Projects', icon: Briefcase, active: activeTab === 'projects' },
    { id: 'team', label: 'Team', icon: Users, active: activeTab === 'team' },
    { id: 'tickets', label: 'Tickets', icon: MessageSquare, active: activeTab === 'tickets' }
  ];

  const renderSidebarItem = (item) => {
    const IconComponent = item.icon;
    return (
      <button
        key={item.id}
        onClick={() => {
          setActiveTab(item.id);
          setSidebarOpen(false);
        }}
        className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3'} px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
          item.active
            ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`}
        title={sidebarCollapsed ? item.label : ''}
      >
        <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : ''}`}>
          <IconComponent className={`w-5 h-5 ${item.active ? 'text-white' : 'text-gray-600'}`} />
        </div>
        {!sidebarCollapsed && <span>{item.label}</span>}
      </button>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 transform transition-all duration-300 ease-in-out ${
        sidebarCollapsed ? 'w-20' : 'w-64'
      } bg-white shadow-xl lg:translate-x-0 lg:static ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            {!sidebarCollapsed && (
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
                  <Briefcase className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-l font-bold text-gray-900">Project Hub</h1>
                  <p className="text-sm text-gray-500">Manager Portal</p>
                </div>
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
            >
              {sidebarCollapsed ? (
                <ChevronsRight className="w-6 h-6" />
              ) : (
                <ChevronsLeft className="w-6 h-6" />
              )}
            </button>
          </div>

          {/* Sidebar Navigation */}
          <nav className="flex-1 p-6 space-y-2">
            {sidebarItems.map(renderSidebarItem)}
          </nav>

          {/* Sidebar Footer */}
          <div className="p-6 border-t border-gray-200">
            {!sidebarCollapsed && (
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{managerName}</p>
                  <p className="text-xs text-gray-500">Project Manager</p>
                </div>
              </div>
            )}
            <button
              onClick={handleLogout}
              className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-start'} space-x-2 px-4 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200`}
            >
              <LogOut className="w-4 h-4" />
              {!sidebarCollapsed && <span className="text-sm font-medium">Sign Out</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Menu className="w-6 h-6 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Welcome back, {managerName}!</h1>
                <p className="text-gray-600">Manage your projects and team</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
              >
                <LogOut className="w-4 h-4" />
                <span className="font-medium">Sign Out</span>
              </button>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 overflow-auto p-6 bg-gray-50">
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Projects</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalProjects}</p>
                    </div>
                    <div className="bg-blue-100 rounded-lg p-3">
                      <Briefcase className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Tickets</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.activeTickets}</p>
                    </div>
                    <div className="bg-yellow-100 rounded-lg p-3">
                      <AlertCircle className="w-6 h-6 text-yellow-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Team Members</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.teamMembers}</p>
                    </div>
                    <div className="bg-green-100 rounded-lg p-3">
                      <Users className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Completed Tickets</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.completedTickets}</p>
                    </div>
                    <div className="bg-purple-100 rounded-lg p-3">
                      <CheckCircle className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Charts and Analytics Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Status Distribution Line Chart */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
                    Ticket Status Trends
                  </h3>
                  <div className="h-64 bg-gray-50 rounded-lg p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={[
                          { name: 'Open', value: tickets.filter(t => t.status === 'Open').length },
                          { name: 'In Progress', value: tickets.filter(t => t.status === 'In Progress').length },
                          { name: 'Resolved', value: tickets.filter(t => t.status === 'Resolved').length },
                          { name: 'Closed', value: tickets.filter(t => t.status === 'Closed').length }
                        ]}
                        margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 14 }} axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 14 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', color: '#334155' }} />
                        <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={3} dot={{ r: 6, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 8 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Priority Distribution */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
                    Ticket Priority Distribution
                  </h3>
                  <div className="flex flex-col md:flex-row gap-6 justify-center items-center">
                    <div className="flex-1 bg-red-50 border border-red-200 rounded-xl p-6 flex flex-col items-center">
                      <Flag className="w-8 h-8 text-red-500 mb-2" />
                      <span className="text-2xl font-bold text-red-600">{highCount}</span>
                      <span className="text-sm font-medium text-red-700 mt-1">High Priority</span>
                    </div>
                    <div className="flex-1 bg-yellow-50 border border-yellow-200 rounded-xl p-6 flex flex-col items-center">
                      <Flag className="w-8 h-8 text-yellow-500 mb-2" />
                      <span className="text-2xl font-bold text-yellow-600">{mediumCount}</span>
                      <span className="text-sm font-medium text-yellow-700 mt-1">Medium Priority</span>
                    </div>
                    <div className="flex-1 bg-green-50 border border-green-200 rounded-xl p-6 flex flex-col items-center">
                      <Flag className="w-8 h-8 text-green-500 mb-2" />
                      <span className="text-2xl font-bold text-green-600">{lowCount}</span>
                      <span className="text-sm font-medium text-green-700 mt-1">Low Priority</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  <Zap className="w-6 h-6 mr-3 text-blue-600" />
                  Quick Actions
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <button
                    onClick={() => setActiveTab('projects')}
                    className="group bg-white p-6 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-300 text-left"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                        <Plus className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-gray-900 text-lg">New Project</p>
                        <p className="text-gray-600 text-sm">Create a project</p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveTab('team')}
                    className="group bg-white p-6 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-300 text-left"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                        <Users className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-gray-900 text-lg">Manage Team</p>
                        <p className="text-gray-600 text-sm">View team members</p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveTab('tickets')}
                    className="group bg-white p-6 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-300 text-left"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                        <MessageSquare className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-gray-900 text-lg">View Tickets</p>
                        <p className="text-gray-600 text-sm">Manage support tickets</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Projects List */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Active Projects</h2>
                </div>
                <div className="divide-y divide-gray-200">
                  {projects.map(project => (
                    <div key={project.id} className="p-6 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">{project.name}</h3>
                          <p className="text-sm text-gray-500 mt-1">
                            {tickets.filter(t => t.projectId === project.id).length} Active Tickets
                          </p>
                        </div>
                        <button
                          onClick={() => navigate(`/project/${project.id}`)}
                          className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                        >
                          View Details →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Other tabs content will be added here */}
          {activeTab === 'projects' && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Projects Management</h2>
              {/* Projects management content */}
            </div>
          )}

          {activeTab === 'team' && (
            <TeamManagement />
          )}

          {activeTab === 'tickets' && (
            <ProjectTickets setActiveTab={setActiveTab} />
          )}
        </main>
      </div>
    </div>
  );
};

export default ProjectManagerDashboard; 