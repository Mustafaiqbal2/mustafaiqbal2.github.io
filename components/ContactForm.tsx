"use client";

import { useState } from "react";
import { Send } from "lucide-react";

type Status = "idle" | "loading" | "success" | "error";

export function ContactForm() {
  const accessKey = process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY || "";
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const payload: Record<string, string> = {
      access_key: accessKey,
      subject: `Portfolio message from ${String(data.get("name") || "a visitor")}`,
      from_name: String(data.get("name") || "Portfolio visitor")
    };
    data.forEach((value, key) => {
      payload[key] = String(value);
    });

    setStatus("loading");
    setMessage("Sending…");

    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload)
      });
      const body = await response.json();
      if (!response.ok || !body.success) {
        throw new Error(body.message || "That didn't send.");
      }
      form.reset();
      setStatus("success");
      setMessage("Got it — I'll reply from my inbox soon.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "That didn't send. Email me directly and it'll reach me.");
    }
  }

  return (
    <form className="form card" style={{ padding: 24 }} onSubmit={handleSubmit}>
      <input
        type="checkbox"
        name="botcheck"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px" }}
      />
      <label>
        Name
        <input name="name" type="text" autoComplete="name" required />
      </label>
      <label>
        Email
        <input name="email" type="email" inputMode="email" autoComplete="email" required />
      </label>
      <label>
        Role or company (optional)
        <input name="company" type="text" autoComplete="organization" />
      </label>
      <label>
        Message
        <textarea name="message" required rows={6} />
      </label>

      <button className="btn btn--primary" type="submit" disabled={status === "loading"}>
        <Send aria-hidden="true" />
        {status === "loading" ? "Sending…" : "Send message"}
      </button>

      <p className="form-status" role="status" aria-live="polite" data-status={status === "idle" ? undefined : status}>
        {message}
      </p>
    </form>
  );
}
