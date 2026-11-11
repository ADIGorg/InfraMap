export interface Notification {
  id: string;
  occurrence_id: string | null;
  title: string;
  message: string;
  type: "OCCURRENCE_STATUS_CHANGED" | "CITIZEN_RESPONSE";
  read_at: string | null;
  created_at: string;
}
