import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FiCalendar, FiVideo, FiUser, FiClock, FiSearch, FiMessageSquare } from "react-icons/fi";
import { doctorAPI, appointmentAPI, chatAPI } from "../../services/api";
import toast from "react-hot-toast";

const statusColors = {
  upcoming:  "bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400",
  completed: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  cancelled: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
};

export default function DoctorAppointments() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedDate, setSelectedDate] = useState("");
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const res = await doctorAPI.getAppointments();
      const raw = res.data.data.appointments || [];
      
      // Map appointments to display format
      const mapped = raw.map((a) => ({
        id: a._id,
        patientId: a.patient?._id,
        patient: a.patient?.name || "Patient",
        patientEmail: a.patient?.email || "",
        patientAvatar: (a.patient?.name || "P").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase(),
        age: a.patient?.age || "N/A",
        date: a.date?.split("T")[0] || a.date,
        time: a.timeSlot,
        type: a.type || "video",
        status: a.status === "confirmed" ? "upcoming" : a.status,
        reason: a.symptoms || "General consultation",
        confirmationId: a.confirmationId,
      }));

      // Sort by date and time
      mapped.sort((a, b) => new Date(a.date) - new Date(b.date));

      setAppointments(mapped);
    } catch (error) {
      console.error("Failed to fetch appointments:", error);
      toast.error("Failed to load appointments");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      // Map frontend status to backend status
      const backendStatus = newStatus === "upcoming" ? "confirmed" : newStatus;
      
      await appointmentAPI.update(id, { status: backendStatus });
      
      // Update local state
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
      );
      toast.success(`Appointment marked as ${newStatus}`);
      
      // Refresh appointments to get updated data
      fetchAppointments();
    } catch (error) {
      console.error("Failed to update appointment:", error);
      toast.error("Failed to update appointment");
    }
  };

  const handleMessagePatient = async (patientUserId) => {
    try {
      const res = await chatAPI.createOrGet({ participantId: patientUserId });
      if (res.data.success) {
        navigate(`/chat/${res.data.data.conversation._id}`);
      } else {
        toast.error("Could not open chat");
      }
    } catch (err) {
      toast.error("Could not open chat");
    }
  };

  const filtered = appointments.filter((a) => {
    const matchSearch = a.patient.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || a.status === filter;
    const matchDate = !selectedDate || a.date === selectedDate;
    return matchSearch && matchFilter && matchDate;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900 dark:text-white">Appointments</h1>
          <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">{filtered.length} appointments</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-48 relative">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="text" 
            placeholder="Search patients..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="input pl-10 dark:bg-slate-800 dark:border-slate-700 dark:text-white" 
          />
        </div>
        <input 
          type="date" 
          value={selectedDate} 
          onChange={(e) => setSelectedDate(e.target.value)} 
          className="input w-auto dark:bg-slate-800 dark:border-slate-700 dark:text-white" 
        />
        <div className="flex gap-2">
          {["all", "upcoming", "completed", "cancelled"].map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-full text-xs font-medium transition-all capitalize ${filter === f ? "bg-primary-500 text-white" : "bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400"}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          {/* Appointments */}
          <div className="space-y-3">
            {filtered.map((apt, i) => (
              <motion.div key={apt.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="card p-4 flex flex-col sm:flex-row sm:items-center gap-4 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {apt.patientAvatar}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{apt.patient}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">{apt.patientEmail}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{apt.reason}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="flex items-center gap-1 text-gray-500 dark:text-slate-400"><FiCalendar size={13} /> {apt.date}</span>
                  <span className="flex items-center gap-1 text-gray-500 dark:text-slate-400"><FiClock size={13} /> {apt.time}</span>
                  <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${apt.type === "video" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" : "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"}`}>
                    {apt.type === "video" ? <FiVideo size={10} /> : <FiUser size={10} />}
                    {apt.type === "video" ? "Video" : "In-person"}
                  </span>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[apt.status]}`}>
                    {apt.status}
                  </span>
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  {/* Message button — always visible */}
                  <button
                    onClick={() => handleMessagePatient(apt.patientId)}
                    className="btn-outline btn-sm gap-1 text-primary-600 border-primary-200 hover:bg-primary-50 dark:border-primary-800 dark:hover:bg-primary-900/20"
                    title="Message patient"
                  >
                    <FiMessageSquare size={12} /> Message
                  </button>

                  {apt.status === "upcoming" && (
                    <>
                      {apt.type === "video" && (
                        <Link to={`/video-call/${apt.id}`} className="btn-primary btn-sm gap-1">
                          <FiVideo size={12} /> Join Call
                        </Link>
                      )}
                      <button
                        onClick={() => handleStatusChange(apt.id, "completed")}
                        className="btn-outline btn-sm text-green-600 border-green-200 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-900/20"
                      >
                        Complete
                      </button>
                      <button
                        onClick={() => handleStatusChange(apt.id, "cancelled")}
                        className="btn-outline btn-sm text-red-500 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                  {apt.status === "completed" && (
                    <Link to="/doctor/patients" className="btn-ghost btn-sm text-primary-600 dark:text-primary-400">
                      Medical Records
                    </Link>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16">
              <span className="text-5xl">📅</span>
              <p className="text-gray-500 dark:text-slate-400 mt-4">No appointments found.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
