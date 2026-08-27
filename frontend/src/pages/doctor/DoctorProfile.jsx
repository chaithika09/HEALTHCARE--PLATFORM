import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FiEdit, FiSave, FiX, FiUser, FiAward, FiDollarSign, FiClock, FiMapPin, FiGlobe, FiBook, FiVideo, FiHome } from "react-icons/fi";
import { useAuthStore } from "../../store/authStore";
import { doctorAPI } from "../../services/api";
import toast from "react-hot-toast";

export default function DoctorProfile() {
  const { user } = useAuthStore();
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    specialty: "",
    subSpecialties: "",
    qualifications: "",
    experience: "",
    licenseNumber: "",
    bio: "",
    languages: "",
    hospital: "",
    videoFee: "",
    inPersonFee: "",
    // Availability
    mondaySlots: "",
    tuesdaySlots: "",
    wednesdaySlots: "",
    thursdaySlots: "",
    fridaySlots: "",
    saturdaySlots: "",
    sundaySlots: "",
  });

  useEffect(() => {
    fetchDoctorProfile();
  }, []);

  const fetchDoctorProfile = async () => {
    try {
      const res = await doctorAPI.getMyProfile();

      if (!res?.data?.success || !res?.data?.data?.doctor) {
        throw new Error(res?.data?.message || "Invalid profile data received");
      }

      const data = res.data.data.doctor;
      setDoctor(data);

      const availabilityStrings = {
        monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: []
      };

      if (Array.isArray(data.availability)) {
        data.availability.forEach(slot => {
          if (slot && slot.day && availabilityStrings[slot.day]) {
            availabilityStrings[slot.day].push(slot.startTime);
          }
        });
      }

      // Populate form
      setFormData({
        specialty: data.specialty || "",
        subSpecialties: Array.isArray(data.subSpecialties) ? data.subSpecialties.join(", ") : "",
        qualifications: Array.isArray(data.education) ? data.education.map(e => `${e.degree} at ${e.institution}`).join(", ") : "",
        experience: data.experience || "",
        licenseNumber: data.licenseNumber || "",
        bio: data.bio || "",
        languages: Array.isArray(data.languages) ? data.languages.join(", ") : "",
        hospital: data.hospital || "",
        videoFee: data.consultationFee?.video || "",
        inPersonFee: data.consultationFee?.inPerson || "",
        mondaySlots: availabilityStrings.monday.join(", "),
        tuesdaySlots: availabilityStrings.tuesday.join(", "),
        wednesdaySlots: availabilityStrings.wednesday.join(", "),
        thursdaySlots: availabilityStrings.thursday.join(", "),
        fridaySlots: availabilityStrings.friday.join(", "),
        saturdaySlots: availabilityStrings.saturday.join(", "),
        sundaySlots: availabilityStrings.sunday.join(", "),
      });
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to load profile";
      toast.error(msg);
      console.error("Profile load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
      const availabilityArray = [];

      days.forEach(day => {
        const slotsStr = formData[`${day}Slots`];
        if (slotsStr) {
          const slots = slotsStr.split(",").map(s => s.trim()).filter(Boolean);
          slots.forEach(slot => {
            availabilityArray.push({
              day,
              startTime: slot,
              endTime: slot, // simplified
              isAvailable: true
            });
          });
        }
      });

      const updateData = {
        specialty: formData.specialty,
        subSpecialties: formData.subSpecialties.split(",").map(s => s.trim()).filter(Boolean),
        qualifications: formData.qualifications.split(",").map(s => s.trim()).filter(Boolean),
        experience: parseInt(formData.experience) || 0,
        licenseNumber: formData.licenseNumber,
        bio: formData.bio,
        languages: formData.languages.split(",").map(s => s.trim()).filter(Boolean),
        hospital: formData.hospital,
        consultationFee: {
          video: parseInt(formData.videoFee) || 0,
          inPerson: parseInt(formData.inPersonFee) || 0,
        },
        availability: availabilityArray
      };

      await doctorAPI.updateProfile(updateData);
      toast.success("Profile updated successfully!");
      setEditing(false);
      fetchDoctorProfile();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
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
          <h1 className="text-2xl font-heading font-bold text-gray-900 dark:text-white">My Profile</h1>
          <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">Manage your professional information</p>
        </div>
        {!editing ? (
          <button onClick={() => setEditing(true)} className="btn-primary btn-sm gap-2">
            <FiEdit size={14} /> Edit Profile
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="btn-outline btn-sm gap-2">
              <FiX size={14} /> Cancel
            </button>
            <button onClick={handleSave} disabled={saving} className="btn-primary btn-sm gap-2">
              <FiSave size={14} /> {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      </div>

      {/* Profile Card */}
      <div className="card p-6 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100 dark:border-slate-800">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-2xl">
            {user?.name?.charAt(0)?.toUpperCase() || "D"}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{user?.name}</h2>
            <p className="text-primary-600 dark:text-primary-400 font-medium">{doctor?.specialty || "Doctor"}</p>
            <p className="text-sm text-gray-500 dark:text-slate-400">{user?.email}</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Basic Info */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FiUser className="text-primary-600" /> Basic Information
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label">Specialty *</label>
                <input
                  type="text"
                  name="specialty"
                  value={formData.specialty}
                  onChange={handleChange}
                  disabled={!editing}
                  placeholder="e.g. Cardiologist"
                  className="input dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
              </div>
              <div>
                <label className="label">Sub-Specialties <span className="text-gray-400 font-normal">(comma separated)</span></label>
                <input
                  type="text"
                  name="subSpecialties"
                  value={formData.subSpecialties}
                  onChange={handleChange}
                  disabled={!editing}
                  placeholder="e.g. Interventional Cardiology, Electrophysiology"
                  className="input dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
              </div>
              <div>
                <label className="label">Qualifications * <span className="text-gray-400 font-normal">(comma separated)</span></label>
                <input
                  type="text"
                  name="qualifications"
                  value={formData.qualifications}
                  onChange={handleChange}
                  disabled={!editing}
                  placeholder="e.g. MBBS, MD"
                  className="input dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
              </div>
              <div>
                <label className="label">Experience (years) *</label>
                <input
                  type="number"
                  name="experience"
                  value={formData.experience}
                  onChange={handleChange}
                  disabled={!editing}
                  placeholder="e.g. 10"
                  className="input dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
              </div>
              <div>
                <label className="label">License Number *</label>
                <input
                  type="text"
                  name="licenseNumber"
                  value={formData.licenseNumber}
                  onChange={handleChange}
                  disabled={!editing}
                  placeholder="e.g. MED-2024-001"
                  className="input dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
              </div>
              <div>
                <label className="label">Languages <span className="text-gray-400 font-normal">(comma separated)</span></label>
                <input
                  type="text"
                  name="languages"
                  value={formData.languages}
                  onChange={handleChange}
                  disabled={!editing}
                  placeholder="e.g. English, Telugu, Hindi"
                  className="input dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
              </div>
              <div className="md:col-span-2">
                <label className="label">Hospital/Clinic</label>
                <input
                  type="text"
                  name="hospital"
                  value={formData.hospital}
                  onChange={handleChange}
                  disabled={!editing}
                  placeholder="e.g. City General Hospital"
                  className="input dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
              </div>
              <div className="md:col-span-2">
                <label className="label">Bio</label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  disabled={!editing}
                  rows={3}
                  placeholder="Brief description about yourself and your expertise..."
                  className="input dark:bg-slate-800 dark:border-slate-700 dark:text-white resize-none"
                />
              </div>
            </div>
          </div>

          {/* Consultation Fees */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FiDollarSign className="text-primary-600" /> Consultation Fees
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label flex items-center gap-2">
                  <FiVideo size={14} /> Video Consultation Fee (₹)
                </label>
                <input
                  type="number"
                  name="videoFee"
                  value={formData.videoFee}
                  onChange={handleChange}
                  disabled={!editing}
                  placeholder="e.g. 500"
                  className="input dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
              </div>
              <div>
                <label className="label flex items-center gap-2">
                  <FiHome size={14} /> In-Person Consultation Fee (₹)
                </label>
                <input
                  type="number"
                  name="inPersonFee"
                  value={formData.inPersonFee}
                  onChange={handleChange}
                  disabled={!editing}
                  placeholder="e.g. 800"
                  className="input dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Availability */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FiClock className="text-primary-600" /> Availability <span className="text-sm text-gray-500 font-normal">(comma separated time slots)</span>
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map((day) => (
                <div key={day}>
                  <label className="label capitalize">{day}</label>
                  <input
                    type="text"
                    name={`${day}Slots`}
                    value={formData[`${day}Slots`]}
                    onChange={handleChange}
                    disabled={!editing}
                    placeholder="e.g. 09:00 AM, 10:00 AM, 02:00 PM"
                    className="input dark:bg-slate-800 dark:border-slate-700 dark:text-white text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
