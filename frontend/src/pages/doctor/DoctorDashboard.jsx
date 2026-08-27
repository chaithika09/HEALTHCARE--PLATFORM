import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line
} from "recharts";
import { FiCalendar, FiUsers, FiStar, FiTrendingUp, FiClock, FiVideo, FiUser, FiArrowRight } from "react-icons/fi";
import { useAuthStore } from "../../store/authStore";
import { doctorAPI } from "../../services/api";

const weeklyData = [
  { day: "Mon", appointments: 8, patients: 7 },
  { day: "Tue", appointments: 12, patients: 10 },
  { day: "Wed", appointments: 6, patients: 6 },
  { day: "Thu", appointments: 15, patients: 13 },
  { day: "Fri", appointments: 10, patients: 9 },
  { day: "Sat", appointments: 4, patients: 4 },
  { day: "Sun", appointments: 2, patients: 2 },
];

const revenueData = [
  { month: "Jan", revenue: 4200 }, { month: "Feb", revenue: 5800 },
  { month: "Mar", revenue: 4900 }, { month: "Apr", revenue: 6200 },
  { month: "May", revenue: 7100 }, { month: "Jun", revenue: 6800 },
];

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };
const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };

export default function DoctorDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({
    todayAppointments: 0,
    totalPatients: 0,
    averageRating: 4.5,
    monthlyRevenue: "$0"
  });
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await doctorAPI.getDashboard();
        const { stats: fetchedStats, upcomingAppointments } = res.data.data;

        setStats({
          todayAppointments: fetchedStats.todayAppointments || 0,
          totalPatients: fetchedStats.totalPatients || 0,
          averageRating: fetchedStats.averageRating || 4.5,
          monthlyRevenue: `$${((fetchedStats.totalAppointments || 0) * 100 / 1000).toFixed(1)}K`
        });
        setAppointments(upcomingAppointments || []);
      } catch (err) {
        console.error("Failed to fetch doctor dashboard", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const statItems = [
    { label: "Today's Appointments", value: stats.todayAppointments.toString(), icon: FiCalendar, color: "bg-blue-50 text-blue-600", change: "Keep up the good work!" },
    { label: "Total Patients", value: stats.totalPatients.toString(), icon: FiUsers, color: "bg-green-50 text-green-600", change: "Trust builds health" },
    { label: "Average Rating", value: stats.averageRating.toString(), icon: FiStar, color: "bg-amber-50 text-amber-600", change: "Based on reviews" },
    { label: "Monthly Revenue", value: stats.monthlyRevenue, icon: FiTrendingUp, color: "bg-purple-50 text-purple-600", change: "Estimated earnings" },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900 dark:text-white">
            Good morning, {user?.name?.split(" ")[0] || "Doctor"} 👨‍⚕️
          </h1>
          <p className="text-gray-500 text-sm mt-1">You have {stats.todayAppointments} appointments today</p>
        </div>
        <div className="flex gap-3">
          <Link to="/doctor/appointments" className="btn-outline gap-2">
            <FiCalendar size={16} /> Schedule
          </Link>
          <Link to="/chat" className="btn-primary gap-2">
            Messages
          </Link>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statItems.map((s) => (
          <div key={s.label} className="card p-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color} mb-3`}>
              <s.icon size={20} />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
            <p className="text-sm text-gray-600 font-medium mt-0.5">{s.label}</p>
            <p className="text-xs text-gray-400 mt-1">{s.change}</p>
          </div>
        ))}
      </motion.div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div variants={fadeUp} className="card p-6">
          <h2 className="font-heading font-semibold text-gray-900 mb-1">Weekly Appointments</h2>
          <p className="text-xs text-gray-500 mb-5">This week's schedule overview</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyData} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", fontSize: "12px" }} />
              <Bar dataKey="appointments" fill="#0066CC" radius={[6, 6, 0, 0]} />
              <Bar dataKey="patients" fill="#00A86B" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div variants={fadeUp} className="card p-6">
          <h2 className="font-heading font-semibold text-gray-900 mb-1">Revenue Trend</h2>
          <p className="text-xs text-gray-500 mb-5">Monthly earnings overview</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v/1000}k`} />
              <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", fontSize: "12px" }} formatter={(v) => [`$${v}`, "Revenue"]} />
              <Line type="monotone" dataKey="revenue" stroke="#0066CC" strokeWidth={2.5} dot={{ fill: "#0066CC", r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Today's appointments */}
      <motion.div variants={fadeUp}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Upcoming Appointments</h2>
          <Link to="/doctor/appointments" className="text-sm text-primary-600 flex items-center gap-1">
            View all <FiArrowRight size={14} />
          </Link>
        </div>
        <div className="card overflow-hidden bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr className="dark:text-slate-400">
                  <th>Patient</th>
                  <th>Time</th>
                  <th>Type</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {appointments.length > 0 ? appointments.map((apt) => (
                  <tr key={apt._id} className="dark:border-slate-800">
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-hero flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {(apt.patient?.name || "P").split(" ").map((n) => n[0]).join("")}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white text-sm">{apt.patient?.name}</p>
                          <p className="text-xs text-gray-400">{new Date(apt.date).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="flex items-center gap-1 text-sm text-gray-600 dark:text-slate-400">
                        <FiClock size={12} /> {apt.timeSlot}
                      </span>
                    </td>
                    <td>
                      <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${apt.type === "video" ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30" : "bg-green-100 text-green-600 dark:bg-green-900/30"}`}>
                        {apt.type === "video" ? <FiVideo size={10} /> : <FiUser size={10} />}
                        {apt.type === "video" ? "Video" : "In-person"}
                      </span>
                    </td>
                    <td className="text-sm text-gray-600 dark:text-slate-400 truncate max-w-[150px]">{apt.symptoms || "Consultation"}</td>
                    <td>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${
                        apt.status === "upcoming" || apt.status === "confirmed" ? "bg-primary-100 text-primary-700" : "bg-green-100 text-green-700"
                      }`}>
                        {apt.status}
                      </span>
                    </td>
                    <td>
                      {apt.type === "video" ? (
                        <Link to={`/video-call/${apt._id}`} className="btn-primary btn-sm gap-1">
                          <FiVideo size={12} /> Join
                        </Link>
                      ) : (
                        <button className="btn-outline btn-sm">Start</button>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="6" className="text-center py-10 text-gray-400">
                      No upcoming appointments found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
