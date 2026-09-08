import React from "react";
import { Avatar, StatusBadge, Icon, SERVICES } from "./Shared";

/**
 * Listing card. Three visual levels:
 *   identity (avatar + name + status) → facts (experience, languages)
 *   → service strip (one segmented control, not three buttons) → footer link.
 * All actions are passed in; the card itself never calls APIs.
 */
export default function ConsultantCard({ consultant, status, onOpen, onService }) {
  const prices = { chat: consultant.chatPrice, voice: consultant.audioPrice, video: consultant.videoPrice };
  const languages = consultant.languages || [];
  const shownLangs = languages.slice(0, 2).join(", ");
  const moreLangs = languages.length > 2 ? ` +${languages.length - 2}` : "";
  const tags = (consultant.tags || []).slice(0, 2);

  const open = () => onOpen(consultant);

  return (
    <article
      className={`sf-card sf-card--${status.key}`}
      role="link"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } }}
      aria-label={`View profile of ${consultant.name}`}
    >
      <div className="sf-card__top">
        <Avatar src={consultant.image} name={consultant.name} size={56} status={status.key} />
        <div className="sf-card__who">
          <h3 className="sf-card__name">{consultant.name}</h3>
          <p className="sf-card__role">{consultant.profession}{consultant.specialization ? ` · ${consultant.specialization}` : ""}</p>
        </div>
        <StatusBadge status={status} compact />
      </div>

      <ul className="sf-card__facts">
        <li><Icon name="briefcase" size={14} /><span>{consultant.experience}+ yrs experience</span></li>
        {languages.length > 0 && <li><Icon name="globe" size={14} /><span>{shownLangs}{moreLangs}</span></li>}
      </ul>

      {tags.length > 0 && (
        <div className="sf-card__tags">
          {tags.map((t) => <span key={t} className="sf-tag">{t}</span>)}
        </div>
      )}

      <div className="sf-services" role="group" aria-label="Consultation options">
        {SERVICES.map((s) => (
          <button
            key={s.kind}
            type="button"
            className="sf-services__cell"
            onClick={(e) => { e.stopPropagation(); onService(consultant, s.kind); }}
            aria-label={`Start ${s.title}, ${prices[s.kind]} per minute`}
          >
            <Icon name={s.kind} size={16} className="sf-services__icon" />
            <span className="sf-services__label">{s.label}</span>
            <span className="sf-services__price">{prices[s.kind]}<small>/min</small></span>
          </button>
        ))}
      </div>

      <div className="sf-card__foot">
        <span className="sf-card__link">View profile <Icon name="arrow" size={14} /></span>
      </div>
    </article>
  );
}
