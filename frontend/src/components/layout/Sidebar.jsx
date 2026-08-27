import React, { useMemo } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiHome, FiCalendar, FiFileText, FiMessageSquare,
  FiUsers, FiSettings, FiBell, FiLogOut, FiActivity,
  FiShield, FiBarChart2, FiClipboard, FiHeart, FiAlertCircle,
  FiBook, FiStar, FiHelpCircle, FiChevronLeft, FiChevronRight,
  FiUser, FiDroplet, FiUpload
} from "react-icons/fi";
import { useAuthStore } from "../../store/authStore";
import { useUIStore } from "../../store/uiStore";
import { LogoIcon } from "../common/Logo";
import toast from "react-hot-toast";

// ── Patient Navigation ──
const patientNav = [
  { to: "/patient/dashboard", icon: FiHome,        label: "Home" },
  { to: "/doctors",           icon: FiUsers,        label: "Find Doctors" },
  { to: "/medical-records",   icon: FiFileText,     label: "Medical Records" },
  { to: "/prescriptions",     icon: FiClipboard,    label: "Prescriptions" },
  { to: "/lab-tests",         icon: FiDroplet,      label: "Lab Tests" },
  { to: "/upload-reports",    icon: FiUpload,       label: "Upload Reports" },
  { to: "/medicine-reminder", icon: FiHeart,        label: "Medicine Reminder" },
  { to: "/appointments",       icon: FiCalendar,     label: "My Appointments" },
  { to: "/emergency",         icon: FiAlertCircle,  label: "Emergency Support" },
  { to: "/chat",              icon: FiMessageSquare,label: "Messages" },
  { to: "/notifications",     icon: FiBell,         label: "Notifications" },
  { to: "/articles",          icon: FiBook,         label: "Health Articles" },
];

// ── Doctor Navigation ──
const doctorNav = [
  { to: "/doctor/dashboard",     icon: FiHome,         label: "Doctor Portal" },
  { to: "/doctor/appointments",  icon: FiCalendar,     label: "Appointments" },
  { to: "/doctor/profile",       icon: FiUser,         label: "My Profile" },
  { to: "/doctor/patients",      icon: FiUsers,        label: "My Patients" },
  { to: "/chat",                 icon: FiMessageSquare,label: "Messages" },
  { to: "/notifications",        icon: FiBell,         label: "Notifications" },
];

// ── Admin Navigation ──
const adminNav = [
  { to: "/admin/dashboard",      icon: FiHome,        label: "Admin Dashboard" },
  { to: "/admin/users",          icon: FiUsers,       label: "User Management" },
  { to: "/admin/verify-doctors", icon: FiShield,      label: "Doctor Verification" },
  { to: "/admin/analytics",      icon: FiBarChart2,   label: "Analytics" },
  { to: "/admin/logs",           icon: FiActivity,    label: "Activity Logs" },
  { to: "/feedback",             icon: FiStar,        label: "Feedback" },
  { to: "/notifications",        icon: FiBell,        label: "Notifications" },
];

const bottomNav = [
  { to: "/profile",  icon: FiUser,       label: "Profile" },
  { to: "/settings", icon: FiSettings,   label: "Settings" },
  { to: "/help",     icon: FiHelpCircle, label: "Help" },
];

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const { sidebarOpen, setSidebarOpen, toggleSidebar } = useUIStore();
  const navigate = useNavigate();

  // Normalize role to lowercase for strict comparison
  const role = (user?.role || "").trim().toLowerCase();

  // Explicitly select the correct navigation array
  const navItems = useMemo(() => {
    let items = [];

    // If role is doctor, strictly use doctorNav which has NO extras
    if (role === "doctor") {
      items = [...doctorNav];
    } else if (role === "admin") {
      items = [...adminNav];
    } else {
      items = [...patientNav];
    }

    // Force remove any remaining unwanted items
    if (role !== "patient") {
      return items.filter(item =>
        item.to !== "/unwanted-path" &&
        item.label !== "Unwanted Label"
      );
    }

    return items;
  }, [role]);

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    navigate("/login");
  };

  const handleNavClick = () => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <aside
        className={`fixed top-0 left-0 h-full bg-white border-r border-gray-100 shadow-xl z-50 flex flex-col transition-transform transition-all duration-300 ${
          sidebarOpen
            ? "translate-x-0 w-64"
            : "-translate-x-full lg:translate-x-0 lg:w-16"
        } lg:relative lg:z-auto`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 min-h-[64px]">
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex items-center gap-2.5"
              >
                <LogoIcon size={32} />
                <div className="flex flex-col">
                  <span className="font-heading font-bold text-sm text-primary-700 whitespace-nowrap">
                    SmartHealth-FINAL
                  </span>
                  <span className="text-[10px] text-green-600 font-bold">STABLE_BUILD_NO_AI</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors ml-auto"
          >
            {sidebarOpen ? <FiChevronLeft size={18} /> : <FiChevronRight size={18} />}
          </button>
        </div>

        {/* User Info Section */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-4 border-b border-gray-100"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-hero flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {user?.name?.charAt(0)?.toUpperCase() || "U"}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{user?.name || "User"}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    role === "doctor" ? "bg-secondary-100 text-secondary-700" :
                    role === "admin"  ? "bg-purple-100 text-purple-700" :
                    "bg-primary-100 text-primary-700"
                  }`}>
                    {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1) || "Patient"}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Navigation List */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 scrollbar-hide">
          <div className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                    isActive
                      ? "bg-primary-50 text-primary-600 font-bold"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`
                }
                title={!sidebarOpen ? item.label : undefined}
              >
                <item.icon size={18} className="flex-shrink-0" />
                <AnimatePresence>
                  {sidebarOpen && (
                    <motion.span
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -5 }}
                      className="whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Bottom Menu Items */}
        <div className="border-t border-gray-100 py-4 px-2 space-y-1">
          {bottomNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={handleNavClick}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive ? "bg-primary-50 text-primary-600" : "text-gray-600 hover:bg-gray-50"
                }`
              }
              title={!sidebarOpen ? item.label : undefined}
            >
              <item.icon size={18} className="flex-shrink-0" />
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </NavLink>
          ))}

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all duration-200"
            title={!sidebarOpen ? "Logout" : undefined}
          >
            <FiLogOut size={18} className="flex-shrink-0" />
            <AnimatePresence>
              {sidebarOpen && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  Logout
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </aside>
    </>
  );
}
