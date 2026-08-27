import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { FiSearch, FiFilter, FiStar, FiMapPin, FiClock, FiVideo, FiSliders } from "react-icons/fi";
import { doctorAPI } from "../../services/api";

const specialties = ["All", "General", "Cardiologist", "Neurologist", "Dermatologist", "Pediatrician", "Orthopedic", "Gynecologist", "Psychiatrist", "Ophthalmologist"];

const gradients = [
  "from-blue-500 to-blue-700", "from-green-500 to-green-700", "from-purple-500 to-purple-700",
  "from-orange-500 to-orange-700", "from-pink-500 to-pink-700", "from-teal-500 to-teal-700",
];

export default function DoctorListPage() {
  const [searchParams] = useSearchParams();
  const queryParam = searchParams.get("search") || "";
  const [search, setSearch] = useState(queryParam);
  const [selectedSpec, setSelectedSpec] = useState("All");
  const [sortBy, setSortBy] = useState("rating");
  const [showFilters, setShowFilters] = useState(false);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [consultType, setConsultType] = useState("all"); // 'all' | 'video' | 'in-person'
  const [priceRange, setPriceRange] = useState(500);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const res = await doctorAPI.getAll();
        setDoctors(res.data.data.doctors || []);
      } catch (err) {
        console.error("Failed to fetch doctors:", err);
        setDoctors([]);
      } finally {
        setLoading(false);
      }
    };
    fetchDoctors();
  }, []);

  const demoDoctors = [
    { id: 1, name: "Dr. Sarah Johnson", specialty: "Cardiologist", rating: 4.9, reviews: 312, experience: 12, location: "New York, NY", fee: 150, available: true, avatar: "SJ", tags: ["Video", "In-person"] },
    { id: 2, name: "Dr. Michael Chen", specialty: "Neurologist", rating: 4.8, reviews: 245, experience: 15, location: "Los Angeles, CA", fee: 180, available: true, avatar: "MC", tags: ["Video"] },
    { id: 3, name: "Dr. Emily Davis", specialty: "Dermatologist", rating: 4.7, reviews: 189, experience: 8, location: "Chicago, IL", fee: 120, available: false, avatar: "ED", tags: ["In-person"] },
  ];

  const combinedDoctors = [...doctors];
  if (doctors.length < 2) {
    demoDoctors.forEach(demo => {
      if (!doctors.find(d => (d.name || d.user?.name) === demo.name)) {
        combinedDoctors.push(demo);
      }
    });
  }

  const filtered = combinedDoctors
    .filter((d) => {
      const docName = d.name || d.user?.name || "";
      const specialty = d.specialty || "";
      const fee = d.fee || d.consultationFee?.video || 0;
      const tags = d.tags || [
        d.consultationTypes?.video && "Video",
        d.consultationTypes?.inPerson && "In-person"
      ].filter(Boolean);

      const matchSearch = docName.toLowerCase().includes(search.toLowerCase()) ||
        specialty.toLowerCase().includes(search.toLowerCase());

      const matchSpec = selectedSpec === "All" || specialty === selectedSpec;

      const matchAvail = !availableOnly || d.available !== false;

      const matchType = consultType === "all" ||
        tags.some(t => t.toLowerCase().includes(consultType.toLowerCase()));

      const matchPrice = fee <= priceRange;

      return matchSearch && matchSpec && matchAvail && matchType && matchPrice;
    })
    .sort((a, b) => {
      if (sortBy === "rating") return (b.rating || b.averageRating || 0) - (a.rating || a.averageRating || 0);
      const feeA = a.fee || a.consultationFee?.video || 0;
      const feeB = b.fee || b.consultationFee?.video || 0;
      return feeA - feeB;
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-heading font-bold text-gray-900">Find a Doctor</h1>
        <p className="text-gray-500 text-sm mt-1">{filtered.length} doctors available</p>
      </div>

      {/* Search & Filter bar */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search by name or specialty..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`btn-outline gap-2 flex-shrink-0 ${showFilters ? "bg-primary-50" : ""}`}
        >
          <FiSliders size={16} /> Filters
        </button>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="input w-auto flex-shrink-0 cursor-pointer"
        >
          <option value="rating">Top Rated</option>
          <option value="fee">Lowest Fee</option>
        </select>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="card p-5 space-y-6 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800"
        >
          <div className="grid sm:grid-cols-3 gap-6">
            {/* Availability */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-3">Availability</h3>
              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={availableOnly}
                  onChange={(e) => setAvailableOnly(e.target.checked)}
                  className="w-4 h-4 rounded text-primary-600"
                />
                Available today only
              </label>
            </div>

            {/* Consultation Type */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-3">Consultation</h3>
              <div className="flex flex-wrap gap-2">
                {["all", "video", "in-person"].map((type) => (
                  <button
                    key={type}
                    onClick={() => setConsultType(type)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border capitalize transition-all ${
                      consultType === type
                        ? "bg-primary-500 text-white border-primary-500"
                        : "bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-400 border-gray-200 dark:border-slate-700"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Max Fee */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-3">Max Fee: ${priceRange}</h3>
              <input
                type="range"
                min="0"
                max="500"
                step="10"
                value={priceRange}
                onChange={(e) => setPriceRange(parseInt(e.target.value))}
                className="w-full accent-primary-600"
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                <span>$0</span>
                <span>$500</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-slate-800 flex justify-end">
            <button
              onClick={() => {
                setAvailableOnly(false);
                setConsultType("all");
                setPriceRange(500);
                setSelectedSpec("All");
                setSearch("");
              }}
              className="text-xs font-semibold text-primary-600 hover:text-primary-700"
            >
              Reset All Filters
            </button>
          </div>
        </motion.div>
      )}

      {/* Specialty chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {specialties.map((s) => (
          <button
            key={s}
            onClick={() => setSelectedSpec(s)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              selectedSpec === s
                ? "bg-primary-500 text-white shadow-primary"
                : "bg-white border border-gray-200 text-gray-600 hover:border-primary-300"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Doctor cards */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map((doc, i) => (
          <motion.div
            key={doc.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="card-hover p-5"
          >
            <div className="flex items-start gap-4">
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${gradients[i % gradients.length]} flex items-center justify-center text-white font-bold text-lg flex-shrink-0`}>
                {doc.avatar || (doc.name || doc.user?.name || "DR")?.split(" ").map(n => n[0]).join("")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm leading-tight">{doc.name || doc.user?.name}</h3>
                    <p className="text-xs text-primary-600 font-medium mt-0.5">{doc.specialty}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                    doc.available !== false ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                  }`}>
                    {doc.available !== false ? "Available" : "Busy"}
                  </span>
                </div>

                <div className="flex items-center gap-1 mt-2">
                  <FiStar size={12} className="text-amber-400 fill-amber-400" />
                  <span className="text-xs font-semibold text-gray-900">{doc.rating || 4.5}</span>
                  <span className="text-xs text-gray-400">({doc.reviews || 0} reviews)</span>
                </div>

                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><FiClock size={11} /> {doc.experience || 5}y exp</span>
                  <span className="flex items-center gap-1"><FiMapPin size={11} /> {(doc.location || doc.hospital || "Remote").split(",")[0]}</span>
                </div>

                <div className="flex gap-1.5 mt-2">
                  {(doc.tags || [
                    doc.consultationTypes?.video && "Video",
                    doc.consultationTypes?.inPerson && "In-person"
                  ].filter(Boolean)).length > 0 ? (doc.tags || [
                    doc.consultationTypes?.video && "Video",
                    doc.consultationTypes?.inPerson && "In-person"
                  ].filter(Boolean)).map((t) => (
                    <span key={t} className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      t.toLowerCase().includes("video") ? "bg-blue-100 text-blue-600" : "bg-green-100 text-green-600"
                    }`}>
                      {t.toLowerCase().includes("video") && <FiVideo size={9} className="inline mr-0.5" />}{t}
                    </span>
                  )) : (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Contact for details</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
              <div>
                <span className="text-lg font-bold text-gray-900">${doc.fee || doc.consultationFee?.video || 100}</span>
                <span className="text-xs text-gray-400 ml-1">/ session</span>
              </div>
              <Link
                to={`/doctors/${doc.user?._id || doc.id}`}
                className="btn-primary btn-sm"
              >
                Book Now
              </Link>
            </div>
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <span className="text-5xl">🔍</span>
          <p className="text-gray-500 mt-4">No doctors found matching your criteria.</p>
          <button onClick={() => { setSearch(""); setSelectedSpec("All"); }} className="btn-outline mt-4">
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
}
