import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FiArrowRight, FiShield, FiVideo, FiFileText, FiCpu, FiAlertCircle, FiCheckCircle, FiStar, FiActivity } from "react-icons/fi";
import Logo from "../components/common/Logo";
import { useAuthStore } from "../store/authStore";

const features = [
  { icon: FiVideo,     color: "bg-indigo-50 text-indigo-600",title: "HD Consultations",   desc: "Face-to-face virtual visits with top specialists" },
  { icon: FiFileText,  color: "bg-emerald-50 text-emerald-600", title: "Digital Records", desc: "Your entire medical history, secured in one place" },
  { icon: FiActivity,  color: "bg-rose-50 text-rose-600",    title: "Vital Tracking",      desc: "Real-time tracking of BP, sugar, and heart rate" },
  { icon: FiShield,    color: "bg-blue-50 text-blue-600",    title: "Secure Access",       desc: "End-to-end encrypted medical data storage" },
];

export default function WelcomePage() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();

  const handleGetStarted = () => {
    if (isAuthenticated) {
      const dashMap = { patient: "/patient/dashboard", doctor: "/doctor/dashboard", admin: "/admin/dashboard" };
      navigate(dashMap[user?.role] || "/patient/dashboard");
    } else {
      navigate("/register");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans selection:bg-primary-100 selection:text-primary-700">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Logo size={40} showText={true} />
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-primary-600 transition-colors">Features</a>
            <a href="#specialists" className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-primary-600 transition-colors">Specialists</a>
            <a href="#security" className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-primary-600 transition-colors">Security</a>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-primary-600 transition-colors">Sign In</Link>
            <button
              onClick={handleGetStarted}
              className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-full transition-all shadow-lg shadow-primary-500/25 active:scale-95"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none -z-10">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-400/10 blur-[120px] rounded-full" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-400/10 blur-[100px] rounded-full" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-8 max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-50 dark:bg-primary-500/10 border border-primary-100 dark:border-primary-500/20 text-xs font-bold text-primary-700 dark:text-primary-400 uppercase tracking-wider"
            >
              <span className="flex h-2 w-2 rounded-full bg-primary-500 animate-ping" />
              Trusted by 10,000+ Patients
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.6 }}
              className="text-4xl sm:text-6xl lg:text-7xl font-heading font-extrabold text-slate-900 dark:text-white tracking-tight leading-[1.1]"
            >
              Modern Healthcare <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-emerald-500">
                Redefined for You.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed"
            >
              Access top-tier doctors, manage digital health records, and track your vitals seamlessly in our HIPAA-compliant smart portal.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
            >
              <button
                onClick={handleGetStarted}
                className="w-full sm:w-auto px-8 py-4 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-2xl shadow-xl shadow-primary-500/25 flex items-center justify-center gap-2 transition-all group"
              >
                Join MedIQ+ Now <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
              </button>
              <Link
                to="/login"
                className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 font-bold rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all text-center"
              >
                Provider Login
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-heading font-bold text-slate-900 dark:text-white">Built for Better Care</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2">Everything you need to manage your family's health</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 hover:border-primary-500/30 hover:shadow-2xl hover:shadow-primary-500/5 transition-all"
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${f.color}`}>
                  <f.icon size={28} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{f.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Find Doctors Section */}
      <section id="specialists" className="py-24 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-heading font-bold text-slate-900 dark:text-white mb-4">Find Top Specialists</h2>
            <p className="text-slate-500 dark:text-slate-400 text-lg max-w-2xl mx-auto">
              Connect with board-certified doctors across all specialties — available 24/7 for video or in-person consultations
            </p>
          </div>

          {/* Search Bar */}
          <div className="max-w-3xl mx-auto mb-16">
            <Link
              to="/doctors"
              className="block p-6 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl hover:border-primary-500 hover:shadow-2xl hover:shadow-primary-500/10 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                  <FiAlertCircle size={24} className="text-primary-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-bold text-slate-900 dark:text-white text-lg">Search for Doctors or Specialties</p>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Find cardiologists, neurologists, pediatricians, and more...</p>
                </div>
                <FiArrowRight size={24} className="text-slate-400 group-hover:text-primary-600 group-hover:translate-x-2 transition-all" />
              </div>
            </Link>
          </div>

          {/* Quick Specialty Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-12">
            {[
              { name: "Cardiologist", icon: "❤️" },
              { name: "Neurologist", icon: "🧠" },
              { name: "Dermatologist", icon: "✨" },
              { name: "Pediatrician", icon: "👶" },
              { name: "Orthopedic", icon: "🦴" },
            ].map((spec) => (
              <Link
                key={spec.name}
                to="/doctors"
                className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-primary-500 hover:shadow-lg transition-all text-center group"
              >
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">{spec.icon}</div>
                <p className="font-semibold text-slate-900 dark:text-white text-sm">{spec.name}</p>
              </Link>
            ))}
          </div>

          {/* CTA Button */}
          <div className="text-center">
            <Link
              to="/doctors"
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-2xl shadow-xl shadow-primary-500/25 transition-all group"
            >
              Browse All Doctors <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* Trust & Stats */}
      <section id="security" className="py-24 bg-primary-600 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-bold uppercase tracking-widest">
                Bank-Level Security
              </div>
              <h2 className="text-4xl font-heading font-bold leading-tight">Your Health Privacy is <br /> Our Top Priority</h2>
              <p className="text-primary-100 text-lg leading-relaxed">
                We use end-to-end 256-bit encryption and HIPAA-compliant data centers to ensure your medical records remain yours alone.
              </p>
              <div className="grid grid-cols-2 gap-6 pt-4">
                {[
                  { label: "Active Users", value: "10k+" },
                  { label: "Verified Doctors", value: "450+" },
                  { label: "Uptime", value: "99.9%" },
                  { label: "Data Safety", value: "AES-256" },
                ].map(s => (
                  <div key={s.label}>
                    <p className="text-3xl font-bold">{s.value}</p>
                    <p className="text-primary-200 text-sm mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-[40px] space-y-6">
              <div className="flex gap-1 text-amber-400">
                {[1,2,3,4,5].map(i => <FiStar key={i} fill="currentColor" size={20} />)}
              </div>
              <p className="text-xl font-medium leading-relaxed italic">
                "The most seamless healthcare experience I've had. Being able to access my lab reports on my phone and talk to my cardiologist instantly is a game changer."
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary-400 flex items-center justify-center font-bold">JD</div>
                <div>
                  <p className="font-bold">Jonathan Doe</p>
                  <p className="text-primary-200 text-sm">Patient since 2023</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <Logo size={32} showText={true} />
            <div className="flex gap-8 text-sm text-slate-500 dark:text-slate-400">
              <Link to="/privacy" className="hover:text-primary-600">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-primary-600">Terms of Service</Link>
              <Link to="/contact" className="hover:text-primary-600">Contact Us</Link>
            </div>
            <p className="text-sm text-slate-400">
              © {new Date().getFullYear()} MedIQ+ Healthcare. Built for a healthier future.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
