-- Optional: import a couple of demo rows into `residents`
-- Run only if you want to pre-populate test/demo data

INSERT INTO public.residents (last, first, mid, suffix, dob, age, sex, purok, cats, registered, status, occupation, contact)
VALUES
('Dela Cruz','Juan','', '', '2002-11-20', 22, 'F', 'YAKAL', '["Non-Voter"]'::jsonb, now(), 'active', 'Student', '09345678901'),
('Dela Cruz','Juan','', 'Jr.', '1975-08-08', 49, 'M', 'GEMELINA', '["PWD","Voter"]'::jsonb, now(), 'active', 'Carpenter', '09456789012');

-- After running, verify with:
-- SELECT id,last,first,purok,cats FROM public.residents ORDER BY id DESC LIMIT 10;
