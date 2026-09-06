'use client';
import React, { useState } from 'react';
import { Shield, Users, Building2, Briefcase, GraduationCap, UserCheck, ClipboardList, Cpu, Plus, Save, Check, ChevronDown, ChevronRight, Search, Globe, Lock, Eye, Download, Settings, Info } from 'lucide-react';

type RoleId = 'super_admin' | 'institution_admin' | 'recruiter' | 'candidate' | 'placement_officer' | 'evaluator' | 'faculty' | 'org_admin';
type Tab = 'roles' | 'permissions' | 'tenants';

interface Role {
  id: RoleId;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  userCount: number;
  isSystem: boolean;
}

interface Permission {
  id: string;
  label: string;
  module: string;
}

interface PermissionModule {
  module: string;
  icon: React.ReactNode;
  permissions: Permission[];
}

interface Tenant {
  id: string;
  name: string;
  type: 'institution' | 'organization';
  plan: string;
  assignedRoles: RoleId[];
  users: number;
  status: 'active' | 'inactive';
}

const ROLES: Role[] = [
  { id: 'super_admin', name: 'Super Admin', description: 'Full platform-wide access and control', icon: <Shield size={18} />, color: 'bg-red-50 text-red-600 border-red-200', userCount: 3, isSystem: true },
  { id: 'institution_admin', name: 'Institution Admin', description: 'Manages an educational institution', icon: <GraduationCap size={18} />, color: 'bg-blue-50 text-blue-600 border-blue-200', userCount: 284, isSystem: true },
  { id: 'org_admin', name: 'Organization Admin', description: "Manages an organization's recruitment", icon: <Building2 size={18} />, color: 'bg-violet-50 text-violet-600 border-violet-200', userCount: 1203, isSystem: true },
  { id: 'recruiter', name: 'Recruiter', description: 'Conducts recruitment and evaluates candidates', icon: <Briefcase size={18} />, color: 'bg-teal-50 text-teal-600 border-teal-200', userCount: 4821, isSystem: true },
  { id: 'placement_officer', name: 'Placement Officer', description: 'Manages institutional placements and drives', icon: <UserCheck size={18} />, color: 'bg-amber-50 text-amber-600 border-amber-200', userCount: 892, isSystem: true },
  { id: 'evaluator', name: 'Evaluator', description: 'Conducts or reviews assessments and interviews', icon: <ClipboardList size={18} />, color: 'bg-orange-50 text-orange-600 border-orange-200', userCount: 1340, isSystem: true },
  { id: 'faculty', name: 'Faculty', description: 'Manages students, learning and placement prep', icon: <Cpu size={18} />, color: 'bg-indigo-50 text-indigo-600 border-indigo-200', userCount: 2107, isSystem: true },
  { id: 'candidate', name: 'Candidate', description: 'Takes assessments, interviews and applies for jobs', icon: <Users size={18} />, color: 'bg-green-50 text-green-600 border-green-200', userCount: 12847, isSystem: true },
];

