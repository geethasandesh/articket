import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building,
  BarChart2,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  Activity,
  Calendar,
  Users,
  Ticket
} from 'lucide-react';
import { collection, query, where, getDocs, getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const ClientHeadDashboard = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalClients: 0,
    activeProjects: 0,
    pendingTickets: 0,
    resolvedTickets: 0
  });

  const auth = getAuth();
  const db = getFirestore();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          navigate('/login');
          return;
        }

        // Fetch clients
        const clientsQuery = query(
          collection(db, 'users'),
          where('role', '==', 'client')
        );
        const clientsSnapshot = await getDocs(clientsQuery);
        const clientsData = clientsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setClients(clientsData);

        // Fetch projects
        const projectsQuery = query(collection(db, 'projects'));
        const projectsSnapshot = await getDocs(projectsQuery);
        const projectsData = projectsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setProjects(projectsData);

        // Fetch tickets
        const ticketsQuery = query(collection(db, 'tickets'));
        const ticketsSnapshot = await getDocs(ticketsQuery);
        const ticketsData = ticketsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setTickets(ticketsData);

        // Update stats
        setStats({
          totalClients: clientsData.length,
          activeProjects: projectsData.filter(project => project.status === 'active').length,
          pendingTickets: ticketsData.filter(ticket => ticket.status === 'Open').length,
          resolvedTickets: ticketsData.filter(ticket => ticket.status === 'Closed').length
        });

        setLoading(false);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [navigate, auth, db]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Client Head Dashboard</h1>
          <p className="mt-2 text-gray-600">Monitor client activities and project progress</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Clients</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalClients}</p>
              </div>
              <div className="bg-blue-100 rounded-lg p-3">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Projects</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeProjects}</p>
              </div>
              <div className="bg-green-100 rounded-lg p-3">
                <Building className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Tickets</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingTickets}</p>
              </div>
              <div className="bg-yellow-100 rounded-lg p-3">
                <AlertCircle className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Resolved Tickets</p>
                <p className="text-2xl font-bold text-gray-900">{stats.resolvedTickets}</p>
              </div>
              <div className="bg-purple-100 rounded-lg p-3">
                <CheckCircle className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Clients and Projects Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Clients List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Active Clients</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {clients.map(client => (
                <div key={client.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 font-medium">
                          {client.firstName?.[0]}{client.lastName?.[0]}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900">
                        {client.firstName} {client.lastName}
                      </h3>
                      <p className="text-sm text-gray-500">{client.company || 'No company specified'}</p>
                    </div>
                    <div>
                      <button
                        onClick={() => navigate(`/client/${client.id}`)}
                        className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                      >
                        View Details →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Tickets */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Recent Tickets</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {tickets.slice(0, 5).map(ticket => (
                <div key={ticket.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900">{ticket.subject}</h3>
                      <div className="flex items-center gap-4 mt-1">
                        <p className="text-sm text-gray-500">
                          {ticket.customer}
                        </p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          ticket.status === 'Open' ? 'bg-yellow-100 text-yellow-800' :
                          ticket.status === 'Closed' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {ticket.status}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/ticket/${ticket.id}`)}
                      className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                    >
                      View →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientHeadDashboard; 