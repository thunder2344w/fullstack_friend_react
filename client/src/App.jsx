import { useEffect, useMemo, useState } from "react";

const API = "/api";

function token() {
  return localStorage.getItem("authToken");
}

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || "Something went wrong");
    error.status = response.status;
    throw error;
  }
  return data;
}

function route() {
  const [path, query = ""] = window.location.hash.slice(1).split("?");
  return { path: path || "/dashboard", params: new URLSearchParams(query) };
}

function navigate(path) {
  window.location.hash = path;
}

function useRoute() {
  const [current, setCurrent] = useState(route);
  useEffect(() => {
    const update = () => setCurrent(route());
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  return current;
}

function Notice({ message, type = "error" }) {
  if (!message) return null;
  return <p className={`notice notice-${type}`}>{message}</p>;
}

function AuthLayout({ children, eyebrow, title, subtitle }) {
  return (
    <main className="auth-shell">
      <section className="auth-aside">
        <div className="brand-mark">ff</div>
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
          <p className="muted">{subtitle}</p>
          {children}
        </div>
      </section>
    </main>
  );
}

function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setMessage("");
    setBusy(true);
    try {
      const data = await request("/login", { method: "POST", body: JSON.stringify({ ...form, email: form.email.trim() }) });
      localStorage.setItem("authToken", data.token);
      navigate("/dashboard");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout eyebrow="WELCOME BACK" title="" subtitle="Log in to check in with your people.">
      <form className="stack-form" onSubmit={submit}>
        <label>Email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@example.com" required /></label>
        <label>Password<input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Your password" required /></label>
        <Notice message={message} />
        <button className="button button-primary" disabled={busy}>{busy ? "Checking in..." : "Log in"}<span>→</span></button>
      </form>
      <p className="auth-switch">New here? <button className="text-button" onClick={() => navigate("/signup")}>Create an account</button></p>
    </AuthLayout>
  );
}

function Signup() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setMessage("");
    setBusy(true);
    try {
      await request("/signup", { method: "POST", body: JSON.stringify(form) });
      navigate("/login");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout eyebrow="START CONNECTING" title="Your people, in one place." subtitle="Set up your profile and start building your circle.">
      <form className="stack-form" onSubmit={submit}>
        <label>Name<input type="text" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Your name" required /></label>
        <label>Email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@example.com" required /></label>
        <label>Password<input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="8+ characters and a number" required /></label>
        <Notice message={message} />
        <button className="button button-primary" disabled={busy}>{busy ? "Creating..." : "Create account"}<span>→</span></button>
      </form>
      <p className="auth-switch">Already have an account? <button className="text-button" onClick={() => navigate("/login")}>Log in</button></p>
    </AuthLayout>
  );
}

function EmptyState({ children }) {
  return <div className="empty-state"><span className="empty-dot" />{children}</div>;
}

