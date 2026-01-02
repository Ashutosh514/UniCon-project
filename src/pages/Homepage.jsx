import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, BookOpen, Search, Zap, MessageCircle, Shield, Plus, MessageSquare, Clock, MapPin } from 'lucide-react';

export default function HomePage() {

const API = "https://unicon-project-2.onrender.com";
  
  const navigate = useNavigate();
  const [stats, setStats] = React.useState({ studentsCount: 0, solutionsShared: 0, itemsFound: 0 });
  const [recent, setRecent] = React.useState([]);
  const [showAllRecent, setShowAllRecent] = React.useState(false);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API}/api/stats`);
      if (!res.ok) return;
      const data = await res.json();
      setStats({ studentsCount: data.studentsCount || 0, solutionsShared: data.solutionsShared || 0, itemsFound: data.itemsFound || 0 });
    } catch (err) {
      console.error('Failed to fetch stats', err);
    }
  };

  React.useEffect(() => {
    fetchStats();
    fetchRecentActivity();
  }, []);

  const fetchRecentActivity = async () => {
    try {
      const [lostRes, resourcesRes, questionsRes, skillsRes] = await Promise.all([
        fetch(`${API}/api/lostitems`),
        fetch(`${API}/api/resources`),
        fetch(`${API}/api/questions`),
        fetch(`${API}/api/skills`)
      ]);

      const [lostItems, resources, questionsData, skills] = await Promise.all([
        lostRes.ok ? lostRes.json() : Promise.resolve([]),
        resourcesRes.ok ? resourcesRes.json() : Promise.resolve([]),
        questionsRes.ok ? questionsRes.json() : Promise.resolve({ questions: [] }),
        skillsRes.ok ? skillsRes.json() : Promise.resolve([])
      ]);

      const questions = Array.isArray(questionsData.questions) ? questionsData.questions : (questionsData || []);

      const mapped = [];

      const toMillis = (val) => {
        if (!val) return Date.now();
        if (typeof val === 'number') return val;
        // try parse string
        const parsed = Date.parse(val);
        if (!isNaN(parsed)) return parsed;
        const asNum = Number(val);
        return isNaN(asNum) ? Date.now() : asNum;
      };

      (lostItems || []).forEach(item => mapped.push({
        id: item._id || item.id,
        type: 'lostitem',
        title: item.title || item.name || 'Lost item',
        by: item.reportedBy || item.userId || 'Someone',
        timestamp: toMillis(item.timestamp || item.createdAt),
        icon: 'lost'
      }));

      (resources || []).forEach(r => mapped.push({
        id: r._id || r.id,
        type: 'resource',
        title: r.title || 'Resource shared',
        by: r.postedBy || r.userId || 'Someone',
        timestamp: toMillis(r.timestamp || r.createdAt),
        icon: 'resource'
      }));

      (questions || []).forEach(q => mapped.push({
        id: q._id || q.id,
        type: 'question',
        title: q.title || 'Question asked',
        by: q.authorName || q.author?.name || 'Someone',
        timestamp: toMillis(q.createdAt || q.updatedAt),
        icon: 'question'
      }));

      (skills || []).forEach(s => mapped.push({
        id: s._id || s.id,
        type: 'skill',
        title: s.title || 'Skill shared',
        by: s.postedBy || s.userId || 'Someone',
        timestamp: toMillis(s.timestamp || s.createdAt),
        icon: 'skill'
      }));

      // filter to last 2 days (48 hours)
      const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
      const cutoff = Date.now() - TWO_DAYS_MS;
      const recentFiltered = mapped.filter(i => (i.timestamp || 0) >= cutoff);

      // sort by newest first
      recentFiltered.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

      // keep full filtered list; UI will display first 5 by default
      setRecent(recentFiltered);
    } catch (err) {
      console.error('Failed to fetch recent activity', err);
    }
  };

  const fmt = (n) => {
    if (n >= 1000000) return `${Math.floor(n / 1000000)}M+`;
    if (n >= 1000) return `${Math.floor(n / 1000)}k+`;
    return String(n);
  };
  return (
    <main className="px-6 py-12 text-center mx-auto">
      <div className='flex flex-wrap justify-center'>
        <h1 className="text-5xl font-bold mb-4 text-black">Connecting Student.</h1>
        <h1 className='text-5xl font-bold text-blue-600'>Sharing Solution</h1>
      </div>
      <p className="text-gray-600 max-w-xl mx-auto mb-8">
        Find, Learn, Exchange  Together Your campus community where students connect, share knowledge, and help each other succeed.
      </p>
      <div class="hero-buttons flex gap-4 justify-center">
        <a class="btn btn-primary hover:transition-all duration-200 transform hover:scale-105" onClick={() => navigate('/lost-found')}>Get Started →</a>
        <a className="btn btn-outline text-black hover:text-white" onClick={() => navigate('/solution')}>Learn More</a>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 max-w-5xl mx-auto my-5">
        <div className="bg-white p-6 rounded-2xl text-center shadow hover:shadow-md hover:scale-105">
          <h2 className='font-semibold'><Users className="w-9 h-9 p-2 rounded-md bg-blue-200 text-blue-600 mx-auto" /></h2>
          <h3 className='text-black text-2xl font-bold'>{fmt(stats.studentsCount)}</h3>
          <p className="text-gray-500">Connected Student.</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow hover:shadow-md hover:scale-105">
          <h2> <BookOpen className="w-9 h-9 p-2 bg-purple-200 mx-auto rounded-md text-purple-600" /></h2>
          <h3 className='text-black text-2xl font-bold'>{fmt(stats.solutionsShared)}</h3>
          <p className="text-gray-500">Solution Shared</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow hover:shadow-md hover:scale-105">
          <h2> <Search className="w-9 h-9 p-2 bg-green-200 rounded-md mx-auto text-green-600" /></h2>
          <h3 className='text-black text-2xl font-bold'>{fmt(stats.itemsFound)}</h3>
          <p className="text-gray-500">Item Found.</p>
        </div>
      </div>
      <div className="my-20">
        <h1 className='text-black text-4xl'>Everything Problem from Campus</h1>
        <p className=' tex-xl text-gray-600 mx-auto max-w-3xl my-3 font-medium'>Unicon brings together all the tools and connections you need to thrive in your
          academic journey.
        </p>
        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 max-w-5xl mx-auto my-5">
          <div className="bg-white p-6 rounded-2xl text-center shadow hover:shadow-md">
            <h2 className='font-semibold'><Users className="w-9 h-9 p-2 rounded-md bg-blue-200 text-blue-600 mx-auto" /></h2>
            <h3 className='text-black font-bold'>Find Students</h3>
            <p className='text-gray-600'>Connect with classmates, study partners, and like-minded peers across your campus.</p>
          </div>
          <div className="bg-white p-6 rounded-2xl text-center shadow hover:shadow-md">
            <h2> <Search className="w-9 h-9 p-2 bg-green-200 rounded-md mx-auto text-green-600" /></h2>
            <h3 className='text-black font-bold'>Lost & Found</h3>
            <p className='text-gray-600'>Quickly report and find lost items with our smart campus-wide tracking system.</p>
          </div>
          <div className="bg-white p-6 rounded-2xl text-center shadow hover:shadow-md">
            <h2> <BookOpen className="w-9 h-9 p-2 bg-purple-200 mx-auto rounded-md text-purple-600" /></h2>
            <h3 className='text-black font-bold'>Share Solutions</h3>
            <p className='text-gray-600'>Exchange study materials, project ideas, and academic resources with your community.</p>
          </div>
          <div className="bg-white p-6 rounded-2xl text-center shadow hover:shadow-md">
            <h2> <Zap className="w-9 h-9 p-2 bg-purple-200 mx-auto rounded-md text-orange-600" /></h2>
            <h3 className='text-black font-bold'>Skill Exchange</h3>
            <p className='text-gray-600'>Trade skills, offer tutoring, and learn from fellow students in various subjects.</p>
          </div>
          <div className="bg-white p-6 rounded-2xl text-center shadow hover:shadow-md">
            <h2> <MessageCircle className="w-9 h-9 p-2 bg-purple-200 mx-auto rounded-md text-pink-600" /></h2>
            <h3 className='text-black font-bold'>Campus Chat</h3>
            <p className='text-gray-600'>Join discussions, ask questions, and stay updated with campus events and news.</p>
          </div>
          <div className="bg-white p-6 rounded-2xl text-center shadow hover:shadow-md">
            <h2> <Shield className="w-9 h-9 p-2 bg-purple-200 mx-auto rounded-md text-indigo-600" /></h2>
            <h3 className='text-black font-bold'>Safe & Secure</h3>
            <p className='text-gray-600'>Verified student profiles and secure messaging ensure a trusted environment.</p>
          </div>
        </div>
      </div>
      <div>
        <div className="my-20">
          <h1 className='text-black text-3xl font-bold'>Quick Action</h1>
          <p className=' tex-xl text-gray-600 mx-auto max-w-3xl my-3 font-medium'> Get started with the most popular features</p>
          <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 max-w-5xl mx-auto my-5">
            <div className="bg-white p-6 rounded-2xl text-center shadow hover:shadow-md"
              onClick={() => navigate('/lost-found')}>
              <h2> <Plus className='w-10 h-10 p-2 bg-red-200 mx-auto rounded-md text-red-600' /></h2>
              <h3 className='text-gray-950'>Post Lost Item</h3>
              <p className='text-gray-600'>Report something you lost</p>
            </div>
            <div className="bg-white p-6 rounded-2xl text-center shadow hover:shadow-md"
              onClick={() => navigate('/lost-found')}>
              <h2> <Search className="w-10 h-10 p-2 bg-green-200 rounded-md mx-auto text-green-600" /></h2>
              <h3 className='text-black'>Find Something</h3>
              <p className='text-gray-600'>Search for lost items</p>
            </div>
            <div className="bg-white p-6 rounded-2xl text-center shadow hover:shadow-md"
              onClick={() => navigate('/solution')}>
              <h2> <MessageSquare className="w-10 h-10 p-2 bg-blue-200 rounded-md mx-auto text-blue-600" /></h2>
              <h3 className='text-black'>Ask Questions</h3>
              <p className='text-gray-600'>Get help from peers</p>
            </div>
            <div className="bg-white p-6 rounded-2xl text-center shadow hover:shadow-md"
              onClick={() => navigate('/skill-exchange')}>
              <h2> <Users className="w-10 h-10 p-2 bg-purple-200 rounded-md mx-auto text-purple-600" /></h2>
              <h3 className='text-black'>Find Study Group</h3>
              <p className='text-gray-600'>Connect with classmates</p>
            </div>
          </div>
        </div>
      </div>
      <div className="my-20 ">
        <div className='text-black flex justify-between'>
          <h3>Recent Activity</h3>
          <div className='flex justify-end mb-2'>
            <button onClick={() => setShowAllRecent(prev => !prev)} className='text-blue-600'>
              {showAllRecent ? 'Show less' : 'View All'}
            </button>
          </div>
        </div>
        <div className="grid gap-2 my-5 mx-auto w-full max-w-4xl px-2 sm:px-4">
          {recent.length === 0 ? (
            <div className="text-gray-500 p-6 text-center">No recent activity yet.</div>
          ) : (
            (showAllRecent ? recent : recent.slice(0, 5)).map((item) => (
              <div
                key={item.id}
                className="bg-white p-4 sm:p-6 rounded-2xl text-center gap-3 shadow hover:shadow-md"
              >
                <div className="flex flex-col sm:flex-row justify-start sm:items-center gap-4 sm:gap-6 text-left">
                  <h2>
                    {item.icon === "lost" && (
                      <MapPin className="w-9 h-9 p-2 bg-red-200 rounded-md text-red-600" />
                    )}
                    {item.icon === "resource" && (
                      <BookOpen className="w-9 h-9 p-2 bg-blue-200 rounded-md text-blue-600" />
                    )}
                    {item.icon === "question" && (
                      <MessageSquare className="w-9 h-9 p-2 bg-green-200 rounded-md text-green-600" />
                    )}
                    {item.icon === "skill" && (
                      <Users className="w-9 h-9 p-2 bg-purple-200 rounded-md text-purple-600" />
                    )}
                  </h2>
                  <h2 className="text-black text-base sm:text-lg font-medium">{item.title}</h2>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mt-2 sm:ml-12">
                  <h3 className="text-gray-600 text-sm sm:text-base">by {item.by}</h3>
                  <h3 className="text-gray-600 flex gap-1 text-xs sm:text-sm items-center">
                    <Clock className="text-gray-600 w-4 h-4" />
                    {new Date(item.timestamp).toLocaleString()}
                  </h3>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
