import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiCalendar, FiClock, FiVideo, FiUser, FiSearch,
  FiCheckCircle, FiXCircle, FiAlertCircle, FiRefreshCw, FiEye, FiX, FiMapPin, FiMessageSquare
} from "react-icons/fi";
import { appointmentAPI, chatAPI } from "../../services/api";
import { useAuthStore } from "../../store/authStore";
import toast from "react-hot-toast";

const STATUS_STYLES = {
  confirmed:  { bg: "bg-green-100 dark:bg-green-900/30",  text: "text-green-700 dark:text-green-400",  icon: FiCheckCircle,  label: "Confirmed"  },
  completed:  { bg: "bg-blue-100 dark:bg-blue-900/30",    text: "text-blue-700 dark:text-blue-400",    icon: FiCheckCircle,  label: "Completed"  },
  cancelled:  { bg: "bg-red-100 dark:bg-red-900/30",      text: "text-red-700 dark:text-red-400",      icon: FiXCircle,      label: "Cancelled"  },
  pending:    { bg: "bg-amber-100 dark:bg-amber-900/30",  text: "text-amber-700 dark:text-amber-400",  icon: FiAlertCircle,  label: "Pending"    },
  rescheduled:{ bg: "bg-purple-100 dark:bg-purple-900/30",text: "text-purple-700 dark:text-purple-400",icon: FiRefreshCw,    label: "Rescheduled"},
};

const gradients = [
  "from-blue-500 to-blue-700",
  "from-green-500 to-green-700",
  "from-purple-500 to-purple-700",
  "from-orange-500 to-orange-700",
  "from-pink-500 to-pink-700",
  "from-teal-500 to-teal-700",
];