function Dashboard() {
  const [profile, setProfile] = useState(null);
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [email, setEmail] = useState("");
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadDashboard() {
    try {
      const [profileData, friendsData, requestData, sentData] = await Promise.all([
        request("/profile"), request("/friends"), request("/friends/requests"), request("/friends/sent"),
      ]);
      setProfile(profileData.user);
      setFriends(friendsData.friends || []);
      setRequests(requestData.friendRequests || []);
      setSentRequests(sentData.sentRequests || []);
    } catch (error) {
      if (error.status === 401 || !token()) logout();
      else setNotice({ text: error.message, type: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadDashboard(); }, []);

  async function sendRequest(event) {
    event.preventDefault();
    if (!email.trim()) return setNotice({ text: "Enter an email address first.", type: "error" });
    try {
      const data = await request("/friends/request", { method: "POST", body: JSON.stringify({ email: email.trim() }) });
      setNotice({ text: data.message, type: "success" });
      setEmail("");
      loadDashboard();
    } catch (error) { setNotice({ text: error.message, type: "error" }); }
  }

  async function respond(senderId, action) {
    try {
      const data = await request("/friends/respond", { method: "POST", body: JSON.stringify({ senderId, action }) });
      setNotice({ text: data.message, type: "success" });
      loadDashboard();
    } catch (error) { setNotice({ text: error.message, type: "error" }); }
  }

  async function removeFriend(friendId) {
    try {
      const data = await request("/friends/remove", { method: "POST", body: JSON.stringify({ friendId }) });
      setNotice({ text: data.message, type: "success" });
      loadDashboard();
    } catch (error) { setNotice({ text: error.message, type: "error" }); }
  }

  if (loading) return <main className="loading-screen"><div className="spinner" />Loading your circle...</main>;

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand-button" onClick={() => navigate("/dashboard")}><span className="brand-mark small">ff</span><span>friends</span></button>
        <div className="topbar-actions"><span className="online-dot" />{profile?.name || "Your circle"}<button className="logout-button" onClick={logout}>Log out</button></div>
      </header>
      <div className="dashboard-content">
        <section className="welcome-row"><div><p className="eyebrow">YOUR SPACE</p><h1>Good morning, {profile?.name?.split(" ")[0] || "friend"}.</h1><p className="muted">Keep your circle close and your conversations moving.</p></div><div className="date-chip">{new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date())}</div></section>
        <Notice message={notice?.text} type={notice?.type} />
        <section className="dashboard-grid">
          <div className="panel profile-panel"><div className="panel-heading"><div><p className="eyebrow">PROFILE</p><h2>Your details</h2></div><div className="avatar">{profile?.name?.charAt(0).toUpperCase() || "F"}</div></div><div className="profile-details"><div><span>Email</span><strong>{profile?.email || "Not available"}</strong></div></div></div>
          <div className="panel invite-panel"><p className="eyebrow">GROW YOUR CIRCLE</p><h2>Invite someone new.</h2><p className="muted">Send a friend request with their email address.</p><form className="inline-form" onSubmit={sendRequest}><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="friend@example.com" /><button className="button button-primary">Send invite <span>→</span></button></form></div>
        </section>
        <section className="panel"><div className="section-heading"><div><p className="eyebrow">PEOPLE</p><h2>Your circle <span className="count">{friends.length}</span></h2></div></div>{friends.length === 0 ? <EmptyState>Your friend circle is waiting for its first connection.</EmptyState> : <div className="people-list">{friends.map((friend) => <div className="person-row" key={friend._id}><div className="person-avatar">{friend.name.charAt(0).toUpperCase()}</div><div className="person-info"><strong>{friend.name}{friend.unreadCount > 0 && <span className="unread-count">{friend.unreadCount}</span>}</strong><span>{friend.email}</span></div><div className="person-actions"><button className="button button-quiet" onClick={() => navigate(`/chat?friend=${friend._id}&name=${encodeURIComponent(friend.name)}`)}>Message</button><button className="icon-button" title="Remove friend" onClick={() => removeFriend(friend._id)}>×</button></div></div>)}</div>}</section>
        <section className="split-panels"><div className="panel"><div className="section-heading"><div><p className="eyebrow">INCOMING</p><h2>Friend requests <span className="count">{requests.length}</span></h2></div></div>{requests.length === 0 ? <EmptyState>No pending requests.</EmptyState> : requests.map((person) => <div className="request-row" key={person._id}><div className="person-avatar warm">{person.name.charAt(0).toUpperCase()}</div><div className="person-info"><strong>{person.name}</strong><span>{person.email}</span></div><div className="request-actions"><button className="button button-primary compact" onClick={() => respond(person._id, "accept")}>Accept</button><button className="button button-quiet compact" onClick={() => respond(person._id, "reject")}>Decline</button></div></div>)}</div><div className="panel"><div className="section-heading"><div><p className="eyebrow">OUTGOING</p><h2>Sent requests <span className="count">{sentRequests.length}</span></h2></div></div>{sentRequests.length === 0 ? <EmptyState>Nothing pending here.</EmptyState> : sentRequests.map((person) => <div className="request-row" key={person._id}><div className="person-avatar cool">{person.name.charAt(0).toUpperCase()}</div><div className="person-info"><strong>{person.name}</strong><span>{person.email}</span></div><span className="pending-label">Pending</span></div>)}</div></section>
      </div>
    </main>
  );
}

function Chat({ params }) {
  const friendId = params.get("friend");
  const friendName = params.get("name") || "Friend";
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!friendId) return setLoading(false);
    request(`/chat/${friendId}`).then(setMessages).catch((error) => setMessage(error.message)).finally(() => setLoading(false));
  }, [friendId]);

  async function send(event) {
    event.preventDefault();
    if (!text.trim() || !friendId) return;
    try {
      const data = await request("/chat/send", { method: "POST", body: JSON.stringify({ receiverId: friendId, text: text.trim() }) });
      if (data.data) setMessages((current) => [...current, data.data]);
      setText("");
      setMessage("");
    } catch (error) { setMessage(error.message); }
  }

  return <main className="chat-shell"><header className="topbar"><button className="brand-button" onClick={() => navigate("/dashboard")}><span className="brand-mark small">ff</span><span>friends</span></button><button className="button button-quiet" onClick={() => navigate("/dashboard")}>← Dashboard</button></header><section className="chat-content"><div className="chat-heading"><div><p className="eyebrow">PRIVATE CONVERSATION</p><h1>{friendName}</h1><p className="muted">A space for just the two of you.</p></div><div className="avatar">{friendName.charAt(0).toUpperCase()}</div></div><div className="chat-panel"><div className="chat-box">{loading ? <div className="empty-state">Loading conversation...</div> : messages.length === 0 ? <EmptyState>No messages yet. Start the conversation.</EmptyState> : messages.map((item) => <div className={`message-line ${item.fromMe ? "sent" : "received"}`} key={item._id}><div className="message-bubble"><span>{item.text}</span><small>{new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</small></div></div>)}</div><form className="message-form" onSubmit={send}><input value={text} onChange={(event) => setText(event.target.value)} placeholder={`Write to ${friendName}...`} autoFocus /><button className="button button-primary">Send <span>→</span></button></form><Notice message={message} /></div></section></main>;
}

function logout() {
  localStorage.removeItem("authToken");
  request("/logout", { method: "POST" }).catch(() => {});
  navigate("/login");
}

export default function App() {
  const current = useRoute();
  const isAuthenticated = Boolean(token());
  const publicRoute = current.path === "/login" || current.path === "/signup";
  const view = useMemo(() => {
    if (current.path === "/login") return <Login />;
    if (current.path === "/signup") return <Signup />;
    if (current.path === "/chat") return <Chat params={current.params} />;
    return <Dashboard />;
  }, [current.path, current.params.toString()]);

  useEffect(() => {
    if (!isAuthenticated && !publicRoute) navigate("/login");
    if (isAuthenticated && publicRoute) navigate("/dashboard");
  }, [isAuthenticated, publicRoute]);

  return view;
}
