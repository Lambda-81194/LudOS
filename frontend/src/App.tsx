import ChatPage from './pages/ChatPage'

export default function App() {
  switch (window.location.pathname) {
    case '/':
    default:
      return <ChatPage />
  }
}