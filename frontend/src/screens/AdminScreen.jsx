import { useState, useEffect } from "react";
import { ArrowLeft, Users, MessageSquare, BarChart3, Flag, Shield, RefreshCw, Trash2, Ban, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { axiosInstance } from "../lib/axios.js";

function StatCard({ label, value, icon: Icon, color = "primary" }) {
  return (
    <div className="bg-base-200 border border-base-300 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-base-content/40 font-medium uppercase tracking-wide">{label}</p>
        <div className={`w-8 h-8 rounded-xl bg-${color}/15 flex items-center justify-center`}>
          <Icon size={16} className={`text-${color}`} />
        </div>
      </div>
      <p className="text-2xl font-bold text-base-content">{value ?? "—"}</p>
    </div>
  );
}

function Dashboard({ data }) {
  if (!data) return <div className="flex justify-center pt-20"><span className="loading loading-ring loading-lg text-primary" /></div>;

  const { stats, topUsers, hourlyStats } = data;

  const chartData = Array.from({ length: 24 }, (_, h) => ({
    hour: `${h}:00`,
    messages: hourlyStats.find((s) => s._id === h)?.count ?? 0,
  }));

  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total users"    value={stats.totalUsers}    icon={Users}          color="primary" />
        <StatCard label="Online now"     value={stats.onlineCount}   icon={Shield}         color="success" />
        <StatCard label="Messages today" value={stats.todayMessages} icon={MessageSquare}  color="warning" />
        <StatCard label="Pending reports" value={stats.pendingReports} icon={Flag}         color="error"   />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-base-200 border border-base-300 rounded-2xl p-4 text-center">
          <p className="text-xs text-base-content/40 mb-1">This week</p>
          <p className="text-xl font-bold">{stats.weekMessages}</p>
        </div>
        <div className="bg-base-200 border border-base-300 rounded-2xl p-4 text-center">
          <p className="text-xs text-base-content/40 mb-1">This month</p>
          <p className="text-xl font-bold">{stats.monthMessages}</p>
        </div>
        <div className="bg-base-200 border border-base-300 rounded-2xl p-4 text-center">
          <p className="text-xs text-base-content/40 mb-1">Total messages</p>
          <p className="text-xl font-bold">{stats.totalMessages}</p>
        </div>
      </div>

      <div className="bg-base-200 border border-base-300 rounded-2xl p-4">
        <p className="font-semibold text-base-content mb-4">Messages per hour (today)</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData}>
            <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={3} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip
              contentStyle={{ background: "var(--b2)", border: "1px solid var(--b3)", borderRadius: 8, fontSize: 12 }}
            />
            <Bar dataKey="messages" fill="#e85d3a" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-base-200 border border-base-300 rounded-2xl p-4">
        <p className="font-semibold text-base-content mb-3">Top 10 active users</p>
        <div className="space-y-2">
          {topUsers.map((u, i) => (
            <div key={u._id} className="flex items-center gap-3">
              <span className="text-xs text-base-content/40 w-5">{i + 1}</span>
              <div className="w-7 h-7 rounded-full overflow-hidden bg-base-300 flex-shrink-0">
                {u.user.profilePic
                  ? <img src={u.user.profilePic} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-xs font-bold">{u.user.fullName?.[0]}</div>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-base-content truncate">{u.user.fullName}</p>
              </div>
              <span className="text-sm font-bold text-primary">{u.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function UsersTable() {
  const [users, setUsers]   = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage]     = useState(1);
  const [total, setTotal]   = useState(0);
  const [pages, setPages]   = useState(1);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await axiosInstance.get(`/admin/users?search=${encodeURIComponent(search)}&page=${page}&limit=15`);
      setUsers(data.users);
      setTotal(data.total);
      setPages(data.pages);
    } catch { toast.error("Failed to load users"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [search, page]);

  const toggle = async (user, field) => {
    try {
      await axiosInstance.patch(`/admin/users/${user._id}`, { [field]: !user[field] });
      toast.success("Updated");
      load();
    } catch { toast.error("Failed"); }
  };

  const del = async (user) => {
    if (!confirm(`Delete ${user.fullName}?`)) return;
    try {
      await axiosInstance.delete(`/admin/users/${user._id}`);
      toast.success("Deleted");
      load();
    } catch { toast.error("Failed"); }
  };

  return (
    <div className="p-6 space-y-4">
      <input
        value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        placeholder="Search by name or email…"
        className="input input-bordered w-full max-w-sm bg-base-200 border-base-300 text-sm focus:border-primary focus:outline-none"
      />
      <div className="overflow-x-auto rounded-xl border border-base-300">
        <table className="table table-sm w-full">
          <thead>
            <tr className="text-base-content/50 text-xs">
              <th>User</th><th>Email</th><th>Joined</th><th>Status</th><th>Admin</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-8"><span className="loading loading-spinner loading-sm text-primary" /></td></tr>
            ) : users.map((u) => (
              <tr key={u._id} className={`${u.isBlocked ? "opacity-50" : ""}`}>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full overflow-hidden bg-base-300">
                      {u.profilePic ? <img src={u.profilePic} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs">{u.fullName?.[0]}</div>}
                    </div>
                    <span className="text-sm font-medium">{u.fullName}</span>
                    {u.emailVerified && <span className="text-primary text-xs">✓</span>}
                  </div>
                </td>
                <td className="text-xs text-base-content/60">{u.email}</td>
                <td className="text-xs text-base-content/50">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td>
                  <span className={`badge badge-xs ${u.isBlocked ? "badge-error" : "badge-success"}`}>
                    {u.isBlocked ? "Blocked" : "Active"}
                  </span>
                </td>
                <td>
                  <span className={`badge badge-xs ${u.isAdmin ? "badge-warning" : "badge-ghost"}`}>
                    {u.isAdmin ? "Admin" : "User"}
                  </span>
                </td>
                <td>
                  <div className="flex gap-1">
                    <button onClick={() => toggle(u, "isBlocked")} className={`btn btn-xs ${u.isBlocked ? "btn-success" : "btn-warning"}`} title={u.isBlocked ? "Unblock" : "Block"}>
                      {u.isBlocked ? <CheckCircle size={12} /> : <Ban size={12} />}
                    </button>
                    <button onClick={() => toggle(u, "isAdmin")} className="btn btn-xs btn-ghost" title="Toggle admin">
                      <Shield size={12} />
                    </button>
                    <button onClick={() => del(u)} className="btn btn-xs btn-error" title="Delete">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-sm text-base-content/50">
        <span>{total} total users</span>
        <div className="flex gap-1">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="btn btn-xs btn-ghost">‹</button>
          <span className="px-2">{page}/{pages}</span>
          <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="btn btn-xs btn-ghost">›</button>
        </div>
      </div>
    </div>
  );
}

function ReportsView() {
  const [reports, setReports]   = useState([]);
  const [statusFilter, setStatus] = useState("pending");
  const [loading, setLoading]   = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await axiosInstance.get(`/admin/reports?status=${statusFilter}`);
      setReports(data.reports);
    } catch { toast.error("Failed"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [statusFilter]);

  const update = async (id, status) => {
    try {
      await axiosInstance.patch(`/admin/reports/${id}`, { status });
      toast.success("Updated");
      load();
    } catch { toast.error("Failed"); }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex gap-2">
        {["pending", "resolved", "dismissed"].map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={`btn btn-sm ${statusFilter === s ? "btn-primary" : "btn-ghost"}`}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="flex justify-center pt-10"><span className="loading loading-ring loading-md text-primary" /></div>
      ) : reports.length === 0 ? (
        <p className="text-center text-base-content/40 text-sm py-10">No {statusFilter} reports</p>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div key={r._id} className="bg-base-200 border border-base-300 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-base-content">
                    <span className="text-base-content/50">From:</span> {r.reporterId?.fullName}
                  </p>
                  <p className="text-xs text-base-content/50 mt-0.5">
                    {r.targetType} · {r.reason.replace(/_/g, " ")}
                  </p>
                  {r.description && <p className="text-sm text-base-content/70 mt-1">{r.description}</p>}
                  <p className="text-xs text-base-content/30 mt-1">{new Date(r.createdAt).toLocaleString()}</p>
                </div>
                {r.status === "pending" && (
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => update(r._id, "resolved")} className="btn btn-xs btn-success">Resolve</button>
                    <button onClick={() => update(r._id, "dismissed")} className="btn btn-xs btn-ghost">Dismiss</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "users",     label: "Users",     icon: Users },
  { id: "reports",   label: "Reports",   icon: Flag },
];

export default function AdminScreen() {
  const [tab, setTab]       = useState("dashboard");
  const [dashData, setDash] = useState(null);
  const navigate = useNavigate();

  const loadDash = async () => {
    try {
      const { data } = await axiosInstance.get("/admin/dashboard");
      setDash(data);
    } catch { toast.error("Failed to load dashboard"); }
  };

  useEffect(() => {
    if (tab === "dashboard") loadDash();
  }, [tab]);

  return (
    <div className="min-h-screen bg-base-100 flex flex-col">
      <div className="px-4 py-3 border-b border-base-300 bg-base-200 flex items-center gap-3 flex-shrink-0">
        <button onClick={() => navigate("/")} className="btn btn-ghost btn-circle btn-sm">
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-primary" />
          <h1 className="font-bold text-base-content">Admin Panel</h1>
        </div>
        {tab === "dashboard" && (
          <button onClick={loadDash} className="btn btn-ghost btn-circle btn-sm ml-auto">
            <RefreshCw size={14} />
          </button>
        )}
      </div>

      <div className="flex border-b border-base-300 bg-base-200 flex-shrink-0 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
              tab === id ? "text-primary border-b-2 border-primary" : "text-base-content/50 hover:text-base-content"
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === "dashboard" && <Dashboard data={dashData} />}
        {tab === "users"     && <UsersTable />}
        {tab === "reports"   && <ReportsView />}
      </div>
    </div>
  );
}
