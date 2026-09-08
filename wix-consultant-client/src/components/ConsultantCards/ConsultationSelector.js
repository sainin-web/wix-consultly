import React, { useState } from "react";
import { Icon, SERVICES } from "./Shared";

/**
 * Profile-page service picker: three selectable rows + one CTA.
 * `prices` = { chat, voice, video } display strings. `onStart(kind)` runs the
 * existing chat/call flows; `disabled` greys the CTA (e.g. consultant offline).
 */
export default function ConsultationSelector({ prices, onStart, status, signedIn }) {
  const [kind, setKind] = useState("chat");
  const current = SERVICES.find((s) => s.kind === kind);
  const offline = status?.key === "offline";
  const busy = status?.key === "busy";

  return (
    <aside className="sf-select" aria-labelledby="sf-select-title">
      <div className="sf-select__head">
        <h2 id="sf-select-title" className="sf-select__title">Choose your consultation</h2>
        <p className="sf-select__hint">Billed per minute from your wallet. Pause or end anytime.</p>
      </div>

      <div className="sf-select__list" role="radiogroup" aria-label="Consultation type">
        {SERVICES.map((s) => {
          const active = s.kind === kind;
          return (
            <button
              key={s.kind}
              type="button"
              role="radio"
              aria-checked={active}
              className={`sf-select__row${active ? " is-selected" : ""}`}
              onClick={() => setKind(s.kind)}
            >
              <span className="sf-select__icon"><Icon name={s.kind} size={18} /></span>
              <span className="sf-select__text">
                <span className="sf-select__name">{s.title}</span>
                <span className="sf-select__blurb">{s.blurb}</span>
              </span>
              <span className="sf-select__price">{prices[s.kind]}<small>/min</small></span>
              <span className="sf-select__check" aria-hidden="true"><Icon name="check" size={13} /></span>
            </button>
          );
        })}
      </div>

      <button type="button" className="sf-cta" onClick={() => onStart(kind)} disabled={busy}>
        <Icon name={kind} size={16} />
        {busy ? "Consultant is in a session" : `Start ${current.label.toLowerCase()} consultation`}
      </button>

      <p className="sf-select__note">
        {!signedIn
          ? "You'll be asked to sign in before the session starts."
          : offline
            ? "The consultant is offline right now. You can still send a chat request."
            : "You'll be connected as soon as the consultant accepts."}
      </p>
    </aside>
  );
}
