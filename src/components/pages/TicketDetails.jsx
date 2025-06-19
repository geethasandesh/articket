import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, arrayUnion, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import {
  ArrowLeft,
  Mail,
  User,
  Tag,
  Clock,
  Calendar,
  Hash,
  Info,
  Briefcase,
  Send,
  AlertCircle,
  CheckCircle,
  MessageSquare,
  FileText,
  Paperclip,
  Link
} from 'lucide-react';
import { sendEmail } from '../../utils/sendEmail';

const TicketDetails = ({ ticketId, onBack }) => {
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newResponse, setNewResponse] = useState(''); // New state for comment input
  const [isSendingResponse, setIsSendingResponse] = useState(false);
  const [activeTab, setActiveTab] = useState('Conversations');

  useEffect(() => {
    const fetchTicketDetails = async () => {
      if (!ticketId) {
        setError('No ticket ID provided.');
        setLoading(false);
        return;
      }

      try {
        const ticketRef = doc(db, 'tickets', ticketId);
        const ticketSnap = await getDoc(ticketRef);

        if (ticketSnap.exists()) {
          setTicket({ id: ticketSnap.id, ...ticketSnap.data() });
          setError(null);
        } else {
          setError('Ticket not found.');
        }
      } catch (err) {
        console.error('Error fetching ticket details:', err);
        setError('Failed to load ticket details.');
      } finally {
        setLoading(false);
      }
    };

    fetchTicketDetails();
  }, [ticketId]);

  const handleAddResponse = async () => {
    if (!newResponse.trim() || !ticketId || !auth.currentUser) return;

    setIsSendingResponse(true);
    try {
      const ticketRef = doc(db, 'tickets', ticketId);
      const response = {
        message: newResponse.trim(),
        timestamp: serverTimestamp(),
        authorEmail: auth.currentUser.email, // Store the email of the responder
        authorRole: 'client', // Assuming client is responding
      };

      await updateDoc(ticketRef, {
        customerResponses: arrayUnion(response), // Add new response to customerResponses array
        lastUpdated: serverTimestamp() // Update last updated timestamp
      });

      setNewResponse(''); // Clear input
      // Re-fetch ticket to update UI with new response, or manually add to state
      // For simplicity, let's re-fetch the ticket details to update the UI
      const updatedTicketSnap = await getDoc(ticketRef);
      if (updatedTicketSnap.exists()) {
        setTicket({ id: updatedTicketSnap.id, ...updatedTicketSnap.data() });
        // Send email notification to project members
        const updatedTicket = updatedTicketSnap.data();
        const memberEmails = await fetchProjectMemberEmails(updatedTicket.project);
        const emailParams = {
          to_email: memberEmails.join(','),
          from_name: 'Articket Support',
          reply_to: auth.currentUser.email, // commenter's email
          subject: updatedTicket.subject,
          request_id: ticketId,
          status: updatedTicket.status,
          priority: updatedTicket.priority,
          category: updatedTicket.category,
          project: updatedTicket.project,
          assigned_to: updatedTicket.assignedTo || 'Not Assigned',
          created: updatedTicket.created ? new Date(updatedTicket.created.toDate()).toLocaleString() : '',
          requester: `${updatedTicket.customer} (${updatedTicket.email})`,
          description: updatedTicket.description,
          comment: newResponse.trim(),
          ticket_link: `https://articket.vercel.app/tickets/${ticketId}`
        };
        await sendEmail(emailParams);
      }
    } catch (err) {
      console.error('Error adding response:', err);
      // Optionally, show an error to the user
    } finally {
      setIsSendingResponse(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Open':
        return 'bg-blue-100 text-blue-800';
      case 'In Progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'Resolved':
        return 'bg-green-100 text-green-800';
      case 'Closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Helper to fetch all emails of users in the selected project
  const fetchProjectMemberEmails = async (projectName) => {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('project', '==', projectName));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data().email).filter(Boolean);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading ticket details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded max-w-md">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
          <button
            onClick={onBack}
            className="ml-4 inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-200 hover:bg-red-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded max-w-md">
          <strong className="font-bold">Information: </strong>
          <span className="block sm:inline">Ticket data is not available.</span>
          <button
            onClick={onBack}
            className="ml-4 inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-yellow-700 bg-yellow-200 hover:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 border-b pb-6 bg-gradient-to-r from-blue-50 to-white rounded-2xl shadow-sm px-6 pt-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl font-bold text-gray-900 tracking-tight leading-tight">{ticket.subject}</span>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-50 text-red-700 text-xs font-semibold border border-red-200 shadow-sm" style={{display: ticket.priority === 'High' ? 'inline-flex' : 'none'}}>
                <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span> High
              </span>
            </div>
            <div className="text-xs text-gray-500 font-medium">Requested by <span className="font-semibold text-blue-700">{ticket.customer}</span> on {ticket.created ? new Date(ticket.created.toDate()).toLocaleString() : 'N/A'}</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl shadow transition-all"><ArrowLeft className="w-4 h-4 mr-1" /> Back</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b mb-8 px-2">
          <nav className="flex flex-wrap gap-2">
            {['Conversations','Details','Checklists','Resolution','Time Elapsed Analysis'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 text-sm font-semibold rounded-t-lg border-b-2 transition-all duration-150 focus:outline-none ${activeTab === tab ? 'border-blue-600 text-blue-700 bg-white shadow-sm' : 'border-transparent text-gray-500 hover:text-blue-600 hover:bg-blue-50'}`}
                style={{marginBottom: activeTab === tab ? '-2px' : 0}}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="px-2 pb-2">
          {activeTab === 'Conversations' && (
            <>
              {/* Conversation List (Responses) */}
              <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl p-6 shadow-sm mb-10">
                <div className="mb-4 text-base text-gray-700 font-semibold">Conversations</div>
                <div className="space-y-6">
                  {/* Admin Responses */}
                  {ticket.adminResponses && ticket.adminResponses.length > 0 && ticket.adminResponses.map((response, index) => (
                    <div key={index} className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center font-bold text-blue-700 text-lg shadow-sm">
                        {response.authorEmail ? response.authorEmail.charAt(0).toUpperCase() : 'A'}
                      </div>
                      <div className="flex-1">
                        <div className="bg-white border border-blue-100 rounded-xl p-4 shadow-sm">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-blue-700">Admin</span>
                            <span className="text-xs text-gray-400">{response.timestamp ? new Date(response.timestamp.toDate()).toLocaleString() : 'N/A'}</span>
                          </div>
                          <div className="text-gray-900 whitespace-pre-wrap leading-relaxed">{response.message}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {/* Customer Responses */}
                  {ticket.customerResponses && ticket.customerResponses.length > 0 && ticket.customerResponses.map((response, index) => (
                    <div key={index} className="flex items-start gap-4 flex-row-reverse">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-200 flex items-center justify-center font-bold text-green-700 text-lg shadow-sm">
                        {response.authorEmail ? response.authorEmail.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div className="flex-1">
                        <div className="bg-white border border-green-100 rounded-xl p-4 shadow-sm">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-green-700">You</span>
                            <span className="text-xs text-gray-400">{response.timestamp ? new Date(response.timestamp.toDate()).toLocaleString() : 'N/A'}</span>
                          </div>
                          <div className="text-gray-900 whitespace-pre-wrap leading-relaxed">{response.message}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!ticket.adminResponses || ticket.adminResponses.length === 0) && (!ticket.customerResponses || ticket.customerResponses.length === 0) && (
                    <div className="text-gray-400 text-center py-12">No conversations yet.</div>
                  )}
                </div>
              </div>
              {/* Add Response Section */}
              <div className="bg-white rounded-2xl p-8 shadow border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Add a Response</h3>
                <div className="flex flex-col space-y-4">
                  <textarea
                    className="w-full p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y min-h-[100px] bg-gray-50 shadow-sm"
                    placeholder="Type your response here..."
                    value={newResponse}
                    onChange={(e) => setNewResponse(e.target.value)}
                    rows="4"
                  ></textarea>
                  <div className="flex justify-end">
                    <button
                      onClick={handleAddResponse}
                      disabled={!newResponse.trim() || isSendingResponse}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow"
                    >
                      {isSendingResponse ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-white mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          <span>Send Response</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
          {activeTab === 'Details' && (
            <div className="space-y-8">
              <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div><span className="font-semibold text-gray-700">Request ID:</span> {ticket.id}</div>
                  <div><span className="font-semibold text-gray-700">Status:</span> {ticket.status}</div>
                  <div><span className="font-semibold text-gray-700">Priority:</span> {ticket.priority}</div>
                  <div><span className="font-semibold text-gray-700">Category:</span> {ticket.category}</div>
                  <div><span className="font-semibold text-gray-700">Project:</span> {ticket.project}</div>
                  <div><span className="font-semibold text-gray-700">Created:</span> {ticket.created ? new Date(ticket.created.toDate()).toLocaleString() : 'N/A'}</div>
                  <div><span className="font-semibold text-gray-700">Assigned To:</span> {ticket.assignedTo || 'Not Assigned'}</div>
                  <div><span className="font-semibold text-gray-700">Requester:</span> {ticket.customer} ({ticket.email})</div>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
                <div className="font-semibold text-gray-700 mb-2">Description</div>
                <div className="whitespace-pre-wrap break-words text-gray-900 border border-gray-100 rounded-lg p-4 bg-gray-50" style={{ fontFamily: 'inherit', fontSize: '1rem', minHeight: '80px' }}>
                  {ticket.description || <span className="text-gray-400">No description provided.</span>}
                </div>
              </div>
              {ticket.attachments && ticket.attachments.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
                  <div className="font-semibold text-gray-700 mb-2">Attachments ({ticket.attachments.length})</div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {ticket.attachments.map((file, index) => (
                      <div key={index} className="flex flex-col items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-3 shadow-sm">
                        <span>
                          {file.type.startsWith('image/') ? (
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          ) : file.type === 'application/pdf' ? (
                            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          )}
                        </span>
                        <span className="text-xs font-medium text-gray-700 text-center truncate w-full" title={file.name}>{file.name}</span>
                        <span className="text-xs text-gray-400">({(file.size / 1024).toFixed(1)} KB)</span>
                        {/* Preview/Download Button */}
                        {file.type.startsWith('image/') ? (
                          <a
                            href={file.data}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                          >
                            Preview
                          </a>
                        ) : file.type === 'application/pdf' ? (
                          <a
                            href={file.data}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-red-600 hover:text-red-800 text-xs font-medium"
                          >
                            Preview
                          </a>
                        ) : (
                          <a
                            href={file.data}
                            download={file.name}
                            className="text-gray-600 hover:text-gray-800 text-xs font-medium"
                          >
                            Download
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {activeTab === 'Checklists' && (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm space-y-6">
              <div className="font-bold text-lg text-gray-900 mb-4">Checklists</div>
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full bg-green-400 flex items-center justify-center text-white text-xs">✓</span>
                  <span className="text-gray-800">Verify SAP EWM system connectivity</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full bg-gray-300 flex items-center justify-center text-white text-xs">•</span>
                  <span className="text-gray-800">Check user authorization for warehouse tasks</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full bg-gray-300 flex items-center justify-center text-white text-xs">•</span>
                  <span className="text-gray-800">Review error logs for recent failures</span>
                </li>
              </ul>
            </div>
          )}
          {activeTab === 'Resolution' && (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm space-y-6">
              <div className="font-bold text-lg text-gray-900 mb-4">Resolution</div>
              <div className="text-gray-800 mb-2">Sample resolution steps for this ticket:</div>
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                <li>Identified root cause as missing master data in SAP EWM.</li>
                <li>Updated the master data and reprocessed the failed delivery.</li>
                <li>Confirmed with the user that the issue is resolved.</li>
              </ol>
              <div className="mt-4 text-green-700 font-semibold">Status: Resolved</div>
            </div>
          )}
          {activeTab === 'Time Elapsed Analysis' && (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm space-y-6">
              <div className="font-bold text-lg text-gray-900 mb-4">Time Elapsed Analysis</div>
              <div className="text-gray-800 mb-2">Sample time breakdown for this ticket:</div>
              <table className="min-w-full text-sm text-left text-gray-700">
                <thead>
                  <tr>
                    <th className="py-2 px-4 font-semibold">Stage</th>
                    <th className="py-2 px-4 font-semibold">Start Time</th>
                    <th className="py-2 px-4 font-semibold">End Time</th>
                    <th className="py-2 px-4 font-semibold">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t">
                    <td className="py-2 px-4">Ticket Created</td>
                    <td className="py-2 px-4">2025-06-05 12:15</td>
                    <td className="py-2 px-4">2025-06-05 12:20</td>
                    <td className="py-2 px-4">5 min</td>
                  </tr>
                  <tr className="border-t">
                    <td className="py-2 px-4">Assigned</td>
                    <td className="py-2 px-4">2025-06-05 12:20</td>
                    <td className="py-2 px-4">2025-06-05 13:00</td>
                    <td className="py-2 px-4">40 min</td>
                  </tr>
                  <tr className="border-t">
                    <td className="py-2 px-4">In Progress</td>
                    <td className="py-2 px-4">2025-06-05 13:00</td>
                    <td className="py-2 px-4">2025-06-05 15:30</td>
                    <td className="py-2 px-4">2 hr 30 min</td>
                  </tr>
                  <tr className="border-t">
                    <td className="py-2 px-4">Resolved</td>
                    <td className="py-2 px-4">2025-06-05 15:30</td>
                    <td className="py-2 px-4">2025-06-05 16:00</td>
                    <td className="py-2 px-4">30 min</td>
                  </tr>
                </tbody>
              </table>
              <div className="mt-4 text-blue-700 font-semibold">Total Time: 3 hr 45 min</div>
            </div>
          )}
        </div>
      </div>
      {/* Sidebar */}
      <aside className="w-full lg:w-80 flex-shrink-0 bg-gradient-to-br from-slate-50 to-blue-50 border border-gray-100 rounded-2xl p-8 h-fit shadow-xl mt-8 lg:mt-0">
        {/* Request ID */}
        <div className="mb-8 pb-4 border-b border-gray-200 flex items-center gap-3">
          <Hash className="w-5 h-5 text-blue-400" />
          <div>
            <div className="text-xs text-gray-500 font-semibold">Request ID</div>
            <div className="text-lg font-bold text-gray-900 tracking-tight">{ticket.id}</div>
          </div>
        </div>
        {/* Status */}
        <div className="mb-6 flex items-center gap-3">
          <Info className="w-5 h-5 text-blue-400" />
          <div>
            <div className="text-xs text-gray-500 font-semibold">Status</div>
            <div className={`font-semibold ${getStatusBadge(ticket.status)}`}>{ticket.status}</div>
          </div>
        </div>
        {/* Life cycle */}
        <div className="mb-6 flex items-center gap-3">
          <Clock className="w-5 h-5 text-gray-400" />
          <div>
            <div className="text-xs text-gray-500 font-semibold">Life cycle</div>
            <div className="font-semibold text-gray-800">Not Assigned</div>
          </div>
        </div>
        {/* Workflow */}
        <div className="mb-6 flex items-center gap-3">
          <Clock className="w-5 h-5 text-gray-400" />
          <div>
            <div className="text-xs text-gray-500 font-semibold">Workflow</div>
            <div className="font-semibold text-gray-800">Not Assigned</div>
          </div>
        </div>
        {/* Priority */}
        <div className="mb-6 flex items-center gap-3">
          <Tag className="w-5 h-5 text-yellow-400" />
          <div>
            <div className="text-xs text-gray-500 font-semibold">Priority</div>
            <div className={`font-semibold ${
              ticket.priority === 'High' ? 'text-red-600' :
              ticket.priority === 'Medium' ? 'text-yellow-600' :
              'text-green-600'
            }`}>{ticket.priority}</div>
          </div>
        </div>
        {/* Technician */}
        <div className="mb-6 flex items-center gap-3">
          <User className="w-5 h-5 text-green-400" />
          <div>
            <div className="text-xs text-gray-500 font-semibold">Technician</div>
            <div className="font-semibold text-gray-800">{ticket.assignedTo || 'Not Assigned'}</div>
          </div>
        </div>
        {/* Group & Site */}
        <div className="mb-6 flex items-center gap-3">
          <Briefcase className="w-5 h-5 text-indigo-400" />
          <div>
            <div className="text-xs text-gray-500 font-semibold">Group & Site</div>
            <div className="font-semibold text-gray-800">SAP Support</div>
          </div>
        </div>
        {/* Tasks & Checklists */}
        
        <div className="mb-6 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-400" />
          <div>
            <div className="text-xs text-gray-500 font-semibold">Checklists</div>
            <div className="font-semibold text-gray-800">0/0</div>
          </div>
        </div>
        {/* Attachments */}
        <div className="mb-6 flex items-center gap-3">
          <Paperclip className="w-5 h-5 text-blue-400" />
          <div>
            <div className="text-xs text-gray-500 font-semibold">Attachments</div>
            <div className="font-semibold text-gray-800">{ticket.attachments ? ticket.attachments.length : 0}</div>
          </div>
        </div>
        {/* Due By */}
        <div className="mb-6 flex items-center gap-3">
          <Clock className="w-5 h-5 text-gray-400" />
          <div>
            <div className="text-xs text-gray-500 font-semibold">Due By</div>
            <div className="font-semibold text-gray-800">N/A</div>
          </div>
        </div>
        {/* Linked Requests */}
        <div className="mb-6 flex items-center gap-3">
          <Link className="w-5 h-5 text-blue-400" />
          <div>
            <div className="text-xs text-gray-500 font-semibold">Linked Requests</div>
            <button className="font-semibold text-blue-600 hover:underline focus:outline-none bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-all">Attach</button>
          </div>
        </div>
        {/* Tags */}
        <div className="mb-6 flex items-center gap-3">
          <Tag className="w-5 h-5 text-pink-400" />
          <div>
            <div className="text-xs text-gray-500 font-semibold">Tags</div>
            <button className="font-semibold text-blue-600 hover:underline focus:outline-none bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-all">Add</button>
          </div>
        </div>
        {/* Requester Details */}
        <div className="pt-4 mt-8 border-t border-gray-200 flex items-start gap-3">
          <User className="w-8 h-8 text-blue-400 bg-white rounded-full border border-blue-100 p-1" />
          <div>
            <div className="text-xs text-gray-500 font-semibold mb-1">Requester Details</div>
            <div className="font-semibold text-gray-800">{ticket.customer}</div>
            <div className="text-xs text-gray-500">{ticket.email}</div>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default TicketDetails;