export default function AppointmentHistory() {
  const { user } = useAuthStore();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [selectedApt, setSelectedApt] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        // Try to get from API first
        const res = await appointmentAPI.getAll();
        const raw = res.data.data.appointments || [];
        
        // Map API appointments properly
        const mapped = raw.map((a) => {
          // Get doctor info from populated doctor field
          const doctorData = a.doctor;
          const doctorName = doctorData?.user?.name || doctorData?.name || "Doctor";
          
          return {
            _id: a._id,
            doctorUserId: doctorData?.user?._id || doctorData?._id,
            doctorName: doctorName,
            specialty: doctorData?.specialty || "Specialist",
            avatar: doctorName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase(),
            date: a.date?.split("T")[0] || a.date,
            timeSlot: a.timeSlot,
            type: a.type || "video",
            status: a.status || "confirmed",
            symptoms: a.symptoms || "",
            confirmationId: a.confirmationId || "APT-" + a._id?.slice(-5).toUpperCase(),
          };
        });

        // Load from localStorage as fallback
        const localApts = JSON.parse(localStorage.getItem("myAppointments") || "[]");

        // Merge: prefer API data, fallback to local
        const merged = [...mapped, ...localApts];
        const unique = Array.from(new Map(merged.map(a => [a._id, a])).values());
        
        setAppointments(unique);
      } catch (error) {
        console.error("Failed to fetch appointments:", error);
        // API failed — use localStorage only
        const localApts = JSON.parse(localStorage.getItem("myAppointments") || "[]");
        setAppointments(localApts);
      } finally {
        setLoading(false);
      }
    };
    fetchAppointments();
  }, [user]);

  const handleViewDetails = (apt) => {
    setSelectedApt(apt);
    setShowDetailsModal(true);
  };

  const handleCancelAppointment = async (aptId) => {
    if (!window.confirm("Are you sure you want to cancel this appointment?")) return;
    
    setCancelling(true);
    try {
      await appointmentAPI.cancel(aptId);
      // Update local state
      setAppointments(prev => prev.map(a => a._id === aptId ? { ...a, status: "cancelled" } : a));
      // Update localStorage
      const localApts = JSON.parse(localStorage.getItem("myAppointments") || "[]");
      localStorage.setItem("myAppointments", JSON.stringify(
        localApts.map(a => a._id === aptId ? { ...a, status: "cancelled" } : a)
      ));
      toast.success("Appointment cancelled successfully");
      setShowDetailsModal(false);
    } catch (err) {
      toast.error("Failed to cancel appointment");
    } finally {
      setCancelling(false);
    }
  };

  const handleMessageDoctor = async (doctorUserId) => {
    if (!doctorUserId) { toast("Doctor info not available", { icon: "⚠️" }); return; }
    try {
      const res = await chatAPI.createOrGet({ participantId: doctorUserId });
      if (res.data.success) {
        window.location.href = `/chat/${res.data.data.conversation._id}`;
      } else {
        toast.error("Could not open chat");
      }
    } catch (err) {
      toast.error("Could not open chat");
    }
  };

  const filtered = appointments.filter((a) => {
    const matchSearch =
      a.doctorName.toLowerCase().includes(search.toLowerCase()) ||
      a.specialty.toLowerCase().includes(search.toLowerCase()) ||
      a.confirmationId.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || a.status === filterStatus;
    const matchType   = filterType   === "all" || a.type   === filterType;
    return matchSearch && matchStatus && matchType;
  });

  const stats = {
    total:     appointments.length,
    upcoming:  appointments.filter(a => a.status === "confirmed" || a.status === "pending").length,
    completed: appointments.filter(a => a.status === "completed").length,
    cancelled: appointments.filter(a => a.status === "cancelled").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900 dark:text-white">
            My Appointments
          </h1>
          <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">
            All your appointment history in one place
          </p>
        </div>
        <Link to="/doctors" className="btn-primary btn-sm gap-1.5">
          <FiCalendar size={14} /> Book New
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total",     value: stats.total,     color: "bg-gray-50 dark:bg-slate-800",    text: "text-gray-900 dark:text-white" },
          { label: "Upcoming",  value: stats.upcoming,  color: "bg-blue-50 dark:bg-blue-900/20",  text: "text-blue-700 dark:text-blue-400" },
          { label: "Completed", value: stats.completed, color: "bg-green-50 dark:bg-green-900/20",text: "text-green-700 dark:text-green-400" },
          { label: "Cancelled", value: stats.cancelled, color: "bg-red-50 dark:bg-red-900/20",    text: "text-red-700 dark:text-red-400" },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl p-4 ${s.color}`}>
            <p className={`text-2xl font-bold ${s.text}`}>{s.value}</p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
          <input
            type="text"
            placeholder="Search by doctor, specialty or ref ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input w-auto dark:bg-slate-800 dark:border-slate-700 dark:text-white cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="pending">Pending</option>
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="input w-auto dark:bg-slate-800 dark:border-slate-700 dark:text-white cursor-pointer"
          >
            <option value="all">All Types</option>
            <option value="video">Video</option>
            <option value="in-person">In-Person</option>
          </select>
        </div>
      </div>

      {/* Appointment cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <span className="text-5xl">📅</span>
          <p className="text-gray-500 dark:text-slate-400 mt-4 font-medium">No appointments found</p>
          <Link to="/doctors" className="btn-primary mt-4 inline-flex gap-2">
            <FiCalendar size={16} /> Book Your First Appointment
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((apt, i) => {
            const s = STATUS_STYLES[apt.status] || STATUS_STYLES.pending;
            const StatusIcon = s.icon;
            const isUpcoming = apt.status === "confirmed" || apt.status === "pending";

            return (
              <motion.div
                key={apt._id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="card p-5 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradients[i % gradients.length]} flex items-center justify-center text-white font-bold text-lg flex-shrink-0`}>
                    {apt.avatar}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{apt.doctorName}</p>
                        <p className="text-sm text-primary-600 dark:text-primary-400 font-medium">{apt.specialty}</p>
                      </div>
                      {/* Status badge */}
                      <span className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${s.bg} ${s.text}`}>
                        <StatusIcon size={12} />
                        {s.label}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500 dark:text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <FiCalendar size={13} />
                        {apt.date}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <FiClock size={13} />
                        {apt.timeSlot}
                      </span>
                      <span className="flex items-center gap-1.5">
                        {apt.type === "video" ? <FiVideo size={13} /> : <FiUser size={13} />}
                        {apt.type === "video" ? "Video Call" : "In-Person"}
                      </span>
                    </div>

                    {apt.symptoms && (
                      <p className="mt-2 text-xs text-gray-400 dark:text-slate-500 truncate">
                        📝 {apt.symptoms}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-slate-800">
                      <span className="text-xs text-gray-400 dark:text-slate-500 font-mono">
                        Ref: {apt.confirmationId}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewDetails(apt)}
                          className="text-xs font-semibold text-primary-600 hover:text-primary-700 px-3 py-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors flex items-center gap-1"
                        >
                          <FiEye size={11} /> View
                        </button>
                        <button
                          onClick={() => handleMessageDoctor(apt.doctorUserId)}
                          className="text-xs font-semibold text-green-600 hover:text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors flex items-center gap-1"
                        >
                          <FiMessageSquare size={11} /> Message
                        </button>
                        {isUpcoming && apt.type === "video" && (
                          <Link
                            to={`/video-call/${apt._id}`}
                            className="text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                          >
                            <FiVideo size={11} /> Join Call
                          </Link>
                        )}
                        {isUpcoming && (
                          <button
                            onClick={() => handleCancelAppointment(apt._id)}
                            className="text-xs font-semibold text-red-600 hover:text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-1"
                          >
                            <FiX size={11} /> Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Details Modal */}
      <AnimatePresence>
        {showDetailsModal && selectedApt && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDetailsModal(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-br from-primary-600 to-primary-700 text-white p-6 rounded-t-3xl">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-2xl font-bold">Appointment Details</h2>
                      <p className="text-primary-100 text-sm mt-1">Ref: {selectedApt.confirmationId}</p>
                    </div>
                    <button
                      onClick={() => setShowDetailsModal(false)}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <FiX size={20} />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                  {/* Doctor Info */}
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-xl`}>
                      {selectedApt.avatar}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white text-lg">{selectedApt.doctorName}</p>
                      <p className="text-primary-600 dark:text-primary-400 font-medium">{selectedApt.specialty}</p>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { icon: FiCalendar, label: "Date", value: selectedApt.date },
                      { icon: FiClock, label: "Time", value: selectedApt.timeSlot },
                      { icon: selectedApt.type === "video" ? FiVideo : FiMapPin, label: "Type", value: selectedApt.type === "video" ? "Video Call" : "In-Person Visit" },
                      { icon: STATUS_STYLES[selectedApt.status]?.icon || FiAlertCircle, label: "Status", value: STATUS_STYLES[selectedApt.status]?.label || "Unknown" },
                    ].map(({ icon: Icon, label, value }) => (
                      <div key={label} className="p-4 bg-gray-50 dark:bg-slate-800 rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                          <Icon size={14} className="text-gray-400" />
                          <span className="text-xs text-gray-500 dark:text-slate-400 font-medium">{label}</span>
                        </div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Symptoms */}
                  {selectedApt.symptoms && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                      <p className="text-xs text-blue-700 dark:text-blue-400 font-semibold mb-2">📝 Symptoms</p>
                      <p className="text-sm text-gray-700 dark:text-slate-300">{selectedApt.symptoms}</p>
                    </div>
                  )}

                  {/* Actions */}
                  {(selectedApt.status === "confirmed" || selectedApt.status === "pending") && (
                    <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
                      {selectedApt.type === "video" && (
                        <Link
                          to={`/video-call/${selectedApt._id}`}
                          className="flex-1 btn-primary justify-center gap-2"
                          onClick={() => setShowDetailsModal(false)}
                        >
                          <FiVideo size={16} /> Join Video Call
                        </Link>
                      )}
                      <button
                        onClick={() => handleCancelAppointment(selectedApt._id)}
                        disabled={cancelling}
                        className="flex-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {cancelling ? "Cancelling..." : <><FiX size={16} /> Cancel Appointment</>}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
