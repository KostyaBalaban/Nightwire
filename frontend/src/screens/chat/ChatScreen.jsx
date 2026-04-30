import { useEffect } from "react";
import { MessageSquare, Users, Shield } from "lucide-react";
import { useChatStore }    from "../../store/chat.store.js";
import { useGroupStore }   from "../../store/group.store.js";
import { useSessionStore } from "../../store/session.store.js";
import { useSocket }       from "../../hooks/useSocket.js";
import ThreadsPanel        from "./ThreadsPanel.jsx";
import ConvoWindow         from "./ConvoWindow.jsx";
import GroupsScreen        from "../groups/GroupsScreen.jsx";
import { useNavigate }     from "react-router-dom";

const NAV = [
  { id: "dms",    icon: MessageSquare, label: "Messages" },
  { id: "groups", icon: Users,         label: "Groups"   },
];

export default function ChatScreen() {
  const fetchUsers     = useChatStore((s) => s.fetchUsers);
  const fetchPreviews  = useChatStore((s) => s.fetchPreviews);
  const activeUser     = useChatStore((s) => s.activeUser);
  const section        = useChatStore((s) => s.chatSection);
  const setSection     = useChatStore((s) => s.setChatSection);
  const fetchGroups    = useGroupStore((s) => s.fetchGroups);
  const user           = useSessionStore((s) => s.user);
  const navigate       = useNavigate();

  useSocket();

  useEffect(() => {
    fetchUsers();
    fetchPreviews();
    fetchGroups();
  }, []);

  const navItems = user?.isAdmin
    ? [...NAV, { id: "admin", icon: Shield, label: "Admin" }]
    : NAV;

  const handleNav = (id) => {
    if (id === "admin") { navigate("/admin"); return; }
    setSection(id);
  };

  return (
    <div className="h-screen flex bg-base-100 overflow-hidden">
      {/* Icon nav sidebar */}
      <nav className="nav-sidebar w-14 flex-shrink-0 bg-base-200 border-r border-base-300 flex flex-col items-center py-3 gap-1">
        {navItems.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => handleNav(id)}
            title={label}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
              section === id
                ? "bg-primary text-primary-content"
                : "text-base-content/50 hover:bg-base-300 hover:text-base-content"
            }`}
          >
            <Icon size={20} />
          </button>
        ))}
      </nav>

      {/* Main content */}
      {section === "groups" ? (
        <GroupsScreen />
      ) : (
        <>
          <div className={`${activeUser ? "hidden md:flex" : "flex"} w-full md:w-80 lg:w-96 flex-shrink-0`}>
            <ThreadsPanel />
          </div>
          <div className={`${!activeUser ? "hidden md:flex" : "flex"} flex-1 min-w-0`}>
            <ConvoWindow />
          </div>
        </>
      )}
    </div>
  );
}
