-- Revised pricing tiers migration: infrastructure-backed pricing
-- Starter ~$175/mo, Professional ~$350/mo, Business ~$600/mo, Enterprise ~$1000+/mo

DO $$
BEGIN
  -- Delete old tiers and re-seed with new infrastructure-backed pricing
  DELETE FROM public.pricing_tiers WHERE id IN ('starter', 'growth', 'enterprise', 'professional', 'business');

  INSERT INTO public.pricing_tiers (
    id, name, description, cost_per_seat, seat_minimum, seat_maximum,
    billing_period, features, is_published, is_popular, tier_order,
    badge_label, cta_label, target_audience, created_at, updated_at
  ) VALUES
  (
    'starter',
    'Starter',
    'AI interview prep for individual candidates. ~$175/mo infrastructure reserve.',
    999,
    1,
    1,
    'monthly',
    '[
      {"id":"f1","text":"100 AI interactions/month (mock interviews + Q&A)","included":true},
      {"id":"f2","text":"30 voice minutes/month (ElevenLabs TTS/STT)","included":true},
      {"id":"f3","text":"500 emails/month (Brevo transactional)","included":true},
      {"id":"f4","text":"5 GB storage","included":true},
      {"id":"f5","text":"5 Resume ATS checks/month","included":true},
      {"id":"f6","text":"1 Airtable integration, 1 Calendly connection","included":true},
      {"id":"f7","text":"Communication + Clarity + Domain scores","included":true},
      {"id":"f8","text":"Answer improvement suggestions","included":true},
      {"id":"f9","text":"Email support (48h SLA)","included":true},
      {"id":"f10","text":"Overage: ₹15/extra AI interaction, ₹2/extra voice min","included":true},
      {"id":"f11","text":"Company-specific prep packs","included":false},
      {"id":"f12","text":"Live recruiter interview access","included":false}
    ]'::jsonb,
    true,
    false,
    1,
    '',
    'Get Started',
    'Individual candidates',
    NOW(),
    NOW()
  ),
  (
    'professional',
    'Professional',
    'Unlimited practice with advanced analytics & coaching. ~$350/mo infrastructure reserve.',
    2499,
    1,
    NULL,
    'monthly',
    '[
      {"id":"f1","text":"500 AI interactions/month (mock interviews, coaching, Q&A)","included":true},
      {"id":"f2","text":"300 voice minutes/month (ElevenLabs TTS/STT)","included":true},
      {"id":"f3","text":"5,000 emails/month (Brevo transactional + marketing)","included":true},
      {"id":"f4","text":"25 GB storage","included":true},
      {"id":"f5","text":"Unlimited Resume ATS checks","included":true},
      {"id":"f6","text":"Multiple Airtable + Calendly integrations","included":true},
      {"id":"f7","text":"Full per-answer AI coaching + model answer library","included":true},
      {"id":"f8","text":"Company-specific prep packs","included":true},
      {"id":"f9","text":"Progress analytics dashboard","included":true},
      {"id":"f10","text":"Priority support (12h SLA)","included":true},
      {"id":"f11","text":"Live recruiter interview access","included":true},
      {"id":"f12","text":"Overage: ₹12/extra AI interaction, ₹1.5/extra voice min","included":true}
    ]'::jsonb,
    true,
    true,
    2,
    'Most Popular',
    'Start Free Trial',
    'Serious candidates & small teams',
    NOW(),
    NOW()
  ),
  (
    'business',
    'Business',
    'Institution-scale hiring & placement platform. ~$600/mo infrastructure reserve.',
    4999,
    10,
    NULL,
    'monthly',
    '[
      {"id":"f1","text":"2,000+ AI interactions/month (interviews, evaluation, agents)","included":true},
      {"id":"f2","text":"1,000+ voice minutes/month (ElevenLabs TTS/STT)","included":true},
      {"id":"f3","text":"25,000+ emails/month (Brevo transactional + campaigns)","included":true},
      {"id":"f4","text":"100 GB storage","included":true},
      {"id":"f5","text":"Unlimited Resume ATS checks","included":true},
      {"id":"f6","text":"Unlimited Airtable + Calendly integrations","included":true},
      {"id":"f7","text":"Bulk candidate import & placement drive management","included":true},
      {"id":"f8","text":"Dedicated success manager","included":true},
      {"id":"f9","text":"Custom interview scenarios + question banks","included":true},
      {"id":"f10","text":"Certificate of completion","included":true},
      {"id":"f11","text":"SLA 99.9% uptime guarantee","included":true},
      {"id":"f12","text":"Priority phone support (1h SLA)","included":true},
      {"id":"f13","text":"Overage: ₹10/extra AI interaction, ₹1/extra voice min","included":true}
    ]'::jsonb,
    true,
    false,
    3,
    'Best Value',
    'Contact Sales',
    'Institutions & large organizations',
    NOW(),
    NOW()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pricing_tiers seed error: %', SQLERRM;
END $$;
