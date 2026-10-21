import { useEffect } from "react";
import { createAuthenticatedSocket } from "../services/socket";

export default function FarmerRealtimeBridge() {
  useEffect(() => {
    const socket = createAuthenticatedSocket();
    const handleReviewUpdate = (detail) => {
      window.dispatchEvent(new CustomEvent("farmer:review-updated", { detail }));
    };
    socket.on("farmer_notification", handleReviewUpdate);
    return () => {
      socket.off("farmer_notification", handleReviewUpdate);
      socket.disconnect();
    };
  }, []);
  return null;
}
