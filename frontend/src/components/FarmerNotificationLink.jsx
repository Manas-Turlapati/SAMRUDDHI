import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import api from "../services/api";

export default function FarmerNotificationLink({ sidebar = false }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;
    const refreshCount = () => api.get("/notifications/unread-count")
      .then(({ data }) => { if (active) setCount(Number(data.count) || 0); })
      .catch(() => {});
    refreshCount();
    const fallbackTimer = window.setInterval(refreshCount, 15000);
    window.addEventListener("farmer:review-updated", refreshCount);
    window.addEventListener("notifications-refresh", refreshCount);
    return () => {
      active = false;
      window.clearInterval(fallbackTimer);
      window.removeEventListener("farmer:review-updated", refreshCount);
      window.removeEventListener("notifications-refresh", refreshCount);
    };
  }, []);

  return <NavLink className={sidebar ? "farmer-notification-sidebar-link" : "farmer-notification-top-link"} to="/notifications">
    {sidebar && <span>N</span>}
    Notifications
    {count > 0 && <b className="sidebar-notification-count">{count > 99 ? "99+" : count}</b>}
  </NavLink>;
}
