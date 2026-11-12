export const cash = n => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(n || 0));
export const dateFmt = d => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
export const fallback = "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1100&q=85";