const PERMISSION_MODULES: PermissionModule[] = [
  {
    module: 'Candidates',
    icon: <Users size={15} />,
    permissions: [
      { id: 'candidate.read', label: 'View Candidates', module: 'Candidates' },
      { id: 'candidate.create', label: 'Create Candidates', module: 'Candidates' },
      { id: 'candidate.update', label: 'Edit Candidates', module: 'Candidates' },
      { id: 'candidate.delete', label: 'Delete Candidates', module: 'Candidates' },
      { id: 'candidate.export', label: 'Export Candidates', module: 'Candidates' },
    ],
  },
  {
    module: 'Jobs',
    icon: <Briefcase size={15} />,
    permissions: [
      { id: 'job.read', label: 'View Jobs', module: 'Jobs' },
      { id: 'job.create', label: 'Create Jobs', module: 'Jobs' },
      { id: 'job.update', label: 'Edit Jobs', module: 'Jobs' },
      { id: 'job.publish', label: 'Publish Jobs', module: 'Jobs' },
      { id: 'job.delete', label: 'Delete Jobs', module: 'Jobs' },
    ],
  },
  {
    module: 'Interviews',
    icon: <ClipboardList size={15} />,
    permissions: [
      { id: 'interview.read', label: 'View Interviews', module: 'Interviews' },
      { id: 'interview.schedule', label: 'Schedule Interviews', module: 'Interviews' },
      { id: 'interview.conduct', label: 'Conduct Interviews', module: 'Interviews' },
      { id: 'interview.evaluate', label: 'Evaluate Interviews', module: 'Interviews' },
      { id: 'interview.delete', label: 'Delete Interviews', module: 'Interviews' },
    ],
  },
  {
    module: 'Assessments',
    icon: <Shield size={15} />,
    permissions: [
      { id: 'assessment.read', label: 'View Assessments', module: 'Assessments' },
      { id: 'assessment.create', label: 'Create Assessments', module: 'Assessments' },
      { id: 'assessment.assign', label: 'Assign Assessments', module: 'Assessments' },
      { id: 'assessment.evaluate', label: 'Evaluate Assessments', module: 'Assessments' },
      { id: 'assessment.delete', label: 'Delete Assessments', module: 'Assessments' },
    ],
  },
  {
    module: 'CRM',
    icon: <Globe size={15} />,
    permissions: [
      { id: 'crm.lead.read', label: 'View Leads', module: 'CRM' },
      { id: 'crm.lead.create', label: 'Create Leads', module: 'CRM' },
      { id: 'crm.deal.read', label: 'View Deals', module: 'CRM' },
      { id: 'crm.deal.create', label: 'Create Deals', module: 'CRM' },
      { id: 'crm.export', label: 'Export CRM Data', module: 'CRM' },
    ],
  },
  {
    module: 'Users & RBAC',
    icon: <Lock size={15} />,
    permissions: [
      { id: 'user.read', label: 'View Users', module: 'Users & RBAC' },
      { id: 'user.create', label: 'Create Users', module: 'Users & RBAC' },
      { id: 'user.update', label: 'Edit Users', module: 'Users & RBAC' },
      { id: 'user.delete', label: 'Delete Users', module: 'Users & RBAC' },
      { id: 'rbac.manage', label: 'Manage RBAC', module: 'Users & RBAC' },
    ],
  },
  {
    module: 'Billing',
    icon: <Download size={15} />,
    permissions: [
      { id: 'billing.read', label: 'View Billing', module: 'Billing' },
      { id: 'billing.manage', label: 'Manage Billing', module: 'Billing' },
      { id: 'billing.export', label: 'Export Invoices', module: 'Billing' },
    ],
  },
  {
    module: 'Analytics',
    icon: <Eye size={15} />,
    permissions: [
      { id: 'analytics.read', label: 'View Analytics', module: 'Analytics' },
      { id: 'analytics.export', label: 'Export Reports', module: 'Analytics' },
      { id: 'analytics.platform', label: 'Platform Analytics', module: 'Analytics' },
    ],
  },
  {
    module: 'Placements',
    icon: <UserCheck size={15} />,
    permissions: [
      { id: 'placement.read', label: 'View Placements', module: 'Placements' },
      { id: 'placement.manage', label: 'Manage Placements', module: 'Placements' },
      { id: 'placement.drive.create', label: 'Create Drives', module: 'Placements' },
    ],
  },
  {
    module: 'System',
    icon: <Settings size={15} />,
    permissions: [
      { id: 'system.audit', label: 'View Audit Logs', module: 'System' },
      { id: 'system.config', label: 'System Configuration', module: 'System' },
      { id: 'system.ai', label: 'AI Management', module: 'System' },
      { id: 'system.tenant', label: 'Tenant Management', module: 'System' },
    ],
  },
];

