import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FiStar, FiMapPin, FiClock, FiUser, FiAward, FiCalendar, FiMessageSquare, FiArrowLeft, FiCheckCircle } from "react-icons/fi";
import { doctorAPI, appointmentAPI, chatAPI } from "../../services/api";
import { useAuthStore } from "../../store/authStore";
import toast from "react-hot-toast";

const reviews = [];

export default function DoctorProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [doctor, setDoctor] = useState(null);
  const [activeTab, setActiveTab] = useState("about");
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDoc = async () => {
      try {
        const res = await doctorAPI.getById(id);
        const data = res.data.data.doctor;
        setDoctor({
          ...data,
          name: data.user?.name || data.name || "Doctor",
          fee: data.consultationFee?.video || 0,
          avatar: (data.user?.name || data.name || "DR").split(" ").map(n => n[0]).join("").slice(0, 2),
          about: data.bio || "No biography provided.",
          education: data.education?.map(e => `${e.degree} - ${e.institution}`) || [],
          specializations: [data.specialty, ...(data.subSpecialties || [])].filter(Boolean),
          languages: data.languages?.length > 0 ? data.languages : ["English"],
          hospital: data.hospital || "Medical Center",
          consultationTypes: [
            data.consultationTypes?.video && "Video Call",
            data.consultationTypes?.inPerson && "In-Person"
          ].filter(Boolean),
          rating: data.averageRating || 0,
          reviewCount: data.totalReviews || 0,
          experience: data.experience || 0,
        });
      } catch (err) {
        console.error("Failed to load doctor:", err);
        toast.error("Doctor not found");
      } finally {
        setLoading(false);
      }
    };
    fetchDoc();
  }, [id]);

  useEffect(() => {
    if (activeTab === "slots" && doctor) {
      const fetchSlots = async () => {
        try {
          const res = await appointmentAPI.getSlots(doctor.user?._id || id, selectedDate);
          setAvailableSlots(res.data.data.available);
        } catch (err) {
          setAvailableSlots(["9:00 AM", "10:00 AM", "11:00 AM", "2:00 PM", "3:00 PM", "4:00 PM"]);
        }
      };
      fetchSlots();
    }
  }, [activeTab, doctor, selectedDate, id]);

  if (loading) return <div className="p-10 text-center">Loading profile...</div>;
  if (!doctor) return <div className="p-10 text-center">Doctor not found</div>;

  const handleMessage = async () => {
    if (!isAuthenticated) {
      toast("Please login to message the doctor", { icon: "🔒" });
      navigate("/login");
      return;
    }
    try {
      const res = await chatAPI.createOrGet({ participantId: doctor.user?._id || id });
      if (res.data.success) {
        navigate(`/chat/${res.data.data.conversation._id}`);
      } else {
        toast.error("Could not open chat");
      }
    } catch (err) {
      toast.error("Could not open chat");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back */}
      <Link to="/doctors" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
        <FiArrowLeft size={16} /> Back to Doctors
      </Link>

      {/* Profile card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card overflow-hidden">
        {/* Banner */}
        <div className="h-28 bg-gradient-hero relative">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-4 right-8 w-20 h-20 bg-white rounded-full" />
            <div className="absolute bottom-2 left-16 w-12 h-12 bg-white rounded-full" />
          </div>
        </div>

        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-10 mb-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-2xl border-4 border-white shadow-lg flex-shrink-0">
              {doctor.avatar}
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-xl font-heading font-bold text-gray-900">{doctor.name}</h1>
                  <p className="text-primary-600 font-medium text-sm">{doctor.specialty}</p>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span className="flex items-center gap-1 text-sm">
                      <FiStar size={14} className="text-amber-400 fill-amber-400" />
                      <span className="font-semibold">{doctor.rating}</span>
                      <span className="text-gray-400">({doctor.reviews})</span>
                    </span>
                    <span className="flex items-center gap-1 text-sm text-gray-500">
                      <FiMapPin size={13} /> {doctor.location}
                    </span>
                    <span className="flex items-center gap-1 text-sm text-gray-500">
                      <FiClock size={13} /> {doctor.experience} years exp.
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleMessage} className="btn-outline btn-sm gap-1.5">
                    <FiMessageSquare size={14} /> Message
                  </button>
                  <Link to={`/book-appointment/${id}`} className="btn-primary btn-sm gap-1.5">
                    <FiCalendar size={14} /> Book
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-2xl">
            {[
              { label: "Patients", value: "2,400+", icon: FiUser },
              { label: "Experience", value: `${doctor.experience} yrs`, icon: FiAward },
              { label: "Satisfaction", value: "98%", icon: FiCheckCircle },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-lg font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
        {["about", "slots", "reviews"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all capitalize ${
              activeTab === tab ? "bg-white text-primary-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab === "slots" ? "Book Slot" : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {activeTab === "about" && (
          <div className="space-y-5">
            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 mb-3">About</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{doctor.about}</p>
            </div>
            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Education & Training</h3>
              <div className="space-y-2">
                {doctor.education.map((e) => (
                  <div key={e} className="flex items-center gap-2 text-sm text-gray-600">
                    <FiCheckCircle size={14} className="text-green-500 flex-shrink-0" /> {e}
                  </div>
                ))}
              </div>
            </div>
            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Specializations</h3>
              <div className="flex flex-wrap gap-2">
                {doctor.specializations.map((s) => (
                  <span key={s} className="badge-primary">{s}</span>
                ))}
              </div>
            </div>
            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Consultation</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Fee per session</p>
                  <p className="font-bold text-gray-900 text-lg">${doctor.fee}</p>
                </div>
                <div>
                  <p className="text-gray-500">Languages</p>
                  <p className="font-medium text-gray-900">{doctor.languages.join(", ")}</p>
                </div>
                <div>
                  <p className="text-gray-500">Hospital</p>
                  <p className="font-medium text-gray-900">{doctor.hospital}</p>
                </div>
                <div>
                  <p className="text-gray-500">Consultation Types</p>
                  <div className="flex gap-1 mt-1">
                    {doctor.consultationTypes.map((t) => (
                      <span key={t} className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        t === "Video Call" ? "bg-blue-100 text-blue-600" : "bg-green-100 text-green-600"
                      }`}>{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "slots" && (
          <div className="card p-5 space-y-5">
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Select Date</h3>
              <input
                type="date"
                className="input"
                value={selectedDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Available Slots</h3>
              <div className="grid grid-cols-3 gap-2">
                {availableSlots.length > 0 ? availableSlots.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => setSelectedSlot(slot)}
                    className={`py-2.5 px-3 rounded-xl text-sm font-medium border-2 transition-all ${
                      selectedSlot === slot
                        ? "border-primary-500 bg-primary-50 text-primary-700"
                        : "border-gray-200 text-gray-700 hover:border-primary-300"
                    }`}
                  >
                    {slot}
                  </button>
                )) : <p className="text-sm text-gray-400">No slots available for this date.</p>}
              </div>
            </div>
            {selectedSlot && (
              <Link
                to={`/book-appointment/${id}`}
                state={{ slot: selectedSlot, date: selectedDate }}
                className="btn-primary btn-lg w-full justify-center"
              >
                <FiCalendar size={16} /> Confirm Booking — {selectedSlot}
              </Link>
            )}
          </div>
        )}

        {activeTab === "reviews" && (
          <div className="space-y-4">
            <div className="card p-5 flex items-center gap-6">
              <div className="text-center">
                <p className="text-5xl font-bold text-gray-900">{doctor.rating}</p>
                <div className="flex gap-0.5 mt-1 justify-center">
                  {[1,2,3,4,5].map((s) => (
                    <FiStar key={s} size={14} className="text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">{doctor.reviews} reviews</p>
              </div>
              <div className="flex-1 space-y-1.5">
                {[5,4,3,2,1].map((star) => (
                  <div key={star} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-3">{star}</span>
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full" style={{ width: `${star === 5 ? 75 : star === 4 ? 18 : 5}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {reviews.map((r) => (
              <div key={r.id} className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-xs">
                      {r.name.charAt(0)}
                    </div>
                    <span className="font-medium text-sm text-gray-900">{r.name}</span>
                  </div>
                  <span className="text-xs text-gray-400">{r.date}</span>
                </div>
                <div className="flex gap-0.5 mb-2">
                  {[...Array(r.rating)].map((_, i) => <FiStar key={i} size={12} className="text-amber-400 fill-amber-400" />)}
                </div>
                <p className="text-sm text-gray-600">{r.comment}</p>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
