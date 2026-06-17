// ============================================================
// Semua TypeScript types/interfaces untuk Ilusa Ops Dashboard
// ============================================================

export type UserRole = 'Admin' | 'Manager' | 'Staff' | 'Client';
export type UserStatus = 'Active' | 'Inactive';
export type ClientStatus = 'Active' | 'Lead' | 'Churned' | 'Paused';
export type ProjectStatus = 'Briefing' | 'In Progress' | 'Review' | 'On Hold' | 'Completed' | 'Cancelled';
export type WorkItemStatus = 'Backlog' | 'To Do' | 'In Progress' | 'Review' | 'Blocked' | 'Done';
export type WorkItemPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type ActivityStatus = 'Draft' | 'Scheduled' | 'Active' | 'Paused' | 'Completed';
export type ActivityType = 'campaign' | 'creative_test' | 'content';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  client_code: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  owner_id?: string | null;
  status: ClientStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  // Joined field
  ownerName?: string;
}

export interface Project {
  id: string;
  client_id: string;
  project_code: string;
  project_name: string;
  project_type: string;
  owner_id?: string | null;
  assignee_id?: string | null;
  start_date: string;
  due_date: string;
  status: ProjectStatus | string;
  objective?: string;
  description?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface WorkItem {
  id: string;
  client_id?: string | null;
  project_id?: string | null;
  activity_id?: string | null;
  source_type: string;
  work_type: string;
  title: string;
  description?: string;
  assignee_id?: string | null;
  priority: WorkItemPriority;
  status: WorkItemStatus;
  start_date?: string | null;
  due_date?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface MarketingActivity {
  id: string;
  client_id: string;
  project_id: string;
  activity_type: ActivityType;
  title: string;
  owner_id?: string | null;
  status: ActivityStatus;
  start_date: string;
  end_date: string;
  channel: string;
  budget: number;
  ads_name?: string | null;
  targeting?: string | null;
  result_type?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface PerformanceEntry {
  id: string;
  activity_id: string;
  metric_date: string;
  spend: number;
  reach: number;
  impressions: number;
  clicks: number;
  results: number;
  revenue: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface AttendanceLog {
  id: string;
  user_id: string;
  clock_date: string;
  clock_in_time: string;
  created_at: string;
  updated_at: string;
  // Joined
  users?: Pick<User, 'name' | 'email' | 'role' | 'department'>;
}

export interface WeeklyReview {
  id: string;
  client_id: string;
  project_id?: string | null;
  review_date: string;
  facilitator_id: string;
  status: string;
  weekly_notes?: string;
  next_action?: string;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}