// Default permission sets per role
const DEFAULT_PERMISSIONS: Record<RoleId, string[]> = {
  super_admin: PERMISSION_MODULES.flatMap(m => m.permissions.map(p => p.id)),
  institution_admin: [
    'candidate.read', 'candidate.create', 'candidate.update', 'candidate.export',
    'job.read', 'interview.read', 'interview.schedule',
    'assessment.read', 'assessment.create', 'assessment.assign',
    'user.read', 'user.create', 'user.update',
    'analytics.read', 'analytics.export',
    'placement.read', 'placement.manage', 'placement.drive.create',
    'billing.read', 'system.audit',
  ],
  org_admin: [
    'candidate.read', 'candidate.create', 'candidate.update', 'candidate.export',
    'job.read', 'job.create', 'job.update', 'job.publish', 'job.delete',
    'interview.read', 'interview.schedule', 'interview.conduct', 'interview.evaluate',
    'assessment.read', 'assessment.create', 'assessment.assign', 'assessment.evaluate',
    'crm.lead.read', 'crm.lead.create', 'crm.deal.read', 'crm.deal.create', 'crm.export',
    'user.read', 'user.create', 'user.update',
    'analytics.read', 'analytics.export',
    'billing.read', 'billing.manage',
    'placement.read',
    'system.audit',
  ],
  recruiter: [
    'candidate.read', 'candidate.create', 'candidate.update', 'candidate.export',
    'job.read', 'job.create', 'job.update', 'job.publish',
    'interview.read', 'interview.schedule', 'interview.conduct', 'interview.evaluate',
    'assessment.read', 'assessment.create', 'assessment.assign', 'assessment.evaluate',
    'crm.lead.read', 'crm.lead.create', 'crm.deal.read', 'crm.deal.create',
    'analytics.read',
    'placement.read',
  ],
  placement_officer: [
    'candidate.read', 'candidate.update',
    'job.read',
    'interview.read', 'interview.schedule',
    'assessment.read', 'assessment.assign',
    'analytics.read',
    'placement.read', 'placement.manage', 'placement.drive.create',
    'system.audit',
  ],
  evaluator: [
    'candidate.read',
    'interview.read', 'interview.conduct', 'interview.evaluate',
    'assessment.read', 'assessment.evaluate',
    'analytics.read',
  ],
  faculty: [
    'candidate.read', 'candidate.create', 'candidate.update',
    'assessment.read', 'assessment.create', 'assessment.assign',
    'analytics.read',
    'placement.read',
  ],
  candidate: [],
};

const MOCK_TENANTS: Tenant[] = [
  { id: 't1', name: 'IIT Bombay', type: 'institution', plan: 'Enterprise', assignedRoles: ['institution_admin', 'faculty', 'placement_officer', 'candidate'], users: 4200, status: 'active' },
  { id: 't2', name: 'IIM Bangalore', type: 'institution', plan: 'Enterprise', assignedRoles: ['institution_admin', 'faculty', 'placement_officer', 'candidate'], users: 1800, status: 'active' },
  { id: 't3', name: 'Infosys', type: 'organization', plan: 'Enterprise', assignedRoles: ['org_admin', 'recruiter', 'evaluator'], users: 24, status: 'active' },
  { id: 't4', name: 'TCS', type: 'organization', plan: 'Enterprise', assignedRoles: ['org_admin', 'recruiter', 'evaluator'], users: 31, status: 'active' },
  { id: 't5', name: 'NIT Trichy', type: 'institution', plan: 'Pro', assignedRoles: ['institution_admin', 'faculty', 'placement_officer', 'candidate'], users: 3100, status: 'active' },
  { id: 't6', name: 'Wipro', type: 'organization', plan: 'Pro', assignedRoles: ['org_admin', 'recruiter'], users: 18, status: 'inactive' },
];

