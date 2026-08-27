import React from "react";
import { NavLink } from "react-router-dom";
import { FiHome, FiCalendar, FiMessageSquare, FiBell, FiUser } from "react-icons/fi";
import { useAuthStore } from "../../store/authStore";

export default function BottomNav() {
  const { user } = useAuthStore();

  const role = user?.role?.toLowerCase();
  const dashPath =
    role === "doctor" ? "/doctor/dashboard" :
    role === "admin"  ? "/admin/dashboard"  : "/patient/dashboard";

  const items = [
    { to: dashPath,       icon: FiHome,         label: "Home" },
    { to: role === "doctor" ? "/doctor/appointments" : "/doctors",
                          icon: FiCalendar,     label: role === "doctor" ? "Schedule" : "Doctors" },
    { to: "/chat",        icon: FiMessageSquare,label: "Chat" },
    { to: "/notifications",icon: FiBell,        label: "Alerts" },
    { to: "/profile",     icon: FiUser,         label: "Profile" },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-30 safe-area-pb">
      <div className="flex items-center justify-around py-2">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${
                isActive ? "text-primary-600" : "text-gray-400"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon size={20} className={isActive ? "text-primary-600" : ""} />
                <span className="text-xs font-medium">{item.label}</span>
                {isActive && (
                  <div className="w-1 h-1 rounded-full bg-primary-600 mt-0.5" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
