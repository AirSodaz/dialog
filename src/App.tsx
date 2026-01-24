import "./App.css";
import Editor from "./components/Editor";
import Sidebar from "./components/Sidebar";
import DocumentList from "./components/DocumentList";
import SearchModal from "./components/SearchModal";
import SettingsModal from "./components/SettingsModal";
import { useAppStore } from "./store/appStore";
import { useEffect } from "react";
import { getConfigValue } from "./utils/config";

function App() {
  const { currentView, loadFromWorkspace } = useAppStore();

  // Load theme from config on startup
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const theme = await getConfigValue('theme');
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      } catch {
        // Config not available yet, use default
      }
    };
    loadTheme();
  }, []);

  // Load workspace state on startup
  useEffect(() => {
    loadFromWorkspace();
  }, [loadFromWorkspace]);

  const renderView = () => {
    switch (currentView) {
      case 'all-notes':
        return <DocumentList viewType="all-notes" />;
      case 'favorites':
        return <DocumentList viewType="favorites" />;
      case 'trash':
        return <DocumentList viewType="trash" />;
      case 'editor':
      default:
        return <Editor />;
    }
  };

  return (
    <div className="min-h-screen w-full bg-paper text-ink">
      <Sidebar />
      {renderView()}
      <SearchModal />
      <SettingsModal />
    </div>
  );
}

export default App;
