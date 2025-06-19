import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc, getDocs } from 'firebase/firestore';
import { auth, db } from '../../firebase/config';
import { Link, useNavigate } from 'react-router-dom';
import { BsTicketFill, BsFolderFill } from 'react-icons/bs';
import TicketDetails from './TicketDetails';
 
const ClientTickets = ({ setActiveTab }) => {
  const [ticketsData, setTicketsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [userProject, setUserProject] = useState(null);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [teamMembers, setTeamMembers] = useState([]);
  const [filterRaisedBy, setFilterRaisedBy] = useState('all');
  const [currentUserEmail, setCurrentUserEmail] = useState('');
 
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async user => {
      if (user) {
        console.log('User authenticated in ClientTickets.jsx', user.email);
        setLoading(true);
        setCurrentUserEmail(user.email);
 
        // Check for filter data from dashboard
        try {
          const filterData = sessionStorage.getItem('ticketFilter');
          if (filterData) {
            const parsedFilter = JSON.parse(filterData);
            setFilterStatus(parsedFilter.status);
            setFilterPriority(parsedFilter.priority);
            setFilterRaisedBy(parsedFilter.raisedBy);
            // Clear the filter data after applying it
            sessionStorage.removeItem('ticketFilter');
          }
        } catch (err) {
          console.error('Error parsing filter data:', err);
        }
 
        let currentProject = 'General';
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            currentProject = userData.project || 'General';
            setUserProject(currentProject);
            console.log('Fetched user project:', currentProject);
          } else {
            console.warn('User document not found for uid:', user.uid);
            setUserProject('General');
          }
        } catch (err) {
          console.error('Error fetching user project:', err);
          setError('Failed to load user project.');
          setUserProject('General');
        }
 
        // Fetch team members for the current project
        try {
          const teamMembersQuery = query(
            collection(db, 'users'),
            where('project', '==', currentProject)
          );
          const teamMembersSnapshot = await getDocs(teamMembersQuery);
          const members = [];
          const seenEmails = new Set(); // To track unique emails
          const nameCounts = {}; // To track how many times each name appears
         
          teamMembersSnapshot.forEach((doc) => {
            const memberData = doc.data();
            // Skip the current user from the team members list
            if (memberData.email !== user.email && !seenEmails.has(memberData.email)) {
              seenEmails.add(memberData.email);
             
              const displayName = memberData.firstName && memberData.lastName
                ? `${memberData.firstName} ${memberData.lastName}`.trim()
                : memberData.email.split('@')[0];
             
              // Count occurrences of this name
              nameCounts[displayName] = (nameCounts[displayName] || 0) + 1;
             
              members.push({
                id: doc.id,
                email: memberData.email,
                name: displayName,
                role: memberData.role || 'Unknown'
              });
            }
          });
         
          // Update display names to include email part if there are duplicates
          members.forEach(member => {
            if (nameCounts[member.name] > 1) {
              const emailPart = member.email.split('@')[0];
              member.displayName = `${member.name} (${emailPart})`;
            } else {
              member.displayName = member.name;
            }
          });
         
          setTeamMembers(members);
          console.log('Fetched team members:', members);
          console.log('Name counts:', nameCounts);
        } catch (err) {
          console.error('Error fetching team members:', err);
          // Continue without team members if there's an error
        }
 
        const ticketsCollectionRef = collection(db, 'tickets');
        const q = query(
          ticketsCollectionRef,
          where('project', '==', currentProject)
        );
 
        const unsubscribeTickets = onSnapshot(q, (snapshot) => {
          const tickets = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setTicketsData(tickets);
          setLoading(false);
          console.log(`Fetched tickets for project ${currentProject}:`, tickets);
        }, (err) => {
          console.error('Error fetching project-filtered tickets:', err);
          setError('Failed to load tickets for your project.');
          setLoading(false);
        });
 
        return () => unsubscribeTickets();
 
      } else {
        console.log('No user authenticated in ClientTickets.jsx');
        setLoading(false);
        setTicketsData([]);
        setUserProject(null);
        setTeamMembers([]);
      }
    });
 
    return () => unsubscribeAuth();
  }, []);
 
  const handleTicketClick = (ticketId) => {
    setSelectedTicketId(ticketId);
  };
 
  const handleBackToTickets = () => {
    setSelectedTicketId(null);
  };
 
  // Compute filtered tickets
  const filteredTickets = ticketsData.filter(ticket => {
    const matchesStatus = filterStatus === 'All' || ticket.status === filterStatus;
    const matchesPriority = filterPriority === 'All' || ticket.priority === filterPriority;
    const matchesSearch =
      ticket.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.id?.toLowerCase().includes(searchTerm.toLowerCase());
   
    // Filter by who raised the ticket
    let matchesRaisedBy = true;
    if (filterRaisedBy === 'me') {
      matchesRaisedBy = ticket.email === currentUserEmail;
    } else if (filterRaisedBy !== 'all') {
      // Find the selected team member's email
      const selectedMember = teamMembers.find(member => member.id === filterRaisedBy);
      if (selectedMember) {
        matchesRaisedBy = ticket.email === selectedMember.email;
      }
    }
   
    return matchesStatus && matchesPriority && matchesSearch && matchesRaisedBy;
  });
 
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading tickets...</p>
        </div>
      </div>
    );
  }
 
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded max-w-md">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }
 
  if (selectedTicketId) {
    return <TicketDetails ticketId={selectedTicketId} onBack={handleBackToTickets} />;
  }
 
  return (
    <>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <BsTicketFill className="mr-3 text-blue-600" /> Project Tickets
          </h1>
          {userProject && (
            <p className="text-gray-600 mt-2">Project: {userProject}</p>
          )}
        </div>
        {setActiveTab ? (
          <button
            onClick={() => setActiveTab('create')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors duration-200 flex items-center"
          >
            <BsFolderFill className="mr-2" />
            Create New Ticket
          </button>
        ) : (
          <Link
            to="/client-dashboard?tab=create"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors duration-200 flex items-center"
          >
            <BsFolderFill className="mr-2" />
            Create New Ticket
          </Link>
        )}
      </div>
 
      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-4 mb-6 bg-white p-4 rounded-xl shadow border border-gray-100">
        <div>
          <label className="text-xs font-semibold text-gray-500 mr-2">Status</label>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
          >
            <option value="All">All</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 mr-2">Priority</label>
          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
          >
            <option value="All">All</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 mr-2">Raised By</label>
          <select
            value={filterRaisedBy}
            onChange={e => setFilterRaisedBy(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 min-w-[140px]"
          >
            <option value="all">All team members</option>
            <option value="me">Raised by me</option>
            {teamMembers.map(member => (
              <option key={member.id} value={member.id}>
                {member.displayName}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[180px]">
          <input
            type="text"
            placeholder="Search by subject or ID..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
          />
        </div>
        <button
          onClick={() => {
            setFilterStatus('All');
            setFilterPriority('All');
            setFilterRaisedBy('all');
            setSearchTerm('');
          }}
          className="ml-auto text-xs text-blue-600 hover:underline px-2 py-1 rounded"
        >
          Clear Filters
        </button>
      </div>
      {filteredTickets.length > 0 ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ticket ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Raised By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Updated
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    onClick={() => handleTicketClick(ticket.id)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors duration-150"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {ticket.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {ticket.subject}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        ticket.status === 'Open' ? 'bg-blue-100 text-blue-800' :
                        ticket.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                        ticket.status === 'Resolved' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {ticket.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {ticket.priority}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {ticket.email === currentUserEmail ? (
                        <span className="text-blue-600 font-medium">Me</span>
                      ) : (
                        teamMembers.find(member => member.email === ticket.email)?.name || ticket.email
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {ticket.lastUpdated ? new Date(ticket.lastUpdated.toDate()).toLocaleString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <BsTicketFill className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No tickets found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating a new ticket.
          </p>
          <div className="mt-6">
            <Link
              to="/client-dashboard?tab=create"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <BsFolderFill className="mr-2" />
              Create Your First Ticket
            </Link>
          </div>
        </div>
      )}
    </>
  );
};
 
export default ClientTickets;
 
 