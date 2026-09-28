"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Room = {
  id: string;
  code: string;
  messageCount: number;
  memberCount: number;
  radioActive: boolean;
  radioTitle?: string;
  createdAt: string;
  expiresAt: string;
};

type Message = {
  id: string;
  roomId: string;
  userId: string;
  username: string;
  content: string;
  createdAt: string;
};

export function GodModeDashboard() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Recuperar token del localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem("god_mode_token");
    if (savedToken) {
      setToken(savedToken);
      verifyToken(savedToken);
    }
  }, []);

  const verifyToken = async (t: string) => {
    try {
      const res = await fetch("/api/god/auth", {
        method: "GET",
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.ok) {
        setAuthenticated(true);
        fetchAllRooms(t);
      } else {
        localStorage.removeItem("god_mode_token");
        setToken(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/god/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          username: `admin_${Date.now()}`,
        }),
      });

      if (!res.ok) {
        setError("Contraseña incorrecta");
        setLoading(false);
        return;
      }

      const data = await res.json();
      setToken(data.token);
      setAuthenticated(true);
      localStorage.setItem("god_mode_token", data.token);
      setPassword("");
      fetchAllRooms(data.token);
    } catch (err) {
      setError("Error al conectar");
      console.error(err);
    }
    setLoading(false);
  };

  const fetchAllRooms = async (t: string) => {
    try {
      setLoading(true);
      const res = await fetch("/api/god/rooms", {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRooms(data.rooms);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const fetchRoomMessages = async (roomId: string) => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/god/messages?roomId=${roomId}&limit=1000`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
        setSelectedRoom(roomId);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const searchMessages = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !searchText.trim()) return;

    try {
      setLoading(true);
      const res = await fetch("/api/god/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          searchText: searchText.trim(),
          limit: 500,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleLogout = () => {
    setAuthenticated(false);
    setToken(null);
    setRooms([]);
    setMessages([]);
    localStorage.removeItem("god_mode_token");
  };

  if (!authenticated) {
    return (
      <div className="god-mode-login">
        <div className="god-mode-card">
          <h1>🔐 ACCESO RESTRINGIDO</h1>
          <p className="god-mode-description">Sistema oculto de administración</p>

          <form onSubmit={handleLogin} className="god-mode-form">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="god-mode-input"
              disabled={loading}
              autoComplete="current-password"
            />
            <button
              type="submit"
              className="god-mode-submit"
              disabled={loading || !password}
            >
              {loading ? "Verificando..." : "Acceder"}
            </button>
          </form>

          {error && <p className="god-mode-error">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="god-mode-dashboard">
      <header className="god-mode-header">
        <h1>👁️ MODO DIOS - ADMINISTRACIÓN</h1>
        <p className="god-mode-subtitle">Todas las salas y mensajes bajo vigilancia</p>
        <button
          onClick={handleLogout}
          className="god-mode-logout"
        >
          Salir
        </button>
      </header>

      <div className="god-mode-layout">
        {/* Panel de salas */}
        <aside className="god-mode-sidebar">
          <h2>📋 Salas ({rooms.length})</h2>
          {loading && <p className="loading">Cargando...</p>}
          <div className="god-mode-rooms-list">
            {rooms.map((room) => (
              <button
                key={room.id}
                onClick={() => fetchRoomMessages(room.id)}
                className={`god-mode-room-item ${selectedRoom === room.id ? "active" : ""}`}
              >
                <span className="room-code">{room.code}</span>
                <span className="room-stats">
                  {room.memberCount} 👤 {room.messageCount} 💬
                </span>
                {room.radioActive && (
                  <span className="room-radio" title={room.radioTitle}>
                    🎵
                  </span>
                )}
              </button>
            ))}
          </div>
        </aside>

        {/* Panel principal */}
        <main className="god-mode-main">
          {/* Búsqueda global */}
          <div className="god-mode-search">
            <form onSubmit={searchMessages} className="search-form">
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Buscar en todos los mensajes…"
                className="god-mode-search-input"
              />
              <button type="submit" className="ghost-btn" disabled={loading}>
                🔍 Buscar
              </button>
            </form>
          </div>

          {/* Mensajes */}
          <div className="god-mode-messages">
            {messages.length === 0 ? (
              <p className="god-mode-empty">
                {selectedRoom
                  ? "Sin mensajes en esta sala"
                  : "Selecciona una sala o busca mensajes"}
              </p>
            ) : (
              <>
                <p className="messages-count">
                  {messages.length} mensajes encontrados
                </p>
                <div className="messages-list">
                  {messages.map((msg) => (
                    <div key={msg.id} className="god-mode-message">
                      <div className="msg-header">
                        <strong className="msg-username">{msg.username}</strong>
                        <span className="msg-time">
                          {new Date(msg.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="msg-content">{msg.content}</p>
                      <span className="msg-room">
                        Sala: <code>{msg.roomId.slice(0, 8)}</code>
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      <style jsx>{`
        .god-mode-login {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%);
          font-family: system-ui, -apple-system, sans-serif;
        }

        .god-mode-card {
          background: rgba(20, 25, 40, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 2rem;
          max-width: 400px;
          width: 90%;
          backdrop-filter: blur(10px);
        }

        .god-mode-card h1 {
          color: #fff;
          text-align: center;
          margin: 0 0 0.5rem;
          font-size: 1.5rem;
        }

        .god-mode-description {
          color: #8a8fa3;
          text-align: center;
          margin: 0 0 1.5rem;
          font-size: 0.9rem;
        }

        .god-mode-form {
          display: flex;
          gap: 0.5rem;
        }

        .god-mode-input {
          flex: 1;
          background: rgba(50, 55, 70, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #fff;
          padding: 0.75rem;
          border-radius: 4px;
          font-size: 1rem;
        }

        .god-mode-submit {
          background: #6366f1;
          color: #fff;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
        }

        .god-mode-submit:hover:not(:disabled) {
          background: #4f46e5;
          transform: translateY(-1px);
        }

        .god-mode-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .god-mode-error {
          color: #ff6b6b;
          text-align: center;
          margin-top: 1rem;
          font-size: 0.9rem;
        }

        .god-mode-dashboard {
          background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%);
          color: #fff;
          min-height: 100vh;
          font-family: system-ui, -apple-system, sans-serif;
        }

        .god-mode-header {
          background: rgba(20, 25, 40, 0.8);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          padding: 1.5rem;
          position: relative;
        }

        .god-mode-header h1 {
          margin: 0 0 0.25rem;
          font-size: 1.5rem;
        }

        .god-mode-subtitle {
          margin: 0;
          color: #8a8fa3;
          font-size: 0.9rem;
        }

        .god-mode-logout {
          position: absolute;
          top: 1.5rem;
          right: 1.5rem;
          background: rgba(255, 55, 55, 0.2);
          color: #ff6b6b;
          border: 1px solid rgba(255, 55, 55, 0.4);
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9rem;
        }

        .god-mode-layout {
          display: flex;
          gap: 1rem;
          padding: 1rem;
          height: calc(100vh - 100px);
        }

        .god-mode-sidebar {
          flex: 0 0 250px;
          background: rgba(20, 25, 40, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 1rem;
          overflow-y: auto;
        }

        .god-mode-sidebar h2 {
          margin: 0 0 1rem;
          font-size: 1rem;
        }

        .god-mode-rooms-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .god-mode-room-item {
          background: rgba(50, 55, 70, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #fff;
          padding: 0.75rem;
          border-radius: 4px;
          cursor: pointer;
          text-align: left;
          transition: all 0.2s;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .god-mode-room-item:hover {
          background: rgba(50, 55, 70, 0.6);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .god-mode-room-item.active {
          background: rgba(99, 102, 241, 0.2);
          border-color: #6366f1;
        }

        .room-code {
          font-weight: 600;
          font-size: 0.95rem;
        }

        .room-stats {
          font-size: 0.8rem;
          color: #a0a5b8;
        }

        .room-radio {
          font-size: 0.9rem;
        }

        .god-mode-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .god-mode-search {
          background: rgba(20, 25, 40, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 1rem;
        }

        .search-form {
          display: flex;
          gap: 0.5rem;
        }

        .god-mode-search-input {
          flex: 1;
          background: rgba(50, 55, 70, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #fff;
          padding: 0.75rem;
          border-radius: 4px;
        }

        .god-mode-messages {
          flex: 1;
          background: rgba(20, 25, 40, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 1rem;
          overflow-y: auto;
        }

        .god-mode-empty {
          text-align: center;
          color: #8a8fa3;
          padding: 2rem;
        }

        .messages-count {
          color: #a0a5b8;
          font-size: 0.9rem;
          margin: 0 0 1rem;
        }

        .messages-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .god-mode-message {
          background: rgba(50, 55, 70, 0.3);
          border-left: 3px solid #6366f1;
          padding: 0.75rem;
          border-radius: 4px;
        }

        .msg-header {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 0.5rem;
        }

        .msg-username {
          color: #fff;
          font-size: 0.95rem;
        }

        .msg-time {
          color: #8a8fa3;
          font-size: 0.8rem;
        }

        .msg-content {
          margin: 0.5rem 0;
          color: #d0d5e8;
          word-break: break-word;
        }

        .msg-room {
          display: block;
          color: #8a8fa3;
          font-size: 0.8rem;
          margin-top: 0.5rem;
        }

        .msg-room code {
          background: rgba(99, 102, 241, 0.1);
          padding: 0.1rem 0.3rem;
          border-radius: 2px;
          font-family: monospace;
          color: #6366f1;
        }

        .loading {
          text-align: center;
          color: #8a8fa3;
        }

        .ghost-btn {
          background: rgba(99, 102, 241, 0.2);
          color: #6366f1;
          border: 1px solid #6366f1;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .ghost-btn:hover:not(:disabled) {
          background: rgba(99, 102, 241, 0.3);
        }

        .ghost-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .god-mode-layout {
            flex-direction: column;
          }

          .god-mode-sidebar {
            flex: 0 0 auto;
            max-height: 200px;
          }
        }
      `}</style>
    </div>
  );
}
