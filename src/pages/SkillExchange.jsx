import { useState, useEffect } from "react";
import {
  X,
  Plus,
  Search,
  Pencil,
  Trash2,
  BookOpen,
  Zap,
  Briefcase,
  Globe,
  Shield,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { validateUploadContent, getContentPolicyText } from "../utils/contentModeration";

const API = "https://unicon-project-2.onrender.com";

export default function SkillExchange() {
  const { userId, userName, userRole } = useAuth();

  const [skills, setSkills] = useState([]);
  const [filteredSkills, setFilteredSkills] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [skillToView, setSkillToView] = useState(null);
  const [skillToDelete, setSkillToDelete] = useState(null);

  const [showContentPolicy, setShowContentPolicy] = useState(false);
  const [contentPolicyAccepted, setContentPolicyAccepted] = useState(false);

  // Fetch Skills ---------------------------------------------------
  const fetchSkills = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/api/skills`);
      const data = await res.json();
      setSkills(data);
      setFilteredSkills(data);
    } catch (err) {
      setError("Failed to load skills from backend");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSkills();
  }, []);

  // Search Filter ---------------------------------------------------
  useEffect(() => {
    if (!searchQuery.trim()) return setFilteredSkills(skills);

    const q = searchQuery.toLowerCase();
    setFilteredSkills(
      skills.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q)
      )
    );
  }, [searchQuery, skills]);

  // Delete Skill ----------------------------------------------------
  const handleDeleteSkill = async (id) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return setError("Login required to delete.");

      const res = await fetch(`${API}/api/skills/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to delete skill");

      fetchSkills();
      setIsDeleteModalOpen(false);
    } catch (err) {
      setError(err.message);
    }
  };

  // Post Skill Modal Component -------------------------------------
  const PostSkillModal = ({ onSuccess }) => {
    const [form, setForm] = useState({
      title: "",
      description: "",
      category: "",
      videoUrl: "",
      thumbnailFile: null,
      thumbnailLink: "",
      type: "practical",
    });

    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
      e.preventDefault();

      if (!contentPolicyAccepted)
        return setError("Please accept the content policy.");

      const token = localStorage.getItem("token");
      if (!token) return setError("Login session expired.");

      if (form.thumbnailFile) {
        const validation = await validateUploadContent(form.thumbnailFile);
        if (!validation.overallValid)
          return setError(validation.errors.join(", "));
      }

      const fd = new FormData();
      Object.entries(form).forEach(([key, val]) => {
        if (key === "thumbnailFile") {
          if (val) fd.append("thumbnail", val);
        } else fd.append(key, val);
      });

      fd.append("postedBy", userName);
      fd.append("userId", userId);

      try {
        setSubmitting(true);

        const res = await fetch(`${API}/api/skills`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });

        if (!res.ok) throw new Error("Failed to post skill");

        onSuccess();
        setIsPostModalOpen(false);
      } catch (err) {
        setError(err.message);
      } finally {
        setSubmitting(false);
      }
    };

    const categories = [
      "Videography",
      "Photo Editing",
      "Photography",
      "Language Teaching",
      "Coding",
      "Projects",
    ];

    return (
      <div className="modal-bg">
        <div className="modal-container">
          <div className="modal-header">
            <h2>Post New Skill</h2>
            <button onClick={() => setIsPostModalOpen(false)}>
              <X />
            </button>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* TITLE */}
            <input
              required
              placeholder="Skill title"
              className="input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />

            {/* DESC */}
            <textarea
              required
              rows="3"
              placeholder="Skill description"
              className="input"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />

            {/* CATEGORY */}
            <select
              required
              className="input"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              <option value="">Select Category</option>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>

            {/* TYPE */}
            <select
              required
              className="input"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option value="practical">Practical Video</option>
              <option value="live">Live Session</option>
              <option value="video">Video</option>
            </select>

            {/* VIDEO URL */}
            <input
              required
              placeholder="YouTube URL"
              className="input"
              value={form.videoUrl}
              onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
            />

            {/* THUMBNAIL */}
            <input
              type="url"
              placeholder="Thumbnail link (optional)"
              className="input"
              value={form.thumbnailLink}
              onChange={(e) =>
                setForm({ ...form, thumbnailLink: e.target.value })
              }
            />

            <input
              type="file"
              accept="image/*"
              className="input"
              onChange={(e) =>
                setForm({
                  ...form,
                  thumbnailFile: e.target.files[0],
                  thumbnailLink: "",
                })
              }
            />

            {/* POLICY */}
            <label className="flex gap-2 items-start text-sm">
              <input
                type="checkbox"
                checked={contentPolicyAccepted}
                onChange={() => setContentPolicyAccepted(!contentPolicyAccepted)}
              />
              I agree to the{" "}
              <button
                type="button"
                onClick={() => setShowContentPolicy(true)}
                className="text-blue-400 underline"
              >
                content policy
              </button>
            </label>

            <button className="primary-btn" disabled={submitting}>
              {submitting ? "Posting..." : "Post Skill"}
            </button>
          </form>
        </div>
      </div>
    );
  };

  // View Modal ------------------------------------------------------
  const ViewSkillModal = ({ skill }) => {
    if (!skill) return null;

    const getEmbed = (url) => {
      const match = url.match(/v=([^&]+)/);
      return match ? `https://www.youtube.com/embed/${match[1]}` : url;
    };

    return (
      <div className="modal-bg">
        <div className="modal-container">
          <div className="modal-header">
            <h2>{skill.title}</h2>
            <button onClick={() => setIsViewModalOpen(false)}>
              <X />
            </button>
          </div>

          <iframe
            src={getEmbed(skill.videoUrl)}
            className="w-full rounded-xl h-64"
          ></iframe>

          <p className="text-gray-300 mt-4">{skill.description}</p>

          <div className="mt-4 flex justify-between text-gray-400 text-sm">
            <span>Category: {skill.category}</span>
            <span>By {skill.postedBy}</span>
          </div>
        </div>
      </div>
    );
  };

  // Delete Modal ----------------------------------------------------
  const DeleteModal = () => (
    <div className="modal-bg">
      <div className="modal-container">
        <h2 className="text-xl font-semibold text-red-400 mb-3">
          Confirm Delete
        </h2>
        <p className="mb-4 text-gray-300">
          This action cannot be undone. Are you sure?
        </p>

        <div className="flex justify-end gap-3">
          <button className="gray-btn" onClick={() => setIsDeleteModalOpen(false)}>
            Cancel
          </button>
          <button
            className="danger-btn"
            onClick={() => handleDeleteSkill(skillToDelete._id)}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );

  // Content Policy Modal -------------------------------------------
  const ContentPolicyModal = () => (
    <div className="modal-bg">
      <div className="modal-container">
        <div className="modal-header">
          <h2 className="flex items-center gap-2">
            <Shield className="text-blue-400" /> Content Policy
          </h2>
          <button onClick={() => setShowContentPolicy(false)}>
            <X />
          </button>
        </div>

        <div className="text-gray-300 whitespace-pre-line">
          {getContentPolicyText()}
        </div>

        <button
          className="primary-btn mt-4"
          onClick={() => setShowContentPolicy(false)}
        >
          I Understand
        </button>
      </div>
    </div>
  );

  // JSX -------------------------------------------------------------
  return (
    <div className="bg-gray-100 min-h-screen text-gray-900">
      <header className="bg-pink-700 text-white py-16 text-center shadow-lg">
        <h1 className="text-5xl font-bold">Skill Exchange</h1>

        <div className="flex justify-center mt-6 gap-4">
          <input
            type="text"
            placeholder="Search skills..."
            className="search-input"
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <button
            className="primary-btn"
            onClick={() => setIsPostModalOpen(true)}
          >
            <Plus /> Post Skill
          </button>
        </div>
      </header>

      <main className="container mx-auto p-6">
        {loading && <p className="text-center text-gray-500">Loading...</p>}
        {error && <p className="error-box">{error}</p>}

        <div className="grid md:grid-cols-3 gap-6">
          {filteredSkills.map((skill) => (
            <div key={skill._id} className="skill-card">
              <img
                src={
                  skill.thumbnailUrl ||
                  `https://placehold.co/600x400/1F2937/EEE?text=${skill.category}`
                }
                className="skill-img"
              />

              <div className="p-4">
                <h3 className="skill-title">{skill.title}</h3>
                <p className="skill-desc">{skill.description}</p>

                <div className="skill-footer">
                  <span className="text-gray-500 text-sm">
                    By {skill.postedBy}
                  </span>

                  <div className="flex gap-2">
                    <button
                      className="icon-btn"
                      onClick={() => {
                        setSkillToView(skill);
                        setIsViewModalOpen(true);
                      }}
                    >
                      <BookOpen />
                    </button>

                    {(skill.userId === userId || userRole === "admin") && (
                      <button
                        className="icon-btn text-red-500"
                        onClick={() => {
                          setSkillToDelete(skill);
                          setIsDeleteModalOpen(true);
                        }}
                      >
                        <Trash2 />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {isPostModalOpen && (
        <PostSkillModal
          onSuccess={() => {
            fetchSkills();
            setIsPostModalOpen(false);
          }}
        />
      )}

      {isViewModalOpen && (
        <ViewSkillModal skill={skillToView} onClose={() => setIsViewModalOpen(false)} />
      )}

      {isDeleteModalOpen && <DeleteModal />}
      {showContentPolicy && <ContentPolicyModal />}
    </div>
  );
}
