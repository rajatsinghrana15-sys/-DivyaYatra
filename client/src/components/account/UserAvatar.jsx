export default function UserAvatar({ user, className = "" }) {
  if (user?.avatarUrl) {
    return <img className={`userAvatar ${className}`} src={user.avatarUrl} alt={`${user.name || "User"} avatar`} />;
  }
  const style = user?.avatarStyle || (user?.gender === "female" ? "girl" : user?.gender === "male" ? "boy" : "traveller");
  return (
    <svg className={`userAvatar ${className}`} viewBox="0 0 100 100" role="img" aria-label={`${style} illustrated avatar`}>
      <defs>
        <linearGradient id={`avatarBg-${style}`} x1="0" y1="0" x2="1" y2="1"><stop stopColor={style === "girl" ? "#f6b2a4" : style === "boy" ? "#93c5dc" : "#e2cf86"}/><stop offset="1" stopColor={style === "girl" ? "#c786a9" : style === "boy" ? "#5c8caa" : "#618d70"}/></linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill={`url(#avatarBg-${style})`}/>
      <path d="M18 100c2-22 14-33 32-33s30 11 32 33" fill={style === "girl" ? "#9c4262" : style === "boy" ? "#244d72" : "#345d45"}/>
      {style === "traveller" && <><path d="M26 34c5-19 42-24 49 1l-8 7H31z" fill="#324a3b"/><path d="M20 40h61" stroke="#d6ef8c" strokeWidth="6" strokeLinecap="round"/></>}
      {style === "girl" && <path d="M24 49c-8-28 7-42 27-42 23 0 32 19 25 45l-7 11-3-23c-11 2-22-2-29-9l-6 30z" fill="#402d3a"/>}
      {style !== "traveller" && <path d="M29 42c-2-18 8-28 22-28 17 0 25 12 21 28-7-2-15-7-20-13-5 7-13 11-23 13" fill={style === "girl" ? "#402d3a" : "#302e31"}/>}
      <ellipse cx="50" cy="51" rx="21" ry="24" fill="#c9825d"/>
      {style === "traveller" && <path d="M31 47c2-15 11-22 22-22 9 0 15 4 18 12-9 0-18-4-24-8-3 8-8 14-16 18" fill="#302e31"/>}
      <ellipse cx="42" cy="52" rx="2" ry="2.6" fill="#2b2b2b"/><ellipse cx="58" cy="52" rx="2" ry="2.6" fill="#2b2b2b"/>
      <path d="M45 63q5 4 10 0" fill="none" stroke="#7d3f36" strokeWidth="2" strokeLinecap="round"/>
      {style === "girl" && <><circle cx="33" cy="60" r="3" fill="#ec8d8b"/><circle cx="67" cy="60" r="3" fill="#ec8d8b"/></>}
    </svg>
  );
}
