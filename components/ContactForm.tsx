import { Send } from "lucide-react";

export function ContactForm({ accessKey }: { accessKey: string }) {
  return (
    <form className="contact-form" data-contact-form>
      <input type="hidden" name="access_key" value={accessKey} />
      <input type="checkbox" name="botcheck" className="botcheck" tabIndex={-1} autoComplete="off" aria-hidden="true" />

      <label>
        Name
        <input name="name" type="text" autoComplete="name" required />
      </label>
      <label>
        Email
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label>
        Role or company
        <input name="company" type="text" autoComplete="organization" />
      </label>
      <label>
        Message
        <textarea name="message" required rows={6} />
      </label>

      <button className="button primary" type="submit" data-contact-submit>
        <Send size={18} aria-hidden="true" />
        <span data-submit-label>Send message</span>
      </button>

      <div className="form-status" role="status" aria-live="polite" aria-atomic="true" data-form-status>
        <span data-form-status-message />
      </div>
    </form>
  );
}
