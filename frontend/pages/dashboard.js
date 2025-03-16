"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import io from "socket.io-client";

const socket = io(process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000");

export default function Dashboard() {
    const [user, setUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState("");
    const router = useRouter();

    useEffect(() => {
        axios.get("http://localhost:5000/auth/user", { withCredentials: true })
            .then((res) => {
                setUser(res.data);
            })
            .catch(() => {
                router.push("/");
            });
    }, []);

    useEffect(() => {
        socket.on("receiveMessage", (msg) => {
            console.log("📩 Message received:", msg); // Debugging
            setMessages((prev) => [...prev, msg]);
        });

        return () => socket.off("receiveMessage");
    }, []);

    const sendMessage = () => {
        if (!user || !message) return;
        socket.emit("sendMessage", {
            sender: user.name,
            receiver: "receiver_id",
            message,
        });
        setMessage("");
    };

    return (
        <div>
            <h1>Secure Chat</h1>
            {user ? (
                <>
                    <p>Welcome, {user.name}</p>
                    <input
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Type a message..."
                    />
                    <button onClick={sendMessage}>Send</button>
                    <ul>
                        {messages.map((msg, index) => (
                            <li key={index}>
                                <strong>{msg.sender}:</strong> {msg.decryptedMessage} {/* Show decrypted message */}
                            </li>
                        ))}
                    </ul>
                </>
            ) : (
                <a href="http://localhost:5000/auth/google">Login with Google</a>
            )}
        </div>
    );
}
