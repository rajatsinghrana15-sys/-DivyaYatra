import { useEffect, useRef, useState } from "react";
import { MoreVertical, ChevronDown } from "lucide-react";

// items: [{ label, icon: Icon, onClick | href, danger, hidden }]
export default function ActionMenu({ items, label, primary = false, align = "right", className = "" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", close); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", esc); };
  }, [open]);
  const list = items.filter((i) => !i.hidden);
  if (!list.length) return null;
  return <div className={`actionMenu ${className}`.trim()} ref={ref}>
    <button type="button" className={label ? `actionTrigger ${primary ? "primary" : ""}` : "actionKebab"} aria-haspopup="menu" aria-expanded={open} aria-label={typeof label === "string" ? label : label ? undefined : "More actions"} onClick={() => setOpen((o) => !o)}>{label ? <>{label}<ChevronDown /></> : <MoreVertical />}</button>
    {open && <div className={`actionList ${align}`} role="menu">{list.map(({ label: l, icon: Icon, onClick, href, danger }) => {
      const body = <>{Icon && <Icon />}<span>{l}</span></>;
      const cls = `actionItem${danger ? " danger" : ""}`;
      return href ? <a key={l} role="menuitem" className={cls} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" onClick={() => setOpen(false)}>{body}</a>
        : <button key={l} type="button" role="menuitem" className={cls} onClick={() => { setOpen(false); onClick?.(); }}>{body}</button>;
    })}</div>}
  </div>;
}
