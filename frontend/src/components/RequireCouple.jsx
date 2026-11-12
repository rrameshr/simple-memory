import { Link, Outlet } from "react-router-dom";
import { Heart } from "lucide-react";
import { useCouple } from "../context/CoupleContext";
import { Empty } from "./ui";

/** Pages that need a connected couple space render through this gate. */
export default function RequireCouple() {
  const { active, couple, loading } = useCouple();
  if (loading) return <div className="skeleton skeleton-banner"/>;
  if (!active) return <section className="page">
    <Empty icon={Heart} title={couple ? "Waiting for your partner" : "Your shared story starts here"}
      text={couple ? "Share your invitation code so they can join. Memories unlock as soon as they do." : "Create a couple space and invite your favourite person."}
      action={<Link to="/couple" className="button primary">{couple ? "View invitation code" : "Set up couple space"}</Link>}/>
  </section>;
  return <Outlet />;
}
