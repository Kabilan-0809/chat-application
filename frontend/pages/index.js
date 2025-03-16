import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import io from "socket.io-client";

const socket = io(process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000");

export default function Home() {
    const [user, setUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState("");
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            axios.get("http://localhost:5000/auth/user", { withCredentials: true },{
            headers: { Authorization: `Bearer ${token}` },
            })
            .then((res) => {
                setUser(res.data);
                socket.emit("joinRoom", res.data.sub);
            })
            .catch((err) => {
                console.error("Error fetching user data:", err);
            });
        }
    }, []);

    useEffect(() => {
        socket.on("receiveMessage", (msg) => {
            setMessages((prev) => [...prev, msg]);
        });

        return () => socket.off("receiveMessage");
    }, []);

    const sendMessage = () => {
        if (!user || !message) return;
        const encryptedMsg = btoa(message);
        socket.emit("sendMessage", { sender: user.sub, receiver: "receiver_id", encryptedMessage: encryptedMsg });
        setMessages((prev) => [...prev, { encryptedMessage: encryptedMsg }]);
        setMessage("");
    };

    return (
        <div>
            <h1>Secure Chat</h1>
            {user ? (
                <>
                    <p>Welcome, {user.name}</p>
                    <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type a message..." />
                    <button onClick={sendMessage}>Send</button>
                    <ul>
                        {messages.map((msg, index) => (
                            <li key={index}>{msg.encryptedMessage}</li>
                        ))}
                    </ul>
                </>
            ) : (
                <a href="http://localhost:5000/auth/google">Login with Google</a>
            )}
        </div>
    );
}
