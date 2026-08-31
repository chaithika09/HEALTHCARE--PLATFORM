import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FiSearch, FiCheckCircle, FiCalendar, FiActivity, FiList } from "react-icons/fi";
import { labAPI } from "../../services/api";
import toast from "react-hot-toast";

const categories = ["All", "Hematology", "Biochemistry", "Endocrinology", "Nephrology", "Pathology", "Virology"];

export default function LabTestBooking() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState([]);
  const [step, setStep] = useState(1);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [homeCollection, setHomeCollection] = useState(false);
  const [booking, setBooking] = useState(false);
  const [activeTab, setActiveTab] = useState("book"); // "book" | "bookings"
  const [myBookings, setMyBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  useEffect(() => {
    const fetchTests = async () => {
      try {
        const res = await labAPI.getTests();
        setTests(res.data.data.tests || []);
      } catch (err) {
        console.error("Failed to fetch lab tests", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTests();
  }, []);

  const fetchMyBookings = async () => {
    setBookingsLoading(true);
    try {
      const res = await labAPI.getBookings();
      setMyBookings(res.data.data.bookings || []);
    } catch (err) {
      console.error("Failed to fetch bookings", err);
      setMyBookings([]);
    } finally {
      setBookingsLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "bookings") fetchMyBookings();
  };

  useEffect(() => {
    const fetchTests = async () => {
      try {
        const res = await labAPI.getTests();
        setTests(res.data.data.tests || []);
      } catch (err) {
        console.error("Failed to fetch lab tests", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTests();
  }, []);

  const filtered = tests.filter((t) => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "All" || t.category === category;
    return matchSearch && matchCat;
  });

  const toggleCart = (test) => {
    setCart((prev) =>
      prev.find((t) => t.id === test.id) ? prev.filter((t) => t.id !== test.id) : [...prev, test]
    );
  };

  const total = cart.reduce((sum, t) => sum + t.price, 0);

  const handleBook = async () => {
    if (!date || !time) { toast.error("Please select date and time"); return; }
    setBooking(true);
    try {
      await labAPI.book({
        tests: cart,
        date,
        timeSlot: time,
        homeCollection,
        address: "Default Address" // Can be expanded to ask user
      });
      toast.success("Lab tests booked successfully!");
      setStep(3);
    } catch (err) {
      toast.error("Booking failed. Please try again.");
    } finally {
      setBooking(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-gray-500">Loading available tests...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900 dark:text-white">Lab Tests</h1>
          <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">Book tests or view your bookings</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-gray-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
        <button
          onClick={() => handleTabChange("book")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === "book" ? "bg-white dark:bg-slate-900 text-primary-600 shadow-sm" : "text-gray-500 dark:text-slate-400"}`}
        >
          <FiActivity size={14} /> Book Tests
        </button>
        <button
          onClick={() => handleTabChange("bookings")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === "bookings" ? "bg-white dark:bg-slate-900 text-primary-600 shadow-sm" : "text-gray-500 dark:text-slate-400"}`}
        >
          <FiList size={14} /> My Bookings
        </button>
      </div>

      {/* My Bookings Tab */}
      {activeTab === "bookings" && (
        <div className="space-y-4">
          {bookingsLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin w-6 h-6 border-4 border-primary-500 border-t-transparent rounded-full" />
            </div>
          ) : myBookings.length === 0 ? (
            <div className="text-center py-16">
              <span className="text-5xl">🧪</span>
              <p className="text-gray-500 dark:text-slate-400 mt-4 font-medium">No lab test bookings yet</p>
              <button onClick={() => setActiveTab("book")} className="btn-primary mt-4 gap-2">
                <FiActivity size={16} /> Book a Test
              </button>
            </div>
          ) : (
            myBookings.map((b, i) => (
              <motion.div key={b._id || i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {(b.tests || []).map(t => t.name).join(", ") || "Lab Tests"}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                      <FiCalendar size={11} className="inline mr-1" />
                      {b.date ? new Date(b.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "N/A"}
                      {b.timeSlot ? ` · ${b.timeSlot}` : ""}
                    </p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                    b.status === "confirmed" ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" :
                    b.status === "completed" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" :
                    "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                  }`}>
                    {b.status || "Pending"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-slate-400">
                    {b.homeCollection ? "🏠 Home Collection" : "🏥 Visit Lab"}
                  </span>
                  <span className="font-bold text-primary-600 dark:text-primary-400">
                    ₹{(b.tests || []).reduce((s, t) => s + (t.price || 0), 0) || b.totalAmount || 0}
                  </span>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Book Tests Tab */}
      {activeTab === "book" && (
        <>
          {step === 1 && (
            <>
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input type="text" placeholder="Search tests..." value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-10" />
                </div>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {categories.map((c) => (
                  <button key={c} onClick={() => setCategory(c)}
                    className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${category === c ? "bg-primary-500 text-white" : "bg-white border border-gray-200 text-gray-600"}`}>
                    {c}
                  </button>
                ))}
              </div>

              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map((test, i) => {
                  const inCart = cart.find((t) => t.id === test.id);
                  return (
                    <motion.div key={test.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                      className={`card p-4 cursor-pointer transition-all ${inCart ? "ring-2 ring-primary-500 bg-primary-50" : "hover:shadow-card-hover"}`}
                      onClick={() => toggleCart(test)}>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <FiActivity size={18} className="text-blue-600" />
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${inCart ? "border-primary-500 bg-primary-500" : "border-gray-300"}`}>
                          {inCart && <FiCheckCircle size={12} className="text-white" />}
                        </div>
                      </div>
                      <h3 className="font-semibold text-gray-900 text-sm leading-tight">{test.name}</h3>
                      <p className="text-xs text-gray-500 mt-1">{test.description}</p>
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex gap-2">
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{test.duration}</span>
                          {test.fasting && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Fasting</span>}
                        </div>
                        <span className="font-bold text-gray-900">${test.price}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {cart.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  className="fixed bottom-20 lg:bottom-6 left-4 right-4 lg:left-auto lg:right-6 lg:w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 z-20">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-semibold text-gray-900">{cart.length} test(s) selected</p>
                    <p className="font-bold text-primary-600">${total}</p>
                  </div>
                  <button onClick={() => setStep(2)} className="btn-primary w-full justify-center">
                    Schedule Tests
                  </button>
                </motion.div>
              )}
            </>
          )}

          {step === 2 && (
        <div className="max-w-lg space-y-5">
          <div className="card p-5 space-y-4">
            <h3 className="font-semibold text-gray-900">Schedule Details</h3>
            <div>
              <label className="label flex items-center gap-2"><FiCalendar size={14} /> Preferred Date</label>
              <input type="date" className="input" min={new Date().toISOString().split("T")[0]} value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label className="label">Preferred Time</label>
              <select className="input" value={time} onChange={(e) => setTime(e.target.value)}>
                <option value="">Select time</option>
                {["7:00 AM","8:00 AM","9:00 AM","10:00 AM","11:00 AM","12:00 PM","2:00 PM","3:00 PM","4:00 PM"].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={homeCollection} onChange={(e) => setHomeCollection(e.target.checked)} className="w-4 h-4 rounded text-primary-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">Home Sample Collection</p>
                <p className="text-xs text-gray-500">A technician will visit your home (+$10)</p>
              </div>
            </label>
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Order Summary</h3>
            {cart.map((t) => (
              <div key={t.id} className="flex justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                <span className="text-gray-700">{t.name}</span>
                <span className="font-medium">${t.price}</span>
              </div>
            ))}
            {homeCollection && (
              <div className="flex justify-between text-sm py-1.5">
                <span className="text-gray-700">Home Collection</span>
                <span className="font-medium">$10</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-gray-900 pt-3 mt-1 border-t border-gray-200">
              <span>Total</span>
              <span>${total + (homeCollection ? 10 : 0)}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="btn-outline flex-1">Back</button>
            <button onClick={handleBook} className="btn-primary flex-1 justify-center">Confirm Booking</button>
          </div>
        </div>
      )}

          {step === 3 && (
        <div className="max-w-lg mx-auto text-center py-12">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <FiCheckCircle size={48} className="text-green-500" />
          </div>
          <h2 className="text-2xl font-heading font-bold text-gray-900">Tests Booked!</h2>
          <p className="text-gray-500 mt-2">Your lab tests have been scheduled for {date} at {time}.</p>
          <button onClick={() => { setStep(1); setCart([]); handleTabChange("bookings"); }} className="btn-primary mt-8">View My Bookings</button>
        </div>
      )}
        </>
      )}
    </div>
  );
}
