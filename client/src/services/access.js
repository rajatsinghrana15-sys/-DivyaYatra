export const isTeam = (u) => u?.role === "admin" || u?.role === "staff";
export const can = (u, perm) => u?.role === "admin" || (u?.role === "staff" && u.active !== false && (perm === "*" || (u.permissions || []).includes(perm)));
export const roleLabel = (u) => (u?.role === "admin" ? "Administrator" : u?.role === "staff" ? "Team member" : "Traveller account");
