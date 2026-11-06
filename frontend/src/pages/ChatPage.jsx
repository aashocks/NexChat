import toast from "react-hot-toast"

function ChatPage() {
  return (
    <div>ChatPage

      <button onClick={() => toast.error("you clicked")}>CLick Me</button>
    </div>
  )
}

export default ChatPage