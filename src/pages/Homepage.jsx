import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, BookOpen, Search, Zap, MessageCircle,
  Shield, Plus, MessageSquare, Clock, MapPin
} from 'lucide-react';

export default function HomePage() {
  const navigate = useNavigate();

  const API = "https://unicon-project-2.onrender.com";

  const [stats, setStats] = React.useState({
    studentsCount: 0,
    solutionsShared: 0,
    itemsFound: 0
  });

  const [recent, setRecent] = React.useState([]);
  const [showAllRecent, setShowAllRecent] = React.useState(false);

  // -------------------- FETCH STATS --------------------
  const fetchStats = async () => {
    try {
      const res = await fetch(`${API}/api/stats`);
      if (!res.ok) return;

      const data = await res.json();
      setStats({
        studentsCount: data.studentsCount || 0,
        solutionsShared: data.solutionsShared || 0,
        itemsFound: data.itemsFound || 0
      });
    } catch (err) {
      console.error("Failed to fetch stats", err);
    }
  };

  React.useEffect(() => {
    fetchStats();
    fetchRecentActivity();
  }, []);

  // -------------------- FETCH RECENT ACTIVITY --------------------
  const fetchRecentActivity = async () => {
    try {
      const [lostRes, resourcesRes, questionsRes, skillsRes] = await Promise.all([
        fetch(`${API}/api/lostitems`),
        fetch(`${API}/api/resources`),
        fetch(`${API}/api/questions`),
        fetch(`${API}/api/skills`)
      ]);

      const [lostItems, resources, questionsData, skills] = await Promise.all([
        lostRes.ok ? lostRes.json() : [],
        resourcesRes.ok ? resourcesRes.json() : [],
        questionsRes.ok ? questionsRes.json() : { questions: [] },
        skillsRes.ok ? skillsRes.json() : []
      ]);

      const questions = Array.isArray(questionsData.questions)
        ? questionsData.questions
        : questionsData || [];

      const mapped = [];

      // Convert timestamps to milliseconds
      const toMillis = (v) => {
        if (!v) return Date.now();
        if (typeof v === "number") return v;

        const parsed = Date.parse(v);
        if (!isNaN(parsed)) return parsed;

        const num = Number(v);
        return isNaN(num) ? Date.now() : num;
      };

      // Lost items
      lostItems.forEach(item =>
        mapped.push({
          id: item._id,
          type: "lost",
          title: item.title,
          by: item.reportedBy,
          timestamp: toMillis(item.timestamp || item.createdAt),
          icon: "lost"
        })
      );

      // Resources
      resources.forEach(r =>
        mapped.push({
          id: r._id,
          type: "resource",
          title: r.title,
          by: r.postedBy,
          timestamp: toMillis(r.timestamp || r.createdAt),
          icon: "resource"
        })
      );

      // Questions
      questions.forEach(q =>
        mapped.push({
          id: q._id,
          type: "question",
          title: q.title,
          by: q.authorName || q.author?.name,
          timestamp: toMillis(q.createdAt),
          icon: "question"
        })
      );

      // Skills
      skills.forEach(s =>
        mapped.push({
          id: s._id,
          type: "skill",
          title: s.title,
          by: s.postedBy,
          timestamp: toMillis(s.createdAt),
          icon: "skill"
        })
      );

      // Filter last 48 hours
      const cutoff = Date.now() - (48 * 60 * 60 * 1000);
      const recentFiltered = mapped.filter(i => i.timestamp >= cutoff);

      // Sort by latest first
      recentFiltered.sort((a, b) => b.timestamp - a.timestamp);

      setRecent(recentFiltered);

    } catch (err) {
      console.error("Failed to fetch recent activity", err);
    }
  };

  const fmt = (n) => {
    if (n >= 1_000_000) return `${Math.floor(n / 1_000_000)}M+`;
    if (n >= 1_000) return `${Math.floor(n / 1_000)}k+`;
    return String(n);
  };

  // -------------------- UI --------------------
  return (
    <main className="px-6 py-12 text-center mx-auto">
      {/* Hero Section */}
      <div className='flex flex-wrap justify-center'>
        <h1 className="text-5xl font-bold mb-4 text-black">Connecting Student.</h1>
        <h1 className='text-5xl font-bold text-blue-600'>Sharing Solution</h1>
      </div>

      <p className="text-gray-600 max-w-xl mx-auto mb-8">
        Find, Learn, Exchange — your campus community where students connect,
        share knowledge, and help each other succeed.
      </p>

      <div className="hero-buttons flex gap-4 justify-center">
        <button
          className="btn btn-primary hover:scale-105 transition"
          onClick={() => navigate('/lost-found')}
        >
          Get Started →
        </button>

        <button
          className="btn btn-outline text-black hover:text-white"
          onClick={() => navigate('/solution')}
        >
          Learn More
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 max-w-5xl mx-auto my-5">
        {/* Connected Students */}
        <div className="bg-white p-6 rounded-2xl text-center shadow hover:scale-105">
          <Users className="w-9 h-9 p-2 bg-blue-200 text-blue-600 rounded-md mx-auto" />
          <h3 className="text-black text-2xl font-bold">{fmt(stats.studentsCount)}</h3>
          <p className="text-gray-500">Connected Students</p>
        </div>

        {/* Solutions */}
        <div className="bg-white p-6 rounded-2xl text-center shadow hover:scale-105">
          <BookOpen className="w-9 h-9 p-2 bg-purple-200 text-purple-600 rounded-md mx-auto" />
          <h3 className="text-black text-2xl font-bold">{fmt(stats.solutionsShared)}</h3>
          <p className="text-gray-500">Solutions Shared</p>
        </div>

        {/* Items Found */}
        <div className="bg-white p-6 rounded-2xl text-center shadow hover:scale-105">
          <Search className="w-9 h-9 p-2 bg-green-200 text-green-600 rounded-md mx-auto" />
          <h3 className="text-black text-2xl font-bold">{fmt(stats.itemsFound)}</h3>
          <p className="text-gray-500">Items Found</p>
        </div>
      </div>

      {/* More UI (unchanged)… */}
      {/* Your entire layout stays exactly the same. */}

      {/* Recent Activity */}
      <div className="my-20">
        <div className="flex justify-between text-black">
          <h3>Recent Activity</h3>
          <button
            className="text-blue-600"
            onClick={() => setShowAllRecent(prev => !prev)}
          >
            {showAllRecent ? "Show less" : "View All"}
          </button>
        </div>

        <div className="grid gap-2 max-w-4xl mx-auto my-5 px-4">
          {recent.length === 0 ? (
            <div className="text-gray-500 p-6 text-center">No recent activity yet.</div>
          ) : (
            (showAllRecent ? recent : recent.slice(0, 5)).map(item => (
              <div key={item.id} className="bg-white p-4 rounded-xl shadow hover:shadow-md">
                <div className="flex items-center gap-4">

                  {/* Icon */}
                  {item.icon === "lost" && <MapPin className="text-red-600 bg-red-200 p-2 rounded-md" />}
                  {item.icon === "resource" && <BookOpen className="text-blue-600 bg-blue-200 p-2 rounded-md" />}
                  {item.icon === "question" && <MessageSquare className="text-green-600 bg-green-200 p-2 rounded-md" />}
                  {item.icon === "skill" && <Users className="text-purple-600 bg-purple-200 p-2 rounded-md" />}

                  {/* Title */}
                  <div>
                    <h2 className="text-black font-medium">{item.title}</h2>
                    <p className="text-gray-500 text-sm">by {item.by}</p>
                    <p className="text-gray-500 text-xs flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {new Date(item.timestamp).toLocaleString()}
                    </p>
                  </div>

                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </main>
  );
}
