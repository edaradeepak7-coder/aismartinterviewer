-- Add Slack notification columns to alert_thresholds
ALTER TABLE public.alert_thresholds
  ADD COLUMN IF NOT EXISTS notify_slack boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS slack_webhook_url text;
