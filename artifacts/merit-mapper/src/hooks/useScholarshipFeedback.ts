import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export const FEEDBACK_REASONS = [
  "Wrong field of study",
  "GPA requirement too high",
  "Not eligible",
  "Already applied",
  "Other",
] as const;

export type FeedbackReason = typeof FEEDBACK_REASONS[number];

interface FeedbackArgs {
  scholarshipId: string;
  scholarshipName: string;
  reason: FeedbackReason;
}

export function useScholarshipFeedback() {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async ({ scholarshipId, scholarshipName, reason }: FeedbackArgs) => {
    if (submitting || submitted) return;
    setSubmitting(true);
    setError(null);

    const { error: insertError } = await supabase.from("scholarship_feedback").insert({
      user_id: user?.id ?? null,
      scholarship_id: scholarshipId,
      scholarship_name: scholarshipName,
      reason,
      submitted_at: new Date().toISOString(),
    });

    setSubmitting(false);
    if (insertError) {
      setError("Couldn't save feedback. Try again.");
    } else {
      setSubmitted(true);
    }
  };

  return { submit, submitting, submitted, error };
}
