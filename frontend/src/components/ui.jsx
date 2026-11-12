import { Sparkles } from "lucide-react";

export function Empty({ title, text, icon: Icon = Sparkles, action }) {
  return <div className="empty-state"><div className="empty-icon"><Icon size={25}/></div><h3>{title}</h3><p>{text}</p>{action}</div>;
}

export function PageHeader({ eyebrow, title, subtitle, actions }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{subtitle && <p className="muted">{subtitle}</p>}</div>{actions && <div className="heading-actions">{actions}</div>}</div>;
}

export function SkeletonGrid({ count = 6 }) {
  return <div className="memory-grid">{Array.from({ length: count }, (_, i) => <div key={i} className="skeleton skeleton-tile"/>)}</div>;
}

export function Avatar({ user, size = 34 }) {
  const style = { width: size, height: size, fontSize: size * 0.4 };
  return user?.profileImage
    ? <img className="avatar img" style={style} src={user.profileImage} alt={user.name || ""}/>
    : <div className="avatar" style={style}>{user?.name?.[0]?.toUpperCase() || "U"}</div>;
}

export function ErrorNote({ children }) { return children ? <p className="error" role="alert">{children}</p> : null; }
