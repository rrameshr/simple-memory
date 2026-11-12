import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { Empty } from "../components/ui";

export default function NotFound() {
  return <div className="center-screen"><Empty icon={Heart} title="This page wandered off" text="The page you're looking for doesn't exist." action={<Link className="button primary" to="/dashboard">Back to your memories</Link>}/></div>;
}
