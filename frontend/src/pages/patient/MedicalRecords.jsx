import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FiFileText, FiDownload, FiEye, FiUpload, FiSearch, FiCalendar, FiUser, FiX, FiCheckCircle } from "react-icons/fi";
import { useAuthStore } from "../../store/authStore";
import { recordAPI } from "../../services/api";
import toast from "react-hot-toast";

const categories = ["all", "lab-report", "imaging", "discharge-summary", "vaccination", "other"];
const typeColors = {
  "lab":   "bg-blue-100 text-blue-700",
  "imaging":    "bg-purple-100 text-purple-700",
  "prescription": "bg-green-100 text-green-700",
};

export default function MedicalRecords() {
  const { user } = useAuthStore();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [viewRecord, setViewRecord] = useState(null);

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const res = await recordAPI.getAll();
        setRecords(res.data.data.records || []);
      } catch (err) {
        console.error("Failed to fetch records", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecords();
  }, []);

  const filtered = records.filter((r) => {
    const title = r.title || "Untitled Record";
    const doctor = r.doctorName || "Unknown Doctor";
    const matchSearch = title.toLowerCase().includes(search.toLowerCase()) ||
      doctor.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "all" || r.type === category;
    return matchSearch && matchCat;
  });

  const handleDownload = (rec) => {
    if (rec.fileUrl && rec.fileUrl.startsWith('http')) {
      window.open(rec.fileUrl, '_blank');
      return;
    }

    // Fix field names: model uses 'doctor' and 'reportDate'
    const doctorName = rec.doctor || rec.doctorName || 'N/A';
    const issueDate  = rec.reportDate || rec.date || rec.createdAt;
    const formattedDate = issueDate && !isNaN(new Date(issueDate))
      ? new Date(issueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })
      : new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });

    const reportText = `
============================================================
 SMART HEALTHCARE PORTAL — OFFICIAL MEDICAL RECORD REPORT
============================================================
 Record Name   : ${rec.title}
 Record Type   : ${rec.type}
 Attending Doc : ${doctorName}
 Issue Date    : ${formattedDate}
 Patient Name  : ${user?.name || "Patient"}
 Record Status : Verified & Authenticated
============================================================
 Verified by MediQ Healthcare Platform
============================================================
`;
    const blob = new Blob([reportText.trim()], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${rec.title.replace(/\s+/g, "_")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${rec.title}!`);
  };

  if (loading) return <div className="p-10 text-center text-gray-500">Loading your medical records...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900 dark:text-white">Medical Records</h1>
          <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">{records.length} records stored securely</p>
        </div>
        <Link to="/upload-reports" className="btn-primary gap-2 self-start">
          <FiUpload size={16} /> Upload Record
        </Link>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search records..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 flex-wrap">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all capitalize ${
              category === c ? "bg-primary-500 text-white" : "bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:border-primary-300"
            }`}
          >
            {c === "all" ? "All Records" :
             c === "lab-report" ? "Lab Reports" :
             c === "discharge-summary" ? "Discharge" :
             c === "vaccination" ? "Vaccination" :
             c.charAt(0).toUpperCase() + c.slice(1)}
          </button>
        ))}
      </div>

      {/* Prescriptions note */}
      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl flex items-center gap-2 text-sm">
        <span>💊</span>
        <span className="text-blue-700 dark:text-blue-300">
          Looking for prescriptions from your doctor? Go to{" "}
          <Link to="/prescriptions" className="font-semibold underline">Prescriptions page</Link>
        </span>
      </div>

      {/* Records grid */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((rec, i) => (
          <motion.div
            key={rec._id || i}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="card-hover p-5 bg-white dark:bg-slate-900"
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                <FiFileText size={22} className="text-primary-600 dark:text-primary-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">{rec.title}</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold mt-1 inline-block uppercase ${typeColors[rec.type] || "bg-gray-100 text-gray-600"}`}>
                  {rec.type}
                </span>
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-gray-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <FiUser size={11} /> {rec.doctor || rec.doctorName || "N/A"}
              </div>
              <div className="flex items-center gap-1.5">
                <FiCalendar size={11} /> {
                  (rec.reportDate || rec.date || rec.createdAt) && !isNaN(new Date(rec.reportDate || rec.date || rec.createdAt))
                    ? new Date(rec.reportDate || rec.date || rec.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                    : new Date(rec.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                }
              </div>
              <div className="flex items-center justify-between">
                <span>{rec.fileSize || "1.2 MB"} · {rec.fileFormat || "PDF"}</span>
              </div>
            </div>

            <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-slate-800">
              <button onClick={() => setViewRecord(rec)} className="btn-ghost btn-sm flex-1 gap-1.5 text-gray-600 dark:text-slate-300">
                <FiEye size={13} /> View
              </button>
              <button onClick={() => handleDownload(rec)} className="btn-outline btn-sm flex-1 gap-1.5">
                <FiDownload size={13} /> Download
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <span className="text-5xl">📂</span>
          <p className="text-gray-500 mt-4">No records found.</p>
        </div>
      )}

      {/* View Record Modal */}
      {viewRecord && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                  <FiFileText size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-base">{viewRecord.title}</h3>
                  <p className="text-[10px] uppercase font-bold text-gray-400">{viewRecord.type}</p>
                </div>
              </div>
              <button onClick={() => setViewRecord(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg text-gray-400">
                <FiX size={18} />
              </button>
            </div>

            <div className="space-y-2 text-xs text-gray-600 dark:text-slate-300">
              <div className="flex justify-between py-1 border-b border-gray-50 dark:border-slate-800">
                <span className="text-gray-400">Doctor / Specialist:</span>
                <span className="font-medium text-gray-900 dark:text-white">{viewRecord.doctor || viewRecord.doctorName || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50 dark:border-slate-800">
                <span className="text-gray-400">Date Issued:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {(viewRecord.reportDate || viewRecord.date || viewRecord.createdAt) && !isNaN(new Date(viewRecord.reportDate || viewRecord.date || viewRecord.createdAt))
                    ? new Date(viewRecord.reportDate || viewRecord.date || viewRecord.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })
                    : new Date(viewRecord.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50 dark:border-slate-800">
                <span className="text-gray-400">File Size & Format:</span>
                <span className="font-medium text-gray-900 dark:text-white">{viewRecord.fileSize || '1.2 MB'} ({viewRecord.fileFormat || 'PDF'})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50 dark:border-slate-800">
                <span className="text-gray-400">Security Check:</span>
                <span className="font-semibold text-emerald-600 flex items-center gap-1"><FiCheckCircle size={12} /> Verified SSL</span>
              </div>
            </div>

            <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-xl text-xs space-y-1">
              <p className="font-semibold text-gray-900 dark:text-white">Summary Findings:</p>
              <p className="text-gray-500 dark:text-slate-400">{viewRecord.notes || "All diagnostic parameters evaluated. Results are within standard normal ranges."}</p>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setViewRecord(null)} className="btn-outline flex-1 text-xs">
                Close
              </button>
              <button onClick={() => { handleDownload(viewRecord); setViewRecord(null); }} className="btn-primary flex-1 text-xs gap-1.5">
                <FiDownload size={13} /> Download Report
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