export default function RBACContent() {
  const [activeTab, setActiveTab] = useState<Tab>('roles');
  const [selectedRole, setSelectedRole] = useState<RoleId>('recruiter');
  const [permissions, setPermissions] = useState<Record<RoleId, string[]>>(DEFAULT_PERMISSIONS);
  const [expandedModules, setExpandedModules] = useState<string[]>(['Candidates', 'Jobs', 'Interviews', 'Assessments']);
  const [searchPerm, setSearchPerm] = useState('');
  const [tenants, setTenants] = useState<Tenant[]>(MOCK_TENANTS);
  const [editingTenant, setEditingTenant] = useState<string | null>(null);
  const [savedRoles, setSavedRoles] = useState<Set<RoleId>>(new Set());
  const [tenantSearch, setTenantSearch] = useState('');

  const selectedRoleData = ROLES.find(r => r.id === selectedRole)!;
  const rolePerms = permissions[selectedRole] || [];

  const togglePermission = (permId: string) => {
    if (selectedRole === 'super_admin') return;
    setPermissions(prev => {
      const current = prev[selectedRole] || [];
      const updated = current.includes(permId)
        ? current.filter(p => p !== permId)
        : [...current, permId];
      return { ...prev, [selectedRole]: updated };
    });
    setSavedRoles(prev => { const s = new Set(prev); s.delete(selectedRole); return s; });
  };

  const toggleModule = (module: string) => {
    setExpandedModules(prev =>
      prev.includes(module) ? prev.filter(m => m !== module) : [...prev, module]
    );
  };

  const toggleAllInModule = (module: PermissionModule) => {
    if (selectedRole === 'super_admin') return;
    const modulePerms = module.permissions.map(p => p.id);
    const allEnabled = modulePerms.every(p => rolePerms.includes(p));
    setPermissions(prev => {
      const current = prev[selectedRole] || [];
      const updated = allEnabled
        ? current.filter(p => !modulePerms.includes(p))
        : [...new Set([...current, ...modulePerms])];
      return { ...prev, [selectedRole]: updated };
    });
    setSavedRoles(prev => { const s = new Set(prev); s.delete(selectedRole); return s; });
  };

  const handleSaveRole = () => {
    setSavedRoles(prev => new Set([...prev, selectedRole]));
  };

  const toggleTenantRole = (tenantId: string, roleId: RoleId) => {
    setTenants(prev => prev.map(t => {
      if (t.id !== tenantId) return t;
      const has = t.assignedRoles.includes(roleId);
      return {
        ...t,
        assignedRoles: has
          ? t.assignedRoles.filter(r => r !== roleId)
          : [...t.assignedRoles, roleId],
      };
    }));
  };

  const filteredModules = PERMISSION_MODULES.map(m => ({
    ...m,
    permissions: m.permissions.filter(p =>
      !searchPerm || p.label.toLowerCase().includes(searchPerm.toLowerCase())
    ),
  })).filter(m => m.permissions.length > 0 || !searchPerm);

  const filteredTenants = tenants.filter(t =>
    !tenantSearch || t.name.toLowerCase().includes(tenantSearch.toLowerCase())
  );

  const TABS_CONFIG: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'roles', label: 'Roles', icon: <Shield size={15} /> },
    { id: 'permissions', label: 'Permission Matrix', icon: <Lock size={15} /> },
    { id: 'tenants', label: 'Tenant Assignment', icon: <Globe size={15} /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0D1B3E] flex items-center justify-center">
            <Shield size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-700 text-[#0D1B3E]">RBAC Management</h1>
            <p className="text-sm text-[#6B7A99]">Configure roles, assign granular permissions, and apply to tenants</p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#0D9488] text-white rounded-lg text-sm font-600 hover:bg-[#0b8276] transition-colors">
          <Plus size={15} />
          New Custom Role
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-[#DDE3EE] rounded-xl p-1 w-fit">
        {TABS_CONFIG.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={[
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-500 transition-all',
              activeTab === tab.id
                ? 'bg-[#0D1B3E] text-white shadow-sm'
                : 'text-[#6B7A99] hover:text-[#0D1B3E] hover:bg-[#F4F6FA]',
            ].join(' ')}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ROLES TAB */}
      {activeTab === 'roles' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {ROLES.map(role => (
            <div
              key={role.id}
              onClick={() => { setSelectedRole(role.id); setActiveTab('permissions'); }}
              className="bg-white border border-[#DDE3EE] rounded-xl p-5 cursor-pointer hover:border-[#0D9488] hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${role.color}`}>
                  {role.icon}
                </div>
                {role.isSystem && (
                  <span className="text-[10px] font-600 text-[#6B7A99] bg-[#F4F6FA] border border-[#DDE3EE] px-2 py-0.5 rounded-full">System</span>
                )}
              </div>
              <h3 className="font-700 text-[#0D1B3E] text-sm mb-1">{role.name}</h3>
              <p className="text-xs text-[#6B7A99] mb-4 leading-relaxed">{role.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#6B7A99]">
                  <span className="font-700 text-[#0D1B3E]">{role.userCount.toLocaleString()}</span> users
                </span>
                <span className="text-xs font-600 text-[#0D9488] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  Configure <ChevronRight size={12} />
                </span>
              </div>
              <div className="mt-3 pt-3 border-t border-[#F4F6FA]">
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 rounded-full bg-[#0D9488] flex-1" style={{ width: `${Math.min(100, (DEFAULT_PERMISSIONS[role.id].length / 40) * 100)}%` }} />
                  <span className="text-[10px] text-[#6B7A99]">{DEFAULT_PERMISSIONS[role.id].length} permissions</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PERMISSIONS TAB */}
      {activeTab === 'permissions' && (
        <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-5">
          {/* Role Selector */}
          <div className="bg-white border border-[#DDE3EE] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#DDE3EE]">
              <p className="text-xs font-700 text-[#6B7A99] uppercase tracking-wider">Select Role</p>
            </div>
            <div className="p-2 space-y-1">
              {ROLES.map(role => (
                <button
                  key={role.id}
                  onClick={() => setSelectedRole(role.id)}
                  className={[
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-left',
                    selectedRole === role.id
                      ? 'bg-[#0D1B3E] text-white'
                      : 'text-[#3D5A80] hover:bg-[#F4F6FA]',
                  ].join(' ')}
                >
                  <span className={selectedRole === role.id ? 'text-white' : ''}>{role.icon}</span>
                  <span className="font-500 flex-1">{role.name}</span>
                  <span className={`text-[10px] font-600 px-1.5 py-0.5 rounded-full ${selectedRole === role.id ? 'bg-white/20 text-white' : 'bg-[#F4F6FA] text-[#6B7A99]'}`}>
                    {(permissions[role.id] || []).length}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Permissions Panel */}
          <div className="bg-white border border-[#DDE3EE] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#DDE3EE] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${selectedRoleData.color}`}>
                  {selectedRoleData.icon}
                </div>
                <div>
                  <h3 className="font-700 text-[#0D1B3E] text-sm">{selectedRoleData.name}</h3>
                  <p className="text-xs text-[#6B7A99]">{rolePerms.length} of {PERMISSION_MODULES.flatMap(m => m.permissions).length} permissions enabled</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedRole === 'super_admin' && (
                  <span className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
                    <Info size={12} /> All permissions locked for Super Admin
                  </span>
                )}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7A99]" />
                  <input
                    type="text"
                    placeholder="Search permissions..."
                    value={searchPerm}
                    onChange={e => setSearchPerm(e.target.value)}
                    className="pl-8 pr-3 py-2 text-sm border border-[#DDE3EE] rounded-lg focus:outline-none focus:border-[#0D9488] w-48"
                  />
                </div>
                {savedRoles.has(selectedRole) ? (
                  <span className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg">
                    <Check size={12} /> Saved
                  </span>
                ) : (
                  <button
                    onClick={handleSaveRole}
                    disabled={selectedRole === 'super_admin'}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0D9488] text-white text-xs font-600 rounded-lg hover:bg-[#0b8276] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save size={12} /> Save Changes
                  </button>
                )}
              </div>
            </div>

            <div className="divide-y divide-[#F4F6FA] max-h-[600px] overflow-y-auto">
              {filteredModules.map(module => {
                const isExpanded = expandedModules.includes(module.module);
                const modulePerms = module.permissions.map(p => p.id);
                const enabledCount = modulePerms.filter(p => rolePerms.includes(p)).length;
                const allEnabled = enabledCount === modulePerms.length;
                const someEnabled = enabledCount > 0 && !allEnabled;

                return (
                  <div key={module.module}>
                    <div
                      className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-[#F9FAFB] transition-colors"
                      onClick={() => toggleModule(module.module)}
                    >
                      <button
                        onClick={e => { e.stopPropagation(); toggleAllInModule(module); }}
                        className={[
                          'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors shrink-0',
                          allEnabled ? 'bg-[#0D9488] border-[#0D9488]': someEnabled ?'bg-[#0D9488]/30 border-[#0D9488]': 'border-[#DDE3EE] bg-white',
                          selectedRole === 'super_admin' ? 'cursor-not-allowed' : 'cursor-pointer',
                        ].join(' ')}
                      >
                        {(allEnabled || someEnabled) && <Check size={11} className="text-white" />}
                      </button>
                      <span className="text-[#6B7A99]">{module.icon}</span>
                      <span className="font-600 text-sm text-[#0D1B3E] flex-1">{module.module}</span>
                      <span className="text-xs text-[#6B7A99]">{enabledCount}/{modulePerms.length}</span>
                      {isExpanded ? <ChevronDown size={14} className="text-[#6B7A99]" /> : <ChevronRight size={14} className="text-[#6B7A99]" />}
                    </div>

                    {isExpanded && (
                      <div className="bg-[#FAFBFC] border-t border-[#F4F6FA]">
                        {module.permissions.map(perm => {
                          const enabled = rolePerms.includes(perm.id);
                          return (
                            <div
                              key={perm.id}
                              onClick={() => togglePermission(perm.id)}
                              className={[
                                'flex items-center gap-3 px-5 py-2.5 cursor-pointer transition-colors',
                                selectedRole === 'super_admin' ? 'cursor-not-allowed' : 'hover:bg-[#F4F6FA]',
                              ].join(' ')}
                            >
                              <div className="w-5 h-5 shrink-0" />
                              <div
                                className={[
                                  'w-4 h-4 rounded border-2 flex items-center justify-center transition-colors shrink-0',
                                  enabled ? 'bg-[#0D9488] border-[#0D9488]' : 'border-[#DDE3EE] bg-white',
                                ].join(' ')}
                              >
                                {enabled && <Check size={10} className="text-white" />}
                              </div>
                              <span className="text-sm text-[#3D5A80] flex-1">{perm.label}</span>
                              <code className="text-[10px] text-[#6B7A99] bg-[#F4F6FA] px-2 py-0.5 rounded font-mono">{perm.id}</code>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TENANTS TAB */}
      {activeTab === 'tenants' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7A99]" />
              <input
                type="text"
                placeholder="Search tenants..."
                value={tenantSearch}
                onChange={e => setTenantSearch(e.target.value)}
                className="pl-8 pr-3 py-2 text-sm border border-[#DDE3EE] rounded-lg focus:outline-none focus:border-[#0D9488] w-64 bg-white"
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-[#6B7A99] bg-white border border-[#DDE3EE] px-3 py-2 rounded-lg">
              <Info size={13} />
              Click role chips to toggle assignment per tenant
            </div>
          </div>

          <div className="bg-white border border-[#DDE3EE] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#DDE3EE] bg-[#F9FAFB]">
                    <th className="text-left px-5 py-3 text-xs font-700 text-[#6B7A99] uppercase tracking-wider w-10">S.No</th>
                    <th className="text-left px-5 py-3 text-xs font-700 text-[#6B7A99] uppercase tracking-wider">Tenant</th>
                    <th className="text-left px-4 py-3 text-xs font-700 text-[#6B7A99] uppercase tracking-wider">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-700 text-[#6B7A99] uppercase tracking-wider">Plan</th>
                    <th className="text-left px-4 py-3 text-xs font-700 text-[#6B7A99] uppercase tracking-wider">Users</th>
                    <th className="text-left px-4 py-3 text-xs font-700 text-[#6B7A99] uppercase tracking-wider">Assigned Roles</th>
                    <th className="text-left px-4 py-3 text-xs font-700 text-[#6B7A99] uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4F6FA]">
                  {filteredTenants.map((tenant, idx) => (
                    <tr key={tenant.id} className="hover:bg-[#FAFBFC] transition-colors">
                      <td className="px-5 py-4 text-xs text-[#6B7A99] font-600">{idx + 1}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-700 ${tenant.type === 'institution' ? 'bg-blue-50 text-blue-600' : 'bg-violet-50 text-violet-600'}`}>
                            {tenant.name.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-600 text-sm text-[#0D1B3E]">{tenant.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`text-xs font-600 px-2 py-1 rounded-full border ${tenant.type === 'institution' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-violet-50 text-violet-700 border-violet-200'}`}>
                          {tenant.type === 'institution' ? 'Institution' : 'Organization'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`text-xs font-600 px-2 py-1 rounded-full border ${tenant.plan === 'Enterprise' ? 'bg-amber-50 text-amber-700 border-amber-200' : tenant.plan === 'Pro' ? 'bg-teal-50 text-teal-700 border-teal-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                          {tenant.plan}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-[#3D5A80] font-500">{tenant.users.toLocaleString()}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {ROLES.filter(r => r.id !== 'super_admin').map(role => {
                            const assigned = tenant.assignedRoles.includes(role.id);
                            return (
                              <button
                                key={role.id}
                                onClick={() => toggleTenantRole(tenant.id, role.id)}
                                className={[
                                  'text-[10px] font-600 px-2 py-1 rounded-full border transition-all',
                                  assigned
                                    ? 'bg-[#0D9488] text-white border-[#0D9488]'
                                    : 'bg-white text-[#6B7A99] border-[#DDE3EE] hover:border-[#0D9488] hover:text-[#0D9488]',
                                ].join(' ')}
                              >
                                {role.name.split(' ')[0]}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`text-xs font-600 px-2 py-1 rounded-full border ${tenant.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                          {tenant.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
