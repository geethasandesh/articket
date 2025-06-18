import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, setDoc, query, where, arrayUnion, onSnapshot, getDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import { Plus, X, Edit2, Trash2, UserPlus, CheckCircle2, User, Briefcase, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';

function Projects() {
  const [projects, setProjects] = useState([]);
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [showAddPersonModal, setShowAddPersonModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState(null);
  const [expandedProject, setExpandedProject] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    email: '',
    password: '',
    role: 'client',
    userType: 'client'
  });
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [editingMember, setEditingMember] = useState(null);
  const [showEditMemberModal, setShowEditMemberModal] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'projects'), (querySnapshot) => {
      const projectsData = querySnapshot.docs.map(doc => {
        // console.log('Processing project document:', doc.id, doc.data()); // Commented out
        return {
        id: doc.id,
        ...doc.data()
        };
      });
      // console.log('Real-time projects data received (total documents):', projectsData.length, projectsData); // Commented out
      setProjects(projectsData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching real-time projects:', error);
      setLoading(false);
    });

    return () => unsubscribe(); // Cleanup the listener on component unmount
  }, []);

  const handleAddProject = async (e) => {
    e.preventDefault();
    try {
      const docRef = await addDoc(collection(db, 'projects'), {
        name: formData.name,
        description: formData.description,
        members: [],
        createdAt: new Date().toISOString()
      });
      
      setProjects([...projects, { id: docRef.id, ...formData, members: [] }]);
      setShowAddProjectModal(false);
      setFormData({ name: '', description: '', email: '', password: '', role: 'client', userType: 'client' });
    } catch (error) {
      console.error('Error adding project:', error);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, 3000);
  };

  const handleAddPerson = async (e) => {
    e.preventDefault();
    if (!selectedProject) {
      console.error('No project selected when trying to add person.');
      return;
    }

    try {
      // Store current admin user
      const currentAdmin = auth.currentUser;
      if (!currentAdmin) {
        showNotification('Admin session expired. Please log in again.', 'error');
        return;
      }

      let memberUid;
      let userRef;
      let finalRole;

      // Determine the role based on user type and role
      if (formData.userType === 'client') {
        finalRole = formData.role === 'head' ? 'client_head' : 'client';
      } else {
        finalRole = formData.role === 'manager' ? 'project_manager' : 'employee';
      }

      // 1. Add or update user in users collection FIRST
      // Check if user already exists in Firestore users collection by email
      const usersQuery = query(collection(db, 'users'), where('email', '==', formData.email));
      const userSnapshot = await getDocs(usersQuery);
      let userData;
      if (!userSnapshot.empty) {
        // User exists, update existing document
        userRef = userSnapshot.docs[0].ref;
        memberUid = userSnapshot.docs[0].id; // Get existing UID
        userData = userSnapshot.docs[0].data();
        const updateData = {
          role: finalRole,
          userType: formData.userType,
          updatedAt: new Date().toISOString(),
          updatedBy: currentAdmin.uid,
          projects: arrayUnion(selectedProject.id), // Add project to user's projects array
        };
        if (formData.userType === 'client') {
          updateData.project = selectedProject.name;
        } else {
          updateData.project = selectedProject.name; // Save project name for employees too
        }
        await updateDoc(userRef, updateData);
        showNotification(`${formData.email} details updated and added to project.`);
      } else {
        // User does not exist, create a new pending user document
        memberUid = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        userRef = doc(db, 'users', memberUid);
        const setData = {
          email: formData.email,
          role: finalRole,
          userType: formData.userType,
          createdAt: new Date().toISOString(),
          createdBy: currentAdmin.uid,
          status: 'pending', // Indicates account needs to be created
          password: formData.password, // Store password temporarily for account creation
          projects: [selectedProject.id] // Initialize projects array with current project
        };
        if (formData.userType === 'client') {
          setData.project = selectedProject.name;
        } else {
          setData.project = selectedProject.name; // Save project name for employees too
        }
        await setDoc(userRef, setData);
        showNotification(`${formData.email} has been added to the project. Account will be created when they first log in.`);
      }

      // 2. THEN add user to project members (using the determined memberUid)
      const updatedMembers = [...(selectedProject.members || []), {
        email: formData.email,
        role: finalRole,
        uid: memberUid,
        userType: formData.userType,
        status: userSnapshot.empty ? 'pending' : (userData?.status || 'active') // Keep existing status or set pending
      }];

      await updateDoc(doc(db, 'projects', selectedProject.id), {
        members: updatedMembers
      });

      // Update local state
      const updatedProjects = projects.map(p => 
        p.id === selectedProject.id 
          ? { ...p, members: updatedMembers }
          : p
      );
      setProjects(updatedProjects);
      // Update selected project to reflect new members immediately
      const newlySelectedProject = updatedProjects.find(p => p.id === selectedProject.id);
      if (newlySelectedProject) {
        setSelectedProject(newlySelectedProject);
      }
      setShowAddPersonModal(false);
      setFormData({ 
        name: '', 
        description: '', 
        email: '', 
        password: '', 
        role: 'client',
        userType: 'client'
      });
      
    } catch (error) {
      console.error('Error adding/updating person:', error);
      showNotification('Failed to add/update member. Please try again.', 'error');
    }
  };

  const handleDeleteClick = (projectId, e) => {
    e.stopPropagation();
    setProjectToDelete(projectId);
    setShowDeleteConfirmModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!projectToDelete) return;
    
    try {
      await deleteDoc(doc(db, 'projects', projectToDelete));
      setProjects(projects.filter(p => p.id !== projectToDelete));
      showNotification('Project deleted successfully');
    } catch (error) {
      console.error('Error deleting project:', error);
      showNotification('Failed to delete project', 'error');
    } finally {
      setShowDeleteConfirmModal(false);
      setProjectToDelete(null);
    }
  };

  const handleEditMember = (member) => {
    setEditingMember(member);
    setFormData({
      ...formData,
      email: member.email,
      role: member.role === 'client_head' ? 'head' : 
            member.role === 'project_manager' ? 'manager' : 
            member.role === 'client' ? 'client' : 'employee',
      userType: member.userType
    });
    setShowEditMemberModal(true);
  };

  const handleUpdateMember = async (e) => {
    e.preventDefault();
    if (!selectedProject || !editingMember) {
      console.error('No project or member selected when trying to update member.');
      return;
    }

    try {
      const updatedMembers = selectedProject.members.map(member => {
        if (member.uid === editingMember.uid) {
          let newRole;
          if (formData.userType === 'client') {
            newRole = formData.role === 'head' ? 'client_head' : 'client';
          } else {
            newRole = formData.role === 'manager' ? 'project_manager' : 'employee';
          }
          return {
            ...member,
            role: newRole,
            userType: formData.userType
          };
        }
        return member;
      });

      await updateDoc(doc(db, 'projects', selectedProject.id), {
        members: updatedMembers
      });

      // Update user document in users collection
      try {
        const userDocRef = doc(db, 'users', editingMember.uid);
        const updateData = {
          role: updatedMembers.find(m => m.uid === editingMember.uid)?.role || editingMember.role,
          userType: formData.userType,
          updatedAt: new Date().toISOString()
        };

        console.log('Attempting to update member.');
        console.log('Selected Project at update Member:', selectedProject);
        console.log('Selected Project Name at update Member:', selectedProject.name);
        console.log('Form Data User Type:', formData.userType);
        console.log('Update Data for User Document:', updateData);

        // Only set the 'project' field if the user is a client
        if (formData.userType === 'client') {
          updateData.project = selectedProject.name; 
        } else {
          // If user type changes to employee, ensure 'project' field is set to project name
          updateData.project = selectedProject.name;
        }

        await updateDoc(userDocRef, updateData);
      } catch (error) {
        console.error('Error updating user document:', error);
        // Continue even if user document update fails
      }

      // Update local state
      const updatedProjects = projects.map(p => 
        p.id === selectedProject.id 
          ? { ...p, members: updatedMembers }
          : p
      );
      setProjects(updatedProjects);
      setShowEditMemberModal(false);
      setEditingMember(null);
      setFormData({
        name: '',
        description: '',
        email: '',
        password: '',
        role: 'client',
        userType: 'client'
      });
      
      showNotification('Member role updated successfully');
    } catch (error) {
      console.error('Error updating member:', error);
      showNotification('Failed to update member role', 'error');
    }
  };

  const handleDeleteMember = async (memberToDelete, projectId) => {
    // Find the project from the projects array
    const project = projects.find(p => p.id === projectId);
    if (!project) {
      return;
    }
    try {
      const currentAdmin = auth.currentUser;
      if (!currentAdmin) {
        showNotification('Admin session expired. Please log in again.', 'error');
        return;
      }
      // 1. Remove member from project first
      const updatedMembers = project.members.filter(member => member.uid !== memberToDelete.uid);
      await updateDoc(doc(db, 'projects', project.id), {
        members: updatedMembers
      });
      // 2. Remove project from user's projects array
      const userDocRef = doc(db, 'users', memberToDelete.uid);
      let userDocSnap;
      try {
        userDocSnap = await getDoc(userDocRef);
      } catch (error) {
        userDocSnap = null;
      }
      if (userDocSnap && userDocSnap.exists()) {
        const userData = userDocSnap.data();
        let userProjects = userData.projects || [];
        userProjects = userProjects.filter(pid => pid !== projectId);
        // Remove project field if user is a client and this was their only project
        let updateFields = { projects: userProjects };
        if (userData.userType === 'client' && userProjects.length === 0) {
          updateFields.project = null;
        }
        await updateDoc(userDocRef, updateFields);
        // 3. If user is not in any other projects, delete user document
        if (userProjects.length === 0) {
          await deleteDoc(userDocRef);
        }
      }
      // Update local state
      const updatedProjects = projects.map(p => 
        p.id === project.id 
          ? { ...p, members: updatedMembers }
          : p
      );
      setProjects(updatedProjects);
      if (selectedProject && selectedProject.id === project.id) {
        const newlySelectedProject = updatedProjects.find(p => p.id === project.id);
        if (newlySelectedProject) {
          setSelectedProject(newlySelectedProject);
        }
      }
      showNotification(`${memberToDelete.email} has been completely removed from the project and system`);
    } catch (error) {
      console.error('Error deleting member:', error);
      showNotification('Failed to remove member from project', 'error');
    }
  };

  return (
    <>
      <div className="p-6 bg-gray-100 min-h-screen">
        {/* Notification */}
      {notification.show && (
          <div className={`mb-4 p-3 rounded-lg flex items-center ${notification.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {notification.type === 'success' ? <CheckCircle2 size={20} className="mr-2" /> : <AlertTriangle size={20} className="mr-2" />}
            {notification.message}
        </div>
      )}

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Projects Management</h2>
        <button
          onClick={() => setShowAddProjectModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
        >
            <Plus size={20} /> Create New Project
        </button>
      </div>

        {/* Project List */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
      <div className="space-y-4">
            {projects.length === 0 && <p className="text-gray-500 text-center col-span-full">No projects created yet.</p>}
        {projects.map(project => (
              <div 
                key={project.id} 
                className="bg-white rounded-lg shadow-sm border p-5 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div 
                  className="flex justify-between items-center mb-4"
                  onClick={() => setExpandedProject(expandedProject === project.id ? null : project.id)}
                >
                  <div className="flex items-center space-x-3">
                <div>
                      <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
                      <p className="text-sm text-gray-600">{project.description}</p>
                </div>
              </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">{project.members?.length || 0} members</span>
                    
                <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteClick(project.id, e); }}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                {expandedProject === project.id ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </div>

            {expandedProject === project.id && (
                  <div className="border-t border-gray-200 mt-4 pt-4">
                    <h4 className="text-md font-semibold text-gray-800 mb-3">Team Members</h4>
                    {project.members && project.members.length > 0 ? (
                      <>
                        {/* Clients Section */}
                        {
                          project.members.filter(member => member.userType === 'client').length > 0 && (
                <div className="mb-4">
                              <h5 className="text-sm font-semibold text-gray-700 mb-2">Clients</h5>
                              <ul className="space-y-2">
                                {project.members.filter(member => member.userType === 'client').map((member, index) => (
                                  <li key={index} className="flex justify-between items-center bg-gray-50 p-3 rounded-md">
                        <div className="flex items-center">
                                      <User size={16} className="text-gray-500 mr-2" />
                                      <span className="text-gray-700">{member.email}</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <span className="text-sm text-gray-600 capitalize">{member.role?.replace('_', ' ')}</span>
                                      <button
                                        onClick={() => handleEditMember(member)}
                                        className="text-blue-500 hover:text-blue-700 transition-colors"
                                      >
                                        <Edit2 size={16} />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteMember(member, project.id);
                                        }}
                                        className="text-red-500 hover:text-red-700 transition-colors"
                                        title="Remove member from project"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                          </div>
                          )
                        }

                        {/* Employees Section */}
                        {
                          project.members.filter(member => member.userType === 'employee').length > 0 && (
                          <div>
                              <h5 className="text-sm font-semibold text-gray-700 mb-2">Employees</h5>
                              <ul className="space-y-2">
                                {project.members.filter(member => member.userType === 'employee').map((member, index) => (
                                  <li key={index} className="flex justify-between items-center bg-gray-50 p-3 rounded-md">
                                    <div className="flex items-center">
                                      <User size={16} className="text-gray-500 mr-2" />
                                      <span className="text-gray-700">{member.email}</span>
                          </div>
                                    <div className="flex items-center space-x-2">
                                      <span className="text-sm text-gray-600 capitalize">{member.role?.replace('_', ' ')}</span>
                                      <button
                                        onClick={() => handleEditMember(member)}
                                        className="text-blue-500 hover:text-blue-700 transition-colors"
                                      >
                                        <Edit2 size={16} />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteMember(member, project.id);
                                        }}
                                        className="text-red-500 hover:text-red-700 transition-colors"
                                        title="Remove member from project"
                                      >
                                        <Trash2 size={16} />
                        </button>
                      </div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )
                        }
                      </>
                    ) : (
                      <p className="text-gray-500 text-sm">No members added to this project yet.</p>
                    )}
                    <button
                      onClick={() => {
                        setSelectedProject(project);
                        setShowAddPersonModal(true);
                      }}
                      className="mt-4 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg flex items-center gap-1 hover:bg-green-700 transition-colors"
                    >
                      <UserPlus size={16} /> Add Member
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Project Modal */}
      {showAddProjectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-800">Create New Project</h3>
                <button
                  onClick={() => setShowAddProjectModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleAddProject} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Enter project name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Enter project description"
                    rows="3"
                    required
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddProjectModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Create Project
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Person Modal */}
      {showAddPersonModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-800">Add Team Member to {selectedProject?.name}</h3>
                <button
                  onClick={() => setShowAddPersonModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleAddPerson} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Enter email"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Enter password"
                    required
                  />
                </div>
                
                {/* User Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">User Type</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, userType: 'client', role: 'client' })}
                      className={`flex items-center justify-center p-3 rounded-lg border-2 transition-colors ${
                        formData.userType === 'client'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-blue-200'
                      }`}
                    >
                      <User className="w-5 h-5 mr-2" />
                      <span>Client</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, userType: 'employee', role: 'employee' })}
                      className={`flex items-center justify-center p-3 rounded-lg border-2 transition-colors ${
                        formData.userType === 'employee'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-blue-200'
                      }`}
                    >
                      <Briefcase className="w-5 h-5 mr-2" />
                      <span>Employee</span>
                    </button>
                  </div>
                </div>

                {/* Role Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    required
                  >
                    {formData.userType === 'client' ? (
                      <>
                        <option value="client">Client</option>
                        <option value="head">Client Head</option>
                      </>
                    ) : (
                      <>
                        <option value="employee">Employee</option>
                        <option value="manager">Project Manager</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddPersonModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add Member
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-800">Confirm Deletion</h3>
                <button
                  onClick={() => setShowDeleteConfirmModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <p className="text-gray-700 mb-6">Are you sure you want to delete this project? This action cannot be undone.</p>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirmModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {showEditMemberModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Edit Member Role</h2>
              <button
                onClick={() => {
                  setShowEditMemberModal(false);
                  setEditingMember(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleUpdateMember} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  User Type
                </label>
                <select
                  value={formData.userType}
                  onChange={(e) => setFormData({ ...formData, userType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="client">Client</option>
                  <option value="employee">Employee</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  {formData.userType === 'client' ? (
                    <>
                      <option value="client">Client</option>
                      <option value="head">Client Head</option>
                    </>
                  ) : (
                    <>
                      <option value="employee">Employee</option>
                      <option value="manager">Project Manager</option>
                    </>
                  )}
                </select>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditMemberModal(false);
                    setEditingMember(null);
                  }}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Update Role
                </button>
              </div>
            </form>
          </div>
    </div>
      )}
    </>
  );
}

export default Projects; 