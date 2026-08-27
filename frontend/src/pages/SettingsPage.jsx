import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiSun, FiMoon, FiGlobe, FiBell, FiShield, FiTrash2, FiChevronRight, FiX, FiLock, FiEye, FiEyeOff, FiMonitor, FiSmartphone, FiCheck } from "react-icons/fi";
import { useUIStore } from "../store/uiStore";
import { useAuthStore } from "../store/authStore";
import toast from "react-hot-toast";

const languages = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
];

// ── Change Password Modal ─────────────────────────────────────
function ChangePasswordModal({ onClose }) {
  const [show, setShow] = useState({ cur: false, new: false, conf: false });
  const [form, setForm] = useState({ current: "", newPass: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (form.newPass.length < 8)   { toast.error("New password must be at least 8 characters"); return; }
    if (form.newPass !== form.confirm){ toast.error("Passwords do not match"); return; }
    if (!form.current)              { toast.error("Please enter your current password"); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setLoading(false);
    setDone(true);
    toast.success("Password changed successfully!");
    setTimeout(onClose, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale:0.95, opacity:0 }} animate={{ scale:1, opacity:1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-heading font-bold text-gray-900 flex items-center gap-2"><FiLock size={18} className="text-primary-600" /> Change Password</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><FiX size={18} /></button>
        </div>
        {done ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><FiCheck size={32} className="text-green-500" /></div>
            <p className="font-semibold text-gray-900">Password changed!</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {[
              { label:"Current Password", key:"current", showKey:"cur" },
              { label:"New Password",     key:"newPass", showKey:"new" },
              { label:"Confirm Password", key:"confirm", showKey:"conf" },
            ].map(f => (
              <div key={f.key}>
                <label className="label">{f.label}</label>
                <div className="relative">
                  <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input type={show[f.showKey] ? "text" : "password"} value={form[f.key]} onChange={e => setForm({...form, [f.key]: e.target.value})}
                    placeholder="••••••••" className="input pl-10 pr-10" required />
                  <button type="button" onClick={() => setShow(s => ({...s, [f.showKey]: !s[f.showKey]}))} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                    {show[f.showKey] ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                  </button>
                </div>
              </div>
            ))}
            {form.newPass && (
              <div className="bg-gray-50 rounded-xl p-3 space-y-1">
                {[["8+ characters", form.newPass.length >= 8],["Uppercase letter", /[A-Z]/.test(form.newPass)],["Lowercase letter", /[a-z]/.test(form.newPass)],["Number", /\d/.test(form.newPass)]].map(([l,ok]) => (
                  <div key={l} className={`text-xs flex items-center gap-1.5 ${ok?"text-green-600":"text-gray-400"}`}><span>{ok?"✓":"○"}</span>{l}</div>
                ))}
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="btn-outline flex-1">Cancel</button>
              <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">{loading ? "Changing..." : "Change Password"}</button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}

// ── Active Sessions Modal ─────────────────────────────────────
function SessionsModal({ onClose }) {
  const { user } = useAuthStore();
  const [sessions, setSessions] = useState([
    { id:1, device:"Current Browser", browser:"Chrome 120", os:"Windows 11", location:"Tamil Nadu, India", time:"Now", current:true, icon: FiMonitor },
    { id:2, device:"Mobile",          browser:"Chrome Mobile", os:"Android", location:"Tamil Nadu, India", time:"2 hours ago", current:false, icon: FiSmartphone },
  ]);

  const revoke = (id) => {
    setSessions(prev => prev.filter(s => s.id !== id));
    toast.success("Session revoked successfully");
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale:0.95, opacity:0 }} animate={{ scale:1, opacity:1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-heading font-bold text-gray-900 flex items-center gap-2"><FiMonitor size={18} className="text-primary-600" /> Active Sessions</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><FiX size={18} /></button>
        </div>
        <div className="space-y-3 mb-5">
          {sessions.map(s => (
            <div key={s.id} className={`flex items-start gap-3 p-3 rounded-xl border ${s.current ? "border-primary-200 bg-primary-50" : "border-gray-200"}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${s.current ? "bg-primary-100 text-primary-600" : "bg-gray-100 text-gray-500"}`}>
                <s.icon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm text-gray-900">{s.device}</p>
                  {s.current && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Current</span>}
                </div>
                <p className="text-xs text-gray-500">{s.browser} · {s.os}</p>
                <p className="text-xs text-gray-400">{s.location} · {s.time}</p>
              </div>
              {!s.current && (
                <button onClick={() => revoke(s.id)} className="text-xs text-red-500 hover:text-red-700 font-medium flex-shrink-0">Revoke</button>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-outline flex-1">Close</button>
          <button onClick={() => { setSessions(prev => prev.filter(s => s.current)); toast.success("All other sessions revoked!"); }} className="btn-danger flex-1 justify-center">Revoke All Others</button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Privacy Modal ─────────────────────────────────────────────
function PrivacyModal({ onClose }) {
  const [priv, setPriv] = useState({ profileVisible:true, shareData:false, analytics:true, marketing:false, thirdParty:false });
  const toggle = k => setPriv(p => ({ ...p, [k]: !p[k] }));

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale:0.95, opacity:0 }} animate={{ scale:1, opacity:1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-heading font-bold text-gray-900 flex items-center gap-2"><FiShield size={18} className="text-primary-600" /> Privacy Settings</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><FiX size={18} /></button>
        </div>
        <div className="space-y-4">
          {[
            { key:"profileVisible", label:"Profile Visible to Doctors",   desc:"Allow doctors to see your profile information" },
            { key:"shareData",      label:"Share Health Data",             desc:"Share anonymized health data for research" },
            { key:"analytics",      label:"Usage Analytics",               desc:"Help improve the app with anonymous usage data" },
            { key:"marketing",      label:"Marketing Communications",      desc:"Receive health tips and promotional content" },
            { key:"thirdParty",     label:"Third-Party Integrations",      desc:"Allow integration with health apps" },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{item.label}</p>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
              <button onClick={() => toggle(item.key)} className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${priv[item.key] ? "bg-primary-500" : "bg-gray-300"}`}>
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${priv[item.key] ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-outline flex-1">Cancel</button>
          <button onClick={() => { toast.success("Privacy settings saved!"); onClose(); }} className="btn-primary flex-1 justify-center">Save Settings</button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Delete Account Modal ──────────────────────────────────────
function DeleteModal({ onClose }) {
  const [confirm, setConfirm] = useState("");
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale:0.95, opacity:0 }} animate={{ scale:1, opacity:1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-bold text-red-600 flex items-center gap-2"><FiTrash2 size={18} /> Delete Account</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><FiX size={18} /></button>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
          <p className="text-sm text-red-700 font-medium">⚠️ This action is permanent and cannot be undone.</p>
          <p className="text-xs text-red-600 mt-1">All your medical records, appointments, and data will be deleted forever.</p>
        </div>
        <div className="mb-4">
          <label className="label">Type <strong>DELETE</strong> to confirm</label>
          <input value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="DELETE" className="input" />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-outline flex-1">Cancel</button>
          <button onClick={() => { if(confirm==="DELETE"){ toast.error("Account deletion request submitted. You will receive a confirmation email."); onClose(); } else toast.error("Type DELETE to confirm"); }}
            className="btn-danger flex-1 justify-center">Delete Account</button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main Settings Page ────────────────────────────────────────
export default function SettingsPage() {
  const { darkMode, toggleDarkMode, language, setLanguage } = useUIStore();
  const [notifications, setNotifications] = useState({ appointments:true, reminders:true, messages:true, promotions:false, email:true, sms:false });
  const [twoFA, setTwoFA] = useState(true);
  const [modal, setModal] = useState(null); // 'password'|'sessions'|'privacy'|'delete'

  const toggleNotif = k => setNotifications(p => ({ ...p, [k]: !p[k] }));
  const Toggle = ({ checked, onChange }) => (
    <button onClick={onChange} className={`relative w-11 h-6 rounded-full transition-colors ${checked ? "bg-primary-500" : "bg-gray-300 dark:bg-slate-700"}`}>
      <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">Manage your preferences and account settings</p>
      </div>

      {/* Appearance */}
      <div className="card p-5 space-y-4 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800">
        <h2 className="font-semibold text-gray-900 dark:text-white">Appearance</h2>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {darkMode ? <FiMoon size={18} className="text-primary-400" /> : <FiSun size={18} className="text-amber-500" />}
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Dark Mode</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">Switch between light and dark theme</p>
            </div>
          </div>
          <Toggle checked={darkMode} onChange={toggleDarkMode} />
        </div>
      </div>

      {/* Language */}
      <div className="card p-5 space-y-4 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800">
        <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2"><FiGlobe size={16} /> Language</h2>
        <div className="grid grid-cols-3 gap-2">
          {languages.map(lang => (
            <button key={lang.code} onClick={() => { setLanguage(lang.code); toast.success(`Language set to ${lang.label}`); }}
              className={`py-2.5 px-3 rounded-xl text-sm font-medium border-2 transition-all flex items-center gap-1.5 justify-center ${language === lang.code ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300" : "border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:border-gray-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800"}`}>
              <span>{lang.flag}</span>{lang.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications */}
      <div className="card p-5 space-y-4 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800">
        <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2"><FiBell size={16} /> Notifications</h2>
        {[
          { key:"appointments", label:"Appointment Reminders", desc:"Upcoming appointment alerts" },
          { key:"reminders",    label:"Medicine Reminders",    desc:"Daily medication reminders" },
          { key:"messages",     label:"New Messages",          desc:"Chat message notifications" },
          { key:"promotions",   label:"Health Tips & Updates", desc:"Platform updates and tips" },
          { key:"email",        label:"Email Notifications",   desc:"Receive updates via email" },
          { key:"sms",          label:"SMS Notifications",     desc:"Receive updates via SMS" },
        ].map(item => (
          <div key={item.key} className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{item.label}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">{item.desc}</p>
            </div>
            <Toggle checked={notifications[item.key]} onChange={() => { toggleNotif(item.key); toast.success(`${item.label} ${!notifications[item.key] ? "enabled" : "disabled"}`); }} />
          </div>
        ))}
      </div>

      {/* Security */}
      <div className="card p-5 space-y-4 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800">
        <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2"><FiShield size={16} /> Security</h2>
        <div className="flex items-center justify-between py-1">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Two-Factor Authentication</p>
            <p className="text-xs text-gray-500 dark:text-slate-400">Add an extra layer of security</p>
          </div>
          <Toggle checked={twoFA} onChange={() => { setTwoFA(!twoFA); toast.success(`2FA ${!twoFA ? "enabled" : "disabled"}`); }} />
        </div>
        {[
          { label:"Change Password",  desc:"Update your account password",        onClick:() => setModal("password") },
          { label:"Active Sessions",  desc:"Manage devices logged in",             onClick:() => setModal("sessions") },
          { label:"Privacy Settings", desc:"Control your data and privacy",        onClick:() => setModal("privacy") },
        ].map(item => (
          <button key={item.label} onClick={item.onClick}
            className="w-full flex items-center justify-between py-2.5 px-3 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-xl transition-colors border border-transparent hover:border-gray-100 dark:hover:border-slate-700">
            <div className="text-left">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{item.label}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">{item.desc}</p>
            </div>
            <FiChevronRight size={16} className="text-gray-400 flex-shrink-0" />
          </button>
        ))}
      </div>

      {/* Danger Zone */}
      <div className="card p-5">
        <h2 className="font-semibold text-red-600 mb-4 flex items-center gap-2"><FiTrash2 size={16} /> Danger Zone</h2>
        <button onClick={() => setModal("delete")}
          className="w-full flex items-center justify-between p-3 rounded-xl border border-red-200 hover:bg-red-50 transition-colors text-left">
          <div>
            <p className="text-sm font-medium text-red-700">Delete Account</p>
            <p className="text-xs text-red-500">Permanently delete your account and all data</p>
          </div>
          <FiChevronRight size={16} className="text-red-400" />
        </button>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {modal === "password" && <ChangePasswordModal onClose={() => setModal(null)} />}
        {modal === "sessions" && <SessionsModal onClose={() => setModal(null)} />}
        {modal === "privacy"  && <PrivacyModal onClose={() => setModal(null)} />}
        {modal === "delete"   && <DeleteModal onClose={() => setModal(null)} />}
      </AnimatePresence>
    </div>
  );
}